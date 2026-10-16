"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroyAllSessions, destroySession, getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { emailEnabled, link, sendEmail } from "@/lib/email";
import { hashToken, newToken } from "@/lib/tokens";
import { fail, str, type ActionState } from "@/lib/action";
import { slugifyUsername } from "@/lib/text";

const TERMS_VERSION = "2026-10";

// Eenvoudige rem op inlogpogingen per e-mailadres (in geheugen, per serverinstantie).
const attempts = new Map<string, { n: number; until: number }>();

function ageOn(birth: Date, now = new Date()) {
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

async function sendVerification(userId: string, email: string) {
  const token = newToken();
  await db.authToken.create({
    data: { userId, type: "verify_email", tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 24 * 3600 * 1000) },
  });
  await sendEmail(
    email,
    "Bevestig je e-mailadres voor Padli",
    `Welkom bij Padli!\n\nKlik op deze link om je e-mailadres te bevestigen (24 uur geldig):\n${link(`/verifieer/${token}`)}\n\nHeb je geen account aangemaakt? Dan mag je deze mail negeren.`,
  );
}

async function uniqueUsername(base: string) {
  const root = slugifyUsername(base) || "speler";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${Math.floor(Math.random() * 9000 + 1000)}`;
    if (!(await db.profile.findUnique({ where: { username: candidate } }))) return candidate;
  }
  return `${root}-${Date.now()}`;
}

const registerSchema = z.object({
  email: z.email("Vul een geldig e-mailadres in."),
  password: z.string().min(10, "Je wachtwoord moet minstens 10 tekens hebben.").max(200),
  birthDate: z.iso.date("Vul je geboortedatum in."),
});

export async function register(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({ email: str(form, "email"), password: form.get("password"), birthDate: str(form, "birthDate") });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  if (form.get("acceptTerms") !== "on") return fail("Je moet akkoord gaan met de voorwaarden, het privacybeleid en de communityregels.");

  const email = parsed.data.email.toLowerCase();
  const birthDate = new Date(parsed.data.birthDate);
  if (ageOn(birthDate) < 16) return fail("Je moet minstens 16 jaar zijn om Padli te gebruiken.");
  if (ageOn(birthDate) > 110) return fail("Controleer je geboortedatum.");

  if (await db.user.findUnique({ where: { email } })) {
    return fail("Er bestaat al een account met dit e-mailadres. Probeer in te loggen.");
  }

  const verifyByEmail = emailEnabled();
  const user = await db.user.create({
    data: {
      email,
      passwordHash: await hashPassword(parsed.data.password),
      birthDate,
      status: verifyByEmail ? "pending_verification" : "active",
      emailVerifiedAt: verifyByEmail ? null : new Date(),
      termsVersion: TERMS_VERSION,
      termsAcceptedAt: new Date(),
      profile: { create: { username: await uniqueUsername(email.split("@")[0]), displayName: "" } },
    },
  });
  if (verifyByEmail) await sendVerification(user.id, email);
  await createSession(user.id);
  redirect("/onboarding");
}

export async function login(_: ActionState, form: FormData): Promise<ActionState> {
  const email = str(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const now = Date.now();
  const a = attempts.get(email);
  if (a && a.n >= 5 && a.until > now) return fail("Te veel pogingen. Probeer het over een kwartier opnieuw.");

  const user = await db.user.findUnique({ where: { email }, include: { profile: true } });
  const ok = user && (await verifyPassword(user.passwordHash, password));
  if (!user || !ok) {
    attempts.set(email, { n: (a && a.until > now ? a.n : 0) + 1, until: now + 15 * 60 * 1000 });
    return fail("E-mailadres of wachtwoord klopt niet.");
  }
  attempts.delete(email);
  if (user.status === "banned") return fail("Dit account is geblokkeerd. Neem contact op met het Padli-team als je denkt dat dit een vergissing is.");
  if (user.status === "deleted") return fail("E-mailadres of wachtwoord klopt niet.");

  await createSession(user.id, form.get("remember") === "on");
  const next = str(form, "next");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : user.profile?.onboardedAt ? "/dashboard" : "/onboarding");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function logoutAll() {
  const user = await getCurrentUser();
  if (user) await destroyAllSessions(user.id);
  redirect("/inloggen");
}

export async function resendVerification(_: ActionState): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || user.status !== "pending_verification") return fail("Je e-mailadres is al bevestigd.");
  const recent = await db.authToken.count({
    where: { userId: user.id, type: "verify_email", createdAt: { gt: new Date(Date.now() - 3600 * 1000) } },
  });
  if (recent >= 3) return fail("Je hebt al 3 mails gevraagd dit uur. Probeer later opnieuw.");
  await sendVerification(user.id, user.email);
  return { ok: "We hebben een nieuwe bevestigingsmail gestuurd." };
}

export async function requestPasswordReset(_: ActionState, form: FormData): Promise<ActionState> {
  const email = str(form, "email").toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (user && user.status !== "deleted" && user.status !== "banned") {
    const token = newToken();
    await db.authToken.create({
      data: { userId: user.id, type: "reset_password", tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3600 * 1000) },
    });
    await sendEmail(
      email,
      "Nieuw wachtwoord voor Padli",
      `Je vroeg een nieuw wachtwoord aan. Klik op deze link (1 uur geldig, één keer bruikbaar):\n${link(`/wachtwoord-resetten/${token}`)}\n\nVroeg je niets aan? Dan mag je deze mail negeren.`,
    );
  }
  // Altijd hetzelfde antwoord, zodat niemand kan uitzoeken welke e-mailadressen bestaan.
  return { ok: "Als er een account bestaat met dit e-mailadres, krijg je een mail met een link." };
}

export async function resetPassword(_: ActionState, form: FormData): Promise<ActionState> {
  const token = str(form, "token");
  const password = String(form.get("password") ?? "");
  if (password.length < 10) return fail("Je wachtwoord moet minstens 10 tekens hebben.");
  const record = await db.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.type !== "reset_password" || record.usedAt || record.expiresAt < new Date()) {
    return fail("Deze link is verlopen of al gebruikt. Vraag een nieuwe aan.");
  }
  await db.$transaction([
    db.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(password) } }),
    db.session.deleteMany({ where: { userId: record.userId } }),
  ]);
  await createSession(record.userId);
  redirect("/dashboard");
}
