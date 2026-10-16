import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { getCurrentUser } from "@/lib/auth";
import { login } from "../auth-actions";

export const metadata = { title: "Inloggen" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-extrabold">Inloggen</h1>
      <div className="card">
        <ActionForm action={login}>
          <input type="hidden" name="next" value={next ?? ""} />
          <div>
            <label className="label" htmlFor="email">E-mailadres</label>
            <input className="input" id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <label className="label" htmlFor="password">Wachtwoord</label>
            <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="remember" defaultChecked className="h-4 w-4 accent-brand-600" /> Ingelogd blijven
            </label>
            <Link href="/wachtwoord-vergeten" className="link">Wachtwoord vergeten?</Link>
          </div>
          <SubmitButton>Inloggen</SubmitButton>
        </ActionForm>
      </div>
      <p className="mt-4 text-center text-sm">
        Nog geen account? <Link href="/registreren" className="link">Gratis registreren</Link>
      </p>
    </div>
  );
}
