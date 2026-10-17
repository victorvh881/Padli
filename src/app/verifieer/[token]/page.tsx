import Link from "next/link";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

export const metadata = { title: "E-mail bevestigen" };

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record = await db.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  const valid = record && record.type === "verify_email" && !record.usedAt && record.expiresAt > new Date();

  if (valid) {
    await db.$transaction([
      db.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      db.user.updateMany({
        where: { id: record.userId, status: "pending_verification" },
        data: { status: "active", emailVerifiedAt: new Date() },
      }),
    ]);
  }

  return (
    <div className="card mx-auto max-w-md text-center">
      {valid ? (
        <>
          <h1 className="mb-2 text-2xl font-extrabold">Je e-mailadres is bevestigd 🎾</h1>
          <p className="mb-4 text-stone-600">Je kunt nu oproepen plaatsen, reageren en berichten sturen.</p>
          <Link href="/dashboard" className="btn">Naar Padoo</Link>
        </>
      ) : (
        <>
          <h1 className="mb-2 text-2xl font-extrabold">Deze link werkt niet meer</h1>
          <p className="mb-4 text-stone-600">De link is verlopen of al gebruikt. Log in en vraag een nieuwe mail aan.</p>
          <Link href="/inloggen" className="btn">Inloggen</Link>
        </>
      )}
    </div>
  );
}
