"use server";

import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { str } from "@/lib/action";
import { isUuid } from "@/lib/text";
import { audit, notify } from "@/lib/notify";

async function setHidden(targetType: string, targetId: string, hidden: boolean) {
  const hiddenAt = hidden ? new Date() : null;
  if (targetType === "match_request") await db.matchRequest.updateMany({ where: { id: targetId }, data: { hiddenAt } });
  if (targetType === "message") await db.message.updateMany({ where: { id: targetId }, data: { hiddenAt } });
  if (targetType === "user") await db.profile.updateMany({ where: { userId: targetId }, data: { hiddenAt } });
}

/** Behandelt een melding volgens de flow in sectie 14.3. Elke actie vraagt een reden en wordt gelogd. */
export async function handleReport(form: FormData) {
  const mod = await requireStaff();
  const reportId = str(form, "reportId");
  const action = str(form, "action");
  const reason = str(form, "reason") || "Geen reden opgegeven";
  if (!isUuid(reportId)) return;
  const report = await db.report.findUnique({ where: { id: reportId } });
  if (!report || report.status === "resolved" || report.status === "dismissed") return;
  if (action === "ban" && mod.role !== "admin") return;

  const target = report.targetUserId;
  let expiresAt: Date | null = null;

  if (action === "dismiss") {
    await setHidden(report.targetType, report.targetId, false);
  } else {
    await setHidden(report.targetType, report.targetId, true);
  }
  if (target && (action === "suspend7" || action === "suspend30")) {
    expiresAt = new Date(Date.now() + (action === "suspend7" ? 7 : 30) * 86400000);
    await db.user.update({ where: { id: target }, data: { status: "suspended", suspendedUntil: expiresAt } });
  }
  if (target && action === "ban") {
    await db.user.update({ where: { id: target }, data: { status: "banned" } });
    await db.session.deleteMany({ where: { userId: target } });
    await db.profile.update({ where: { userId: target }, data: { hiddenAt: new Date() } });
  }

  await db.moderationAction.create({
    data: { reportId, moderatorId: mod.id, targetUserId: target, action, reason, expiresAt },
  });
  // Alle open meldingen over dezelfde content samen afsluiten.
  await db.report.updateMany({
    where: { targetType: report.targetType, targetId: report.targetId, status: { in: ["open", "in_review"] } },
    data: { status: action === "dismiss" ? "dismissed" : "resolved", resolvedAt: new Date() },
  });
  await audit(mod.id, `report_${action}`, report.targetType, report.targetId, { reportId, reason });

  if (target && action !== "dismiss") {
    const msg: Record<string, string> = {
      hide: "Een bericht, oproep of profieltekst van jou is verborgen omdat het de communityregels niet volgt.",
      warn: "Je krijgt een waarschuwing van het Padoo-team.",
      suspend7: "Je account is 7 dagen geschorst.",
      suspend30: "Je account is 30 dagen geschorst.",
      ban: "Je account is permanent geblokkeerd.",
    };
    await notify(target, "moderation", msg[action] ?? "Het Padoo-team heeft een melding over jou behandeld.", "/communityregels", `Reden: ${reason}`);
  }
  if (report.reporterId) await notify(report.reporterId, "report_handled", "Je melding is behandeld. Bedankt om Padoo veilig te houden.");
  revalidatePath("/admin", "layout");
}

export async function setUserStatus(form: FormData) {
  const mod = await requireStaff();
  const userId = str(form, "userId");
  const action = str(form, "action");
  const reason = str(form, "reason") || "Geen reden opgegeven";
  if (!isUuid(userId) || userId === mod.id) return;
  if ((action === "ban" || action === "unban") && mod.role !== "admin") return;

  if (action === "unsuspend" || action === "unban") {
    await db.user.update({ where: { id: userId }, data: { status: "active", suspendedUntil: null } });
    await db.profile.update({ where: { userId }, data: { hiddenAt: null } });
  } else if (action === "suspend7") {
    await db.user.update({ where: { id: userId }, data: { status: "suspended", suspendedUntil: new Date(Date.now() + 7 * 86400000) } });
  } else if (action === "ban") {
    await db.user.update({ where: { id: userId }, data: { status: "banned" } });
    await db.session.deleteMany({ where: { userId } });
  } else return;

  await db.moderationAction.create({ data: { moderatorId: mod.id, targetUserId: userId, action, reason } });
  await audit(mod.id, `user_${action}`, "user", userId, { reason });
  revalidatePath("/admin/gebruikers");
}

export async function setRole(form: FormData) {
  const admin = await requireStaff();
  if (admin.role !== "admin") return;
  const userId = str(form, "userId");
  const role = str(form, "role") as Role;
  if (!isUuid(userId) || userId === admin.id || !["player", "moderator", "admin"].includes(role)) return;
  await db.user.update({ where: { id: userId }, data: { role } });
  await audit(admin.id, "role_changed", "user", userId, { role });
  revalidatePath("/admin/gebruikers");
}
