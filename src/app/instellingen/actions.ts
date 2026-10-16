"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, verifyPassword } from "@/lib/auth";
import { fail, type ActionState } from "@/lib/action";
import { audit } from "@/lib/notify";

/**
 * Account verwijderen (AVG art. 17): persoonsgegevens worden meteen
 * geanonimiseerd, oproepen geannuleerd en sessies ingetrokken.
 */
export async function deleteAccount(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const ok = await verifyPassword(user.passwordHash, String(form.get("password") ?? ""));
  if (!ok) return fail("Je wachtwoord klopt niet.");

  const anon = `verwijderd-${user.id.slice(0, 8)}`;
  await db.$transaction([
    db.matchRequest.updateMany({ where: { creatorId: user.id, status: { in: ["open", "full"] } }, data: { status: "cancelled" } }),
    db.matchParticipant.updateMany({ where: { userId: user.id, status: { in: ["pending", "accepted"] } }, data: { status: "withdrawn" } }),
    db.availabilitySlot.deleteMany({ where: { userId: user.id } }),
    db.session.deleteMany({ where: { userId: user.id } }),
    db.profile.update({
      where: { userId: user.id },
      data: { username: anon, displayName: "Verwijderde gebruiker", bio: null, isSearchable: false, preferredSide: null, hiddenAt: new Date() },
    }),
    db.user.update({
      where: { id: user.id },
      data: { email: `${anon}@verwijderd.padoo`, passwordHash: "-", status: "deleted", deletedAt: new Date() },
    }),
  ]);
  await audit(user.id, "account_deleted", "user", user.id);
  (await cookies()).delete("padoo_session");
  redirect("/?verwijderd=1");
}
