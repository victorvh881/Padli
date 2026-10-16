import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { resetPassword } from "../../auth-actions";

export const metadata = { title: "Nieuw wachtwoord" };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-extrabold">Kies een nieuw wachtwoord</h1>
      <div className="card">
        <ActionForm action={resetPassword}>
          <input type="hidden" name="token" value={token} />
          <div>
            <label className="label" htmlFor="password">Nieuw wachtwoord</label>
            <input className="input" id="password" name="password" type="password" minLength={10} autoComplete="new-password" required />
          </div>
          <SubmitButton>Opslaan</SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
