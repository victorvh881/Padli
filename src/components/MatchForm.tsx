import type { MatchRequest } from "@prisma/client";
import { ActionForm } from "./ActionForm";
import { SubmitButton } from "./SubmitButton";
import { createMatch, updateMatch } from "@/app/oproepen/actions";
import { getLevels, getRegions } from "@/lib/ref";
import { toBrusselsParts } from "@/lib/time";

type Defaults = { regionId?: string | null; levelId?: number | null };

export async function MatchForm({ match, defaults }: { match?: MatchRequest; defaults?: Defaults }) {
  const [levels, regions] = await Promise.all([getLevels(), getRegions()]);
  const when = match ? toBrusselsParts(match.startsAt) : null;
  const today = toBrusselsParts(new Date()).date;

  return (
    <ActionForm action={match ? updateMatch : createMatch} className="card space-y-4">
      {match && <input type="hidden" name="id" value={match.id} />}
      <div>
        <label className="label" htmlFor="title">Titel</label>
        <input className="input" id="title" name="title" maxLength={80} required defaultValue={match?.title} placeholder="Bv. Dubbelspel dinsdagavond, nog 2 spelers" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="date">Datum</label>
          <input className="input" id="date" name="date" type="date" min={today} required defaultValue={when?.date} />
        </div>
        <div>
          <label className="label" htmlFor="time">Starttijd</label>
          <input className="input" id="time" name="time" type="time" step={900} required defaultValue={when?.time ?? "19:00"} />
        </div>
        <div>
          <label className="label" htmlFor="durationMinutes">Duur</label>
          <select className="input" id="durationMinutes" name="durationMinutes" defaultValue={match?.durationMinutes ?? 90}>
            <option value={60}>60 minuten</option>
            <option value={90}>90 minuten</option>
            <option value={120}>120 minuten</option>
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="regionId">Gemeente</label>
          <select className="input" id="regionId" name="regionId" required defaultValue={match?.regionId ?? defaults?.regionId ?? ""}>
            <option value="" disabled>Kies een gemeente</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="locationText">Club of terrein</label>
          <input className="input" id="locationText" name="locationText" maxLength={120} defaultValue={match?.locationText ?? ""} placeholder="Naam van de club" />
          <p className="mt-1 text-xs text-stone-500">Alleen ingelogde spelers zien dit.</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="levelMinId">Niveau vanaf</label>
          <select className="input" id="levelMinId" name="levelMinId" defaultValue={match?.levelMinId ?? defaults?.levelId ?? 1}>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="levelMaxId">Niveau tot</label>
          <select className="input" id="levelMaxId" name="levelMaxId" defaultValue={match?.levelMaxId ?? defaults?.levelId ?? 4}>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="spotsNeeded">Gezochte spelers</label>
          <select className="input" id="spotsNeeded" name="spotsNeeded" defaultValue={match?.spotsNeeded ?? 3}>
            <option value={1}>1 speler</option>
            <option value={2}>2 spelers</option>
            <option value={3}>3 spelers</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="description">Beschrijving (optioneel)</label>
        <textarea className="input min-h-24" id="description" name="description" maxLength={500} defaultValue={match?.description ?? ""} placeholder="Bv. Terrein is al gereserveerd, we delen de kosten." />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="autoAccept" defaultChecked={match?.autoAccept} className="mt-1 h-4 w-4 accent-brand-600" />
        <span>Automatisch accepteren: wie eerst reageert, doet meteen mee.</span>
      </label>
      <SubmitButton className="btn w-full sm:w-auto">{match ? "Wijzigingen opslaan" : "Oproep plaatsen"}</SubmitButton>
    </ActionForm>
  );
}
