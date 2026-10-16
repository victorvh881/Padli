import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hash, verify } from "@node-rs/argon2";
import { db } from "./db";
import { hashToken, newToken } from "./tokens";

const COOKIE = "padli_session";
const SESSION_DAYS = 30;

export const hashPassword = (password: string) => hash(password);
export const verifyPassword = (passwordHash: string, password: string) =>
  verify(passwordHash, password).catch(() => false);

export async function createSession(userId: string, remember = true) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await db.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(remember ? { expires: expiresAt } : {}),
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  store.delete(COOKIE);
}

export async function destroyAllSessions(userId: string) {
  await db.session.deleteMany({ where: { userId } });
  (await cookies()).delete(COOKIE);
}

/** De ingelogde gebruiker met profiel, of null. Eén keer per request opgehaald. */
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { profile: { include: { region: true, level: true } } } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  const user = session.user;
  if (user.status === "banned" || user.status === "deleted") return null;
  // Een verlopen schorsing automatisch opheffen.
  if (user.status === "suspended" && user.suspendedUntil && user.suspendedUntil < new Date()) {
    await db.user.update({ where: { id: user.id }, data: { status: "active", suspendedUntil: null } });
    user.status = "active";
  }
  if (Date.now() - user.lastActiveAt.getTime() > 3600 * 1000) {
    await db.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  }
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Vereist een ingelogde gebruiker; anders naar de inlogpagina. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/inloggen");
  return user;
}

/** Vereist een ingelogde gebruiker die zijn profiel heeft ingevuld. */
export async function requireOnboarded() {
  const user = await requireUser();
  if (!user.profile?.onboardedAt) redirect("/onboarding");
  return user;
}

export async function requireStaff() {
  const user = await requireUser();
  if (user.role !== "moderator" && user.role !== "admin") redirect("/dashboard");
  return user;
}

/** Foutmelding als de gebruiker niets mag plaatsen of sturen, anders null. */
export function actionBlockedReason(user: CurrentUser): string | null {
  if (user.status === "pending_verification") return "Bevestig eerst je e-mailadres via de link in je mailbox.";
  if (user.status === "suspended") return "Je account is tijdelijk geschorst. Je kunt nu niets plaatsen of sturen.";
  if (user.status !== "active") return "Je account is niet actief.";
  if (!user.profile?.onboardedAt) return "Vul eerst je profiel in.";
  return null;
}
