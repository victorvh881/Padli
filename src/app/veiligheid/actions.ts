"use server";

import { revalidatePath } from "next/cache";
import type { ReportReason, ReportTarget } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, str, type ActionState } from "@/lib/action";
import { isUuid } from "@/lib/text";
import { notify } from "@/lib/notify";

// Ernst en drempel voor automatisch verbergen per reden (sectie 14.2).
const RULES: Record<ReportReason, { severity: number; hideAt?: number }> = {
  spam: { severity: 2, hideAt: 3 },
  harassment: { severity: 3 },
  inappropriate: { severity: 2, hideAt: 3 },
  fake_profile: { severity: 2 },
  underage: { severity: 3 },
  no_show: { severity: 1 },
  other: { severity: 1 },
};

export async function submitReport(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const targetType = str(form, "targetType") as ReportTarget;
  const targetId = str(form, "targetId");
  const reason = str(form, "reason") as ReportReason;
  const details = str(form, "details").slice(0, 1000);
  if (!["user", "match_request", "message"].includes(targetType) || !isUuid(targetId)) return fail("Er ging iets mis.");
  if (!(reason in RULES)) return fail("Kies een reden.");

  let targetUserId: string | null = null;
  if (targetType === "user") targetUserId = (await db.user.findUnique({ where: { id: targetId } }))?.id ?? null;
  if (targetType === "match_request") targetUserId = (await db.matchRequest.findUnique({ where: { id: targetId } }))?.creatorId ?? null;
  if (targetType === "message") {
    const msg = await db.message.findUnique({ where: { id: targetId } });
    // Alleen deelnemers van het gesprek mogen een bericht melden.
    const member = msg && (await db.conversationMember.findUnique({ where: { conversationId_userId: { conversationId: msg.conversationId, userId: user.id } } }));
    if (!member) return fail("Je kunt dit bericht niet melden.");
    targetUserId = msg.senderId;
  }
  if (!targetUserId) return fail("Dit bestaat niet meer.");
  if (targetUserId === user.id) return fail("Je kunt jezelf niet melden.");

  const already = await db.report.findFirst({ where: { reporterId: user.id, targetType, targetId, status: { in: ["open", "in_review"] } } });
  if (already) return { ok: "Je hebt dit al gemeld. We bekijken het zo snel mogelijk." };

  const rule = RULES[reason];
  await db.report.create({
    data: { reporterId: user.id, targetType, targetId, targetUserId, reason, details: details || null, severity: rule.severity },
  });

  // Drempel bereikt: content automatisch verbergen tot een moderator het bekijkt.
  if (rule.hideAt) {
    const count = await db.report.count({ where: { targetType, targetId, reason, status: { in: ["open", "in_review"] } } });
    if (count >= rule.hideAt) {
      const now = new Date();
      if (targetType === "match_request") await db.matchRequest.update({ where: { id: targetId }, data: { hiddenAt: now } });
      if (targetType === "message") await db.message.update({ where: { id: targetId }, data: { hiddenAt: now } });
      if (targetType === "user") await db.profile.update({ where: { userId: targetId }, data: { hiddenAt: now } });
    }
  }

  await notify(user.id, "report_received", "Bedankt voor je melding. We bekijken dit binnen 48 uur.");
  return { ok: "Bedankt voor je melding. We bekijken dit binnen 48 uur." };
}

export async function toggleBlock(form: FormData) {
  const user = await requireUser();
  const targetId = str(form, "userId");
  if (!isUuid(targetId) || targetId === user.id) return;
  const key = { blockerId_blockedId: { blockerId: user.id, blockedId: targetId } };
  const existing = await db.block.findUnique({ where: key });
  if (existing) await db.block.delete({ where: key });
  else await db.block.create({ data: { blockerId: user.id, blockedId: targetId } });
  revalidatePath("/", "layout");
}
