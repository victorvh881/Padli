import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { getCurrentUser } from "@/lib/auth";
import { register } from "../auth-actions";

export const metadata = { title: "Registreren" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-2xl font-extrabold">Maak je gratis account</h1>
      <p className="mb-6 text-stone-600">Binnen 2 minuten zoek je medespelers van jouw niveau.</p>
      <div className="card">
        <ActionForm action={register}>
          <div>
            <label className="label" htmlFor="email">E-mailadres</label>
            <input className="input" id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <label className="label" htmlFor="password">Wachtwoord</label>
            <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
            <p className="mt-1 text-xs text-stone-500">Minstens 10 tekens.</p>
          </div>
          <div>
            <label className="label" htmlFor="birthDate">Geboortedatum</label>
            <input className="input" id="birthDate" name="birthDate" type="date" required />
            <p className="mt-1 text-xs text-stone-500">Je moet minstens 16 zijn. Niemand anders ziet je geboortedatum.</p>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="acceptTerms" className="mt-1 h-4 w-4 accent-brand-600" required />
            <span>
              Ik ga akkoord met de <Link className="link" href="/voorwaarden" target="_blank">voorwaarden</Link>, het{" "}
              <Link className="link" href="/privacy" target="_blank">privacybeleid</Link> en de{" "}
              <Link className="link" href="/communityregels" target="_blank">communityregels</Link>.
            </span>
          </label>
          <SubmitButton>Account aanmaken</SubmitButton>
        </ActionForm>
      </div>
      <p className="mt-4 text-center text-sm">
        Al een account? <Link href="/inloggen" className="link">Inloggen</Link>
      </p>
    </div>
  );
}
