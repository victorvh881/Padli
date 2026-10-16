"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { actionBlockedReason, requireUser } from "@/lib/auth";
import { fail, str, type ActionState } from "@/lib/action";
import { CONTACT_WARNING, containsContactInfo } from "@/lib/text";
import { fromBrussels, formatDateTime } from "@/lib/time";
import { isBlockedBetween } from "@/lib/blocks";
import { notify } from "@/lib/notify";

const MAX_ACTIVE = 5;

const schema = z.object({
  title: z.string().min(3, "Geef je oproep een titel.").max(80, "De titel mag maximaal 80 tekens hebben."),
  date: z.string().min(1, "Kies een datum."),
  time: z.string().min(1, "Kies een starttijd."),
  durationMinutes: z.coerce.number().refine((n) => [60, 90, 120].includes(n), "Kies een duur."),
  regionId: z.uuid("Kies een gemeente."),
  locationText: z.string().max(120, "De locatie mag maximaal 120 tekens hebben."),
  levelMinId: z.coerce.number().int().min(1, "Kies een minimumniveau."),
  levelMaxId: z.coerce.number().int().min(1, "Kies een maximumniveau."),
  spotsNeeded: z.coerce.number().int().min(1, "Zoek 1 tot 3 spelers.").max(3, "Zoek 1 tot 3 spelers."),
  description: z.string().max(500, "De beschrijving mag maximaal 500 tekens hebben."),
});

