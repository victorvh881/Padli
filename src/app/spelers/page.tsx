import { requireOnboarded } from "@/lib/auth";
import { getLevels, getRegions } from "@/lib/ref";
import { searchPlayers } from "@/lib/players";
import { PlayerCard } from "@/components/PlayerCard";
import { AvailabilityGrid } from "@/components/AvailabilityGrid";
import Link from "next/link";

export const metadata = { title: "Spelers zoeken" };

type Search = { regio?: string; straal?: string; niveau?: string | string[]; slot?: string | string[]; q?: string };
const arr = (v?: string | string[]) => (v === undefined ? undefined : Array.isArray(v) ? v : [v]);

export default async function PlayersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireOnboarded();
  const sp = await searchParams;
  const [levels, regions] = await Promise.all([getLevels(), getRegions()]);
  const me = user.profile!;

  // Standaard: eigen niveau ± 1 (sectie 11.1).
  const defaultLevels = levels.filter((l) => me.level && Math.abs(l.rank - me.level.rank) <= 1).map((l) => l.code);
  const levelCodes = arr(sp.niveau) ?? defaultLevels;
  const regionSlug = sp.regio ?? me.region?.slug ?? "";
  const radius = Number(sp.straal ?? 15);
  const slots = arr(sp.slot) ?? [];

  const results = await searchPlayers(user, { regionSlug, radiusKm: radius, levelCodes, slots, q: sp.q?.trim() });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold">Spelers zoeken</h1>
      <p className="mb-4 text-stone-600">De beste matches voor jou staan bovenaan.</p>

      <details className="card mb-5">
        <summary className="cursor-pointer font-semibold">Filters</summary>
        <form action="/spelers" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="regio">Gemeente</label>
              <select className="input" id="regio" name="regio" defaultValue={regionSlug}>
                {regions.map((r) => (
                  <option key={r.id} value={r.slug}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="straal">Straal</label>
              <select className="input" id="straal" name="straal" defaultValue={String(radius)}>
                {[5, 10, 15, 25].map((km) => (
                  <option key={km} value={km}>{km} km</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="q">Naam</label>
              <input className="input" id="q" name="q" defaultValue={sp.q} placeholder="Zoek op naam" />
            </div>
          </div>
          <fieldset>
            <legend className="label">Niveau</legend>
            <div className="flex flex-wrap gap-3">
              {levels.map((l) => (
                <label key={l.id} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" name="niveau" value={l.code} defaultChecked={levelCodes.includes(l.code)} className="h-4 w-4 accent-brand-600" />
                  {l.name}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="label">Beschikbaar op (optioneel)</legend>
            <AvailabilityGrid selected={new Set(slots)} />
          </fieldset>
          <div className="flex gap-2">
            <button className="btn">Zoeken</button>
            <Link className="btn-secondary" href="/spelers">Standaard</Link>
          </div>
        </form>
      </details>

      {results.length === 0 ? (
        <div className="card text-center">
          <p className="mb-1 font-semibold">Geen spelers gevonden.</p>
          <p className="mb-4 text-stone-600">Maak de straal groter of kies meer niveaus. Of plaats een oproep, dan vinden spelers jou.</p>
          <Link href="/oproepen/nieuw" className="btn">Plaats een oproep</Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {results.map(({ p, km, score }) => (
            <PlayerCard key={p.userId} p={p} km={km} score={score} />
          ))}
        </div>
      )}
    </div>
  );
}
