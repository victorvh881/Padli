import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { requestPasswordReset } from "../auth-actions";

export const metadata = { title: "Wachtwoord vergeten" };

export default function ForgotPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-2 text-2xl font-extrabold">Wachtwoord vergeten</h1>
      <p className="mb-6 text-stone-600">Vul je e-mailadres in. Je krijgt een link om een nieuw wachtwoord te kiezen.</p>
      <div className="card">
        <ActionForm action={requestPasswordReset}>
          <div>
            <label className="label" htmlFor="email">E-mailadres</label>
            <input className="input" id="email" name="email" type="email" required />
          </div>
          <SubmitButton>Stuur link</SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