async function parseMatchForm(form: FormData) {
  const parsed = schema.safeParse({
    title: str(form, "title"),
    date: str(form, "date"),
    time: str(form, "time"),
    durationMinutes: str(form, "durationMinutes") || 90,
    regionId: str(form, "regionId"),
    locationText: str(form, "locationText"),
    levelMinId: str(form, "levelMinId") || 0,
    levelMaxId: str(form, "levelMaxId") || 0,
    spotsNeeded: str(form, "spotsNeeded") || 0,
    description: str(form, "description"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message } as const;
  const d = parsed.data;
  const startsAt = fromBrussels(d.date, d.time);
  if (!startsAt) return { error: "Kies een geldige datum en tijd." } as const;
  if (startsAt < new Date()) return { error: "De datum en tijd mogen niet in het verleden liggen." } as const;
  if (startsAt.getTime() > Date.now() + 90 * 86400000) return { error: "Plaats oproepen maximaal 3 maanden vooruit." } as const;
  if ([d.title, d.locationText, d.description].some(containsContactInfo)) return { error: CONTACT_WARNING } as const;

  const [min, max, region] = await Promise.all([
    db.level.findUnique({ where: { id: d.levelMinId } }),
    db.level.findUnique({ where: { id: d.levelMaxId } }),
    db.region.findFirst({ where: { id: d.regionId, isActive: true } }),
  ]);
  if (!min || !max || !region) return { error: "Kies een geldige gemeente en geldige niveaus." } as const;
  if (min.rank > max.rank) return { error: "Het minimumniveau mag niet hoger zijn dan het maximumniveau." } as const;

  return {
    data: {
      title: d.title,
      startsAt,
      durationMinutes: d.durationMinutes,
      regionId: region.id,
      locationText: d.locationText || null,
      levelMinId: min.id,
      levelMaxId: max.id,
      spotsNeeded: d.spotsNeeded,
      description: d.description || null,
      autoAccept: form.get("autoAccept") === "on",
    },
  } as const;
}

export async function createMatch(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const blocked = actionBlockedReason(user);
  if (blocked) return fail(blocked);

  const active = await db.matchRequest.count({
    where: { creatorId: user.id, status: { in: ["open", "full"] }, startsAt: { gt: new Date() } },
  });
  if (active >= MAX_ACTIVE) return fail(`Je kunt maximaal ${MAX_ACTIVE} actieve oproepen tegelijk hebben.`);

  const result = await parseMatchForm(form);
  if ("error" in result) return fail(result.error!);

  const match = await db.matchRequest.create({ data: { ...result.data, creatorId: user.id } });
  revalidatePath("/oproepen");
  redirect(`/oproepen/${match.id}?nieuw=1`);
}

export async function updateMatch(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const blocked = actionBlockedReason(user);
  if (blocked) return fail(blocked);
  const id = str(form, "id");
  const match = await db.matchRequest.findUnique({ where: { id }, include: { participants: true } });
  if (!match || match.creatorId !== user.id) return fail("Je kunt deze oproep niet wijzigen.");
  if (match.status === "cancelled") return fail("Deze oproep is geannuleerd.");

  const result = await parseMatchForm(form);
  if ("error" in result) return fail(result.error!);
  if (result.data.spotsNeeded < match.filledSpots) {
    return fail(`Er zijn al ${match.filledSpots} spelers geaccepteerd. Je kunt niet minder plekken kiezen.`);
  }

  await db.matchRequest.update({
    where: { id },
    data: { ...result.data, status: result.data.spotsNeeded === match.filledSpots ? "full" : "open" },
  });
  for (const p of match.participants.filter((p) => p.status === "accepted")) {
    await notify(p.userId, "match_updated", `De oproep "${result.data.title}" is gewijzigd`, `/oproepen/${id}`);
  }
  revalidatePath(`/oproepen/${id}`);
  redirect(`/oproepen/${id}`);
}

export async function cancelMatch(form: FormData) {
  const user = await requireUser();
  const id = str(form, "id");
  const match = await db.matchRequest.findUnique({ where: { id }, include: { participants: true } });
  if (!match || match.creatorId !== user.id || match.status === "cancelled") return;
  await db.matchRequest.update({ where: { id }, data: { status: "cancelled" } });
  for (const p of match.participants.filter((p) => p.status === "accepted" || p.status === "pending")) {
    await notify(p.userId, "match_cancelled", `De oproep "${match.title}" op ${formatDateTime(match.startsAt)} is geannuleerd`, `/oproepen/${id}`);
  }
  revalidatePath(`/oproepen/${id}`);
}

/** Zet een deelnemer op geaccepteerd in één transactie met rijvergrendeling (geen dubbele boekingen). */
async function acceptInTx(tx: Prisma.TransactionClient, matchId: string, userId: string) {
  const rows = await tx.$queryRaw<{ filled_spots: number; spots_needed: number; creator_id: string; status: string }[]>`
    SELECT filled_spots, spots_needed, creator_id, status FROM match_requests WHERE id = ${matchId}::uuid FOR UPDATE`;
  const m = rows[0];
  if (!m || m.status !== "open" || m.filled_spots >= m.spots_needed) return false;

  const filled = m.filled_spots + 1;
  await tx.matchParticipant.update({
    where: { matchRequestId_userId: { matchRequestId: matchId, userId } },
    data: { status: "accepted" },
  });
  await tx.matchRequest.update({
    where: { id: matchId },
    data: { filledSpots: filled, status: filled >= m.spots_needed ? "full" : "open" },
  });

  // Groepsgesprek per oproep: organisator + geaccepteerde spelers.
  const conv = await tx.conversation.upsert({
    where: { matchRequestId: matchId },
    update: {},
    create: { type: "match", matchRequestId: matchId },
  });
  for (const uid of [m.creator_id, userId]) {
    await tx.conversationMember.upsert({
      where: { conversationId_userId: { conversationId: conv.id, userId: uid } },
      update: {},
      create: { conversationId: conv.id, userId: uid },
    });
  }
  return true;
}

export async function joinMatch(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const blocked = actionBlockedReason(user);
  if (blocked) return fail(blocked);
  const id = str(form, "id");
  const message = str(form, "message").slice(0, 300);
  if (containsContactInfo(message)) return fail(CONTACT_WARNING);

  const match = await db.matchRequest.findUnique({ where: { id } });
  if (!match || match.hiddenAt) return fail("Deze oproep bestaat niet meer.");
  if (match.creatorId === user.id) return fail("Je kunt niet op je eigen oproep reageren.");
  if (match.status !== "open" || match.startsAt < new Date()) return fail("Deze oproep is niet meer open.");
  if (await isBlockedBetween(user.id, match.creatorId)) return fail("Je kunt niet op deze oproep reageren.");

  const existing = await db.matchParticipant.findUnique({
    where: { matchRequestId_userId: { matchRequestId: id, userId: user.id } },
  });
  if (existing && existing.status !== "withdrawn") return fail("Je hebt al op deze oproep gereageerd.");

  await db.matchParticipant.upsert({
    where: { matchRequestId_userId: { matchRequestId: id, userId: user.id } },
    update: { status: "pending", message: message || null },
    create: { matchRequestId: id, userId: user.id, message: message || null },
  });

  const name = user.profile?.displayName ?? "Een speler";
  if (match.autoAccept && (await db.$transaction((tx) => acceptInTx(tx, id, user.id)))) {
    await notify(match.creatorId, "match_joined", `${name} doet mee met "${match.title}"`, `/oproepen/${id}`);
    revalidatePath(`/oproepen/${id}`);
    return { ok: "Je doet mee! Je vindt het groepsgesprek bij Berichten." };
  }

  await notify(match.creatorId, "match_response", `${name} wil meedoen met "${match.title}"`, `/oproepen/${id}`, message || undefined);
  revalidatePath(`/oproepen/${id}`);
  return { ok: "Je reactie is verstuurd. De organisator laat weten of je mee kunt doen." };
}

export async function respondToParticipant(form: FormData) {
  const user = await requireUser();
  if (actionBlockedReason(user)) return;
  const id = str(form, "id");
  const participantId = str(form, "userId");
  const decision = str(form, "decision");
  const match = await db.matchRequest.findUnique({ where: { id } });
  if (!match || match.creatorId !== user.id) return;

  const p = await db.matchParticipant.findUnique({
    where: { matchRequestId_userId: { matchRequestId: id, userId: participantId } },
  });
  if (!p || p.status !== "pending") return;

  if (decision === "accept") {
    const ok = await db.$transaction((tx) => acceptInTx(tx, id, participantId));
    if (ok) await notify(participantId, "match_accepted", `Je doet mee met "${match.title}" op ${formatDateTime(match.startsAt)} 🎾`, `/oproepen/${id}`);
  } else if (decision === "reject") {
    await db.matchParticipant.update({
      where: { matchRequestId_userId: { matchRequestId: id, userId: participantId } },
      data: { status: "rejected" },
    });
    await notify(participantId, "match_rejected", `Je kunt deze keer niet mee met "${match.title}"`, `/oproepen/${id}`);
  }
  revalidatePath(`/oproepen/${id}`);
}

export async function withdrawFromMatch(form: FormData) {
  const user = await requireUser();
  const id = str(form, "id");
  await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ filled_spots: number; status: string }[]>`
      SELECT filled_spots, status FROM match_requests WHERE id = ${id}::uuid FOR UPDATE`;
    const m = rows[0];
    const p = await tx.matchParticipant.findUnique({ where: { matchRequestId_userId: { matchRequestId: id, userId: user.id } } });
    if (!m || !p || (p.status !== "accepted" && p.status !== "pending")) return;
    await tx.matchParticipant.update({
      where: { matchRequestId_userId: { matchRequestId: id, userId: user.id } },
      data: { status: "withdrawn" },
    });
    if (p.status === "accepted") {
      await tx.matchRequest.update({
        where: { id },
        data: { filledSpots: Math.max(0, m.filled_spots - 1), status: m.status === "full" ? "open" : undefined },
      });
      const conv = await tx.conversation.findUnique({ where: { matchRequestId: id } });
      if (conv) await tx.conversationMember.deleteMany({ where: { conversationId: conv.id, userId: user.id } });
    }
  });
  const match = await db.matchRequest.findUnique({ where: { id } });
  if (match) {
    await notify(match.creatorId, "match_withdrawn", `${user.profile?.displayName ?? "Een speler"} heeft zich afgemeld voor "${match.title}"`, `/oproepen/${id}`);
  }
  revalidatePath(`/oproepen/${id}`);
}
