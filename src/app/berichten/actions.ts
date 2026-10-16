"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { actionBlockedReason, requireUser } from "@/lib/auth";
import { fail, str, type ActionState } from "@/lib/action";
import { CONTACT_WARNING, containsContactInfo, isUuid } from "@/lib/text";
import { isBlockedBetween } from "@/lib/blocks";

const MAX_LEN = 2000;

function checkBody(body: string, messagesSoFar: number) {
  if (!body) return "Je bericht is leeg.";
  if (body.length > MAX_LEN) return `Je bericht mag maximaal ${MAX_LEN} tekens hebben.`;
  // In de eerste 3 berichten van een gesprek geen contactgegevens (sectie 13.3).
  if (messagesSoFar < 3 && containsContactInfo(body)) return CONTACT_WARNING;
  return null;
}

export async function startConversation(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const blocked = actionBlockedReason(user);
  if (blocked) return fail(blocked);
  const otherId = str(form, "userId");
  const body = str(form, "body");
  if (!isUuid(otherId) || otherId === user.id) return fail("Er ging iets mis.");

  const other = await db.user.findUnique({ where: { id: otherId } });
  if (!other || other.status !== "active" || (await isBlockedBetween(user.id, otherId))) {
    return fail("Je kunt deze speler geen bericht sturen.");
  }

  const existing = await db.conversation.findFirst({
    where: { type: "direct", AND: [{ members: { some: { userId: user.id } } }, { members: { some: { userId: otherId } } }] },
    include: { _count: { select: { messages: true } } },
  });

  if (!existing) {
    // Spamrem: max 10 nieuwe gesprekken per dag in de eerste 7 dagen, daarna 30 (FR-44).
    const isNew = Date.now() - user.createdAt.getTime() < 7 * 86400000;
    const started = await db.conversation.count({
      where: {
        type: "direct",
        createdAt: { gt: new Date(Date.now() - 86400000) },
        messages: { some: { senderId: user.id } },
        members: { some: { userId: user.id } },
      },
    });
    if (started >= (isNew ? 10 : 30)) return fail("Je hebt vandaag al veel nieuwe gesprekken gestart. Probeer morgen opnieuw.");
  }

  const err = checkBody(body, existing?._count.messages ?? 0);
  if (err) return fail(err);

  const conv =
    existing ??
    (await db.conversation.create({
      data: {
        type: "direct",
        // De ontvanger krijgt een berichtverzoek dat hij kan accepteren of negeren (FR-43).
        members: { create: [{ userId: user.id, lastReadAt: new Date() }, { userId: otherId, accepted: false }] },
      },
    }));

  await db.message.create({ data: { conversationId: conv.id, senderId: user.id, body } });
  await db.conversation.update({ where: { id: conv.id }, data: { lastMessageAt: new Date() } });
  redirect(`/berichten/${conv.id}`);
}

export async function sendMessage(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const blocked = actionBlockedReason(user);
  if (blocked) return fail(blocked);
  const id = str(form, "conversationId");
  const body = str(form, "body");
  if (!isUuid(id)) return fail("Er ging iets mis.");

  const conv = await db.conversation.findUnique({
    where: { id },
    include: { members: true, _count: { select: { messages: true } } },
  });
  const me = conv?.members.find((m) => m.userId === user.id);
  if (!conv || !me) return fail("Je maakt geen deel uit van dit gesprek.");

  if (conv.type === "direct") {
    const other = conv.members.find((m) => m.userId !== user.id);
    if (!other || (await isBlockedBetween(user.id, other.userId))) return fail("Je kunt in dit gesprek geen berichten meer sturen.");
  }

  const err = checkBody(body, conv._count.messages);
  if (err) return fail(err);

  const now = new Date();
  await db.$transaction([
    db.message.create({ data: { conversationId: id, senderId: user.id, body } }),
    db.conversation.update({ where: { id }, data: { lastMessageAt: now } }),
    // Antwoorden op een berichtverzoek betekent het verzoek accepteren.
    db.conversationMember.update({ where: { conversationId_userId: { conversationId: id, userId: user.id } }, data: { lastReadAt: now, accepted: true } }),
  ]);
  revalidatePath(`/berichten/${id}`);
  return undefined;
}

export async function answerRequest(form: FormData) {
  const user = await requireUser();
  const id = str(form, "conversationId");
  if (!isUuid(id)) return;
  const key = { conversationId_userId: { conversationId: id, userId: user.id } };
  if (str(form, "decision") === "accept") {
    await db.conversationMember.update({ where: key, data: { accepted: true } });
    redirect(`/berichten/${id}`);
  }
  // Negeren: het gesprek verdwijnt voor beide spelers.
  const conv = await db.conversation.findUnique({ where: { id }, include: { members: true } });
  if (conv?.type === "direct" && conv.members.some((m) => m.userId === user.id && !m.accepted)) {
    await db.conversation.delete({ where: { id } });
  }
  redirect("/berichten");
}
