import { ActionForm } from "./ActionForm";
import { AvailabilityGrid } from "./AvailabilityGrid";
import { LevelQuiz } from "./LevelQuiz";
import { SubmitButton } from "./SubmitButton";
import { saveProfile } from "@/app/profiel/actions";
import type { CurrentUser } from "@/lib/auth";
import { getLevels, getRegions } from "@/lib/ref";
import { db } from "@/lib/db";

export async function ProfileForm({ user, onboarding }: { user: CurrentUser; onboarding: boolean }) {
  const [levels, regions, slots] = await Promise.all([
    getLevels(),
    getRegions(),
    db.availabilitySlot.findMany({ where: { userId: user.id } }),
  ]);
  const p = user.profile!;
  const selected = new Set(slots.map((s) => `${s.weekday}-${s.daypart}`));

  return (
    <ActionForm action={saveProfile} className="space-y-6">
      <section className="card space-y-4">
        <h2 className="text-lg font-bold">{onboarding ? "1. Hoe heet je?" : "Over jou"}</h2>
        <div>
          <label className="label" htmlFor="displayName">Voornaam of bijnaam</label>
          <input className="input" id="displayName" name="displayName" defaultValue={p.displayName} maxLength={40} required />
          <p className="mt-1 text-xs text-stone-500">Dit zien andere spelers. Je achternaam is niet nodig.</p>
        </div>
        <div>
          <label className="label" htmlFor="username">Gebruikersnaam</label>
          <input className="input" id="username" name="username" defaultValue={p.username} maxLength={24} pattern="[a-z0-9\-]+" required />
          <p className="mt-1 text-xs text-stone-500">Voor je profiellink: padli.be/spelers/{p.username}</p>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-bold">{onboarding ? "2. Waar en op welk niveau speel je?" : "Regio en niveau"}</h2>
        <div>
          <label className="label" htmlFor="regionId">Gemeente</label>
          <select className="input" id="regionId" name="regionId" defaultValue={p.regionId ?? ""} required>
            <option value="" disabled>Kies je gemeente</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="levelId">Niveau</label>
          <select className="input" id="levelId" name="levelId" defaultValue={p.levelId ?? ""} required>
            <option value="" disabled>Kies je niveau</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>{l.name}: {l.description}</option>
            ))}
          </select>
          <div className="mt-2">
            <LevelQuiz levels={levels} selectId="levelId" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="preferredSide">Voorkeurskant op het terrein (optioneel)</label>
          <select className="input" id="preferredSide" name="preferredSide" defaultValue={p.preferredSide ?? ""}>
            <option value="">Zeg ik liever niet</option>
            <option value="left">Links</option>
            <option value="right">Rechts</option>
            <option value="none">Maakt niet uit</option>
          </select>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-bold">{onboarding ? "3. Wanneer kun je spelen?" : "Beschikbaarheid en beschrijving"}</h2>
        <div>
          <p className="label">Duid aan wanneer je meestal kunt (alleen ingelogde spelers zien dit)</p>
          <AvailabilityGrid selected={selected} />
        </div>
        <div>
          <label className="label" htmlFor="bio">Korte beschrijving (optioneel)</label>
          <textarea className="input min-h-24" id="bio" name="bio" maxLength={300} defaultValue={p.bio ?? ""} placeholder="Bv. Speel sinds een jaar, zoek vaste partners voor dinsdagavond." />
          <p className="mt-1 text-xs text-stone-500">Max 300 tekens. Geen telefoonnummer, e-mail of links.</p>
        </div>
        {!onboarding && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isSearchable" defaultChecked={p.isSearchable} className="h-4 w-4 accent-brand-600" />
            Toon mij in de zoekresultaten van spelers
          </label>
        )}
      </section>

      <SubmitButton className="btn w-full sm:w-auto">{onboarding ? "Klaar, naar Padli" : "Profiel opslaan"}</SubmitButton>
    </ActionForm>
  );
}
