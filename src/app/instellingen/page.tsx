import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { logoutAll, resendVerification } from "@/app/auth-actions";
import { toggleBlock } from "@/app/veiligheid/actions";
import { deleteAccount } from "./actions";

export const metadata = { title: "Instellingen" };

export default async function SettingsPage() {
  const user = await requireUser();
  const blocks = await db.block.findMany({
    where: { blockerId: user.id },
    include: { blocked: { select: { id: true, profile: { select: { displayName: true } } } } },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-extrabold">Instellingen</h1>

      <section className="card space-y-2">
        <h2 className="text-lg font-bold">Account</h2>
        <p className="text-sm">E-mailadres: <strong>{user.email}</strong></p>
        {user.status === "pending_verification" && (
          <ActionForm action={resendVerification} className="space-y-2">
            <p className="text-sm text-amber-800">Je e-mailadres is nog niet bevestigd.</p>
            <SubmitButton className="btn-secondary btn-sm">Stuur bevestigingsmail opnieuw</SubmitButton>
          </ActionForm>
        )}
        <form action={logoutAll}>
          <button className="btn-secondary btn-sm">Uitloggen op alle toestellen</button>
        </form>
      </section>

      <section className="card space-y-2">
        <h2 className="text-lg font-bold">Privacy</h2>
        <p className="text-sm text-stone-600">
          Of je in de zoekresultaten verschijnt, stel je in bij <Link href="/profiel/bewerken" className="link">je profiel</Link>. Je e-mailadres en
          geboortedatum zijn nooit zichtbaar voor andere spelers.
        </p>
        <a href="/api/export" className="btn-secondary btn-sm">Download mijn gegevens</a>
      </section>

      <section className="card">
        <h2 className="mb-2 text-lg font-bold">Geblokkeerde spelers</h2>
        {blocks.length === 0 ? (
          <p className="text-sm text-stone-600">Je hebt niemand geblokkeerd.</p>
        ) : (
          <ul className="space-y-2">
            {blocks.map((b) => (
              <li key={b.blockedId} className="flex items-center justify-between">
                <span>{b.blocked.profile?.displayName}</span>
                <form action={toggleBlock}>
                  <input type="hidden" name="userId" value={b.blockedId} />
                  <button className="btn-secondary btn-sm">Deblokkeren</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card border-red-200">
        <h2 className="mb-1 text-lg font-bold text-red-800">Account verwijderen</h2>
        <p className="mb-3 text-sm text-stone-600">Je profiel verdwijnt en je oproepen worden geannuleerd. Dit kan niet ongedaan worden gemaakt.</p>
        <ActionForm action={deleteAccount} className="space-y-2">
          <label className="label" htmlFor="password">Bevestig met je wachtwoord</label>
          <input className="input" id="password" name="password" type="password" required autoComplete="current-password" />
          <SubmitButton className="btn-danger">Mijn account verwijderen</SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
