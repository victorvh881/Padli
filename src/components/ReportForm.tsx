import { ActionForm } from "./ActionForm";
import { SubmitButton } from "./SubmitButton";
import { submitReport } from "@/app/veiligheid/actions";

const REASONS = [
  ["spam", "Spam of reclame"],
  ["harassment", "Intimidatie of ongepast gedrag"],
  ["inappropriate", "Ongepaste inhoud"],
  ["fake_profile", "Nepprofiel"],
  ["underage", "Jonger dan 16"],
  ["no_show", "Kwam niet opdagen"],
  ["other", "Iets anders"],
];

export function ReportForm({ targetType, targetId, label = "Melden" }: { targetType: "user" | "match_request" | "message"; targetId: string; label?: string }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-stone-500 hover:text-red-700">🚩 {label}</summary>
      <div className="mt-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
        <ActionForm action={submitReport} className="space-y-2">
          <input type="hidden" name="targetType" value={targetType} />
          <input type="hidden" name="targetId" value={targetId} />
          <label className="label" htmlFor={`reason-${targetId}`}>Waarom meld je dit?</label>
          <select className="input" id={`reason-${targetId}`} name="reason" required defaultValue="">
            <option value="" disabled>Kies een reden</option>
            {REASONS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <textarea className="input" name="details" maxLength={1000} placeholder="Toelichting (optioneel)" />
          <SubmitButton className="btn-danger btn-sm">Verstuur melding</SubmitButton>
        </ActionForm>
      </div>
    </details>
  );
}
