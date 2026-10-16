import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getLevels, getRegions } from "@/lib/ref";
import { blockedIds } from "@/lib/blocks";
import { distanceKm, matchRequestScore } from "@/lib/matching";
import { brusselsSlot, fromBrussels, toBrusselsParts } from "@/lib/time";
import { MatchCard } from "@/components/MatchCard";

export const metadata = {
  title: "Oproepen",
  description: "Padelspelers zoeken medespelers in Leuven en omgeving. Bekijk de open oproepen en doe mee.",
};

type Search = { regio?: string; straal?: string; niveau?: string; van?: string; tot?: string; dagdeel?: string; sort?: string; meer?: string };

const PAGE = 20;

export default async function MatchesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const [levels, regions] = await Promise.all([getLevels(), getRegions()]);
  const me = user?.profile?.onboardedAt ? user.profile : null;

  // Standaardwaarden: eigen gemeente binnen 15 km en eigen niveau (sectie 11.1).
  const regionSlug = sp.regio ?? (me?.region?.slug || "");
  const radius = Number(sp.straal ?? 15);
  const levelCode = sp.niveau ?? (me?.level ? me.level.code : "");
  const today = toBrusselsParts(new Date()).date;
  const from = sp.van || today;
  const to = sp.tot || toBrusselsParts(new Date(Date.now() + 30 * 86400000)).date;
  const daypart = sp.dagdeel ?? "";
  const sort = sp.sort === "match" && me ? "match" : "date";
  const limit = PAGE * Math.max(1, Math.min(10, Number(sp.meer ?? 1)));

  const origin = regions.find((r) => r.slug === regionSlug);
  const regionIds = origin
    ? regions.filter((r) => distanceKm(origin, r) <= radius).map((r) => r.id)
    : undefined;

  const level = levels.find((l) => l.code === levelCode);
  const fromDate = fromBrussels(from, "00:00") ?? new Date();
  const toDate = fromBrussels(to, "23:59") ?? new Date(Date.now() + 30 * 86400000);

  const where: Prisma.MatchRequestWhereInput = {
    status: "open",
    hiddenAt: null,
    startsAt: { gte: new Date(Math.max(Date.now(), fromDate.getTime())), lte: toDate },
    creator: { status: "active" },
    ...(regionIds ? { regionId: { in: regionIds } } : {}),
    ...(level ? { levelMin: { rank: { lte: level.rank } }, levelMax: { rank: { gte: level.rank } } } : {}),
    ...(user ? { creatorId: { notIn: [user.id, ...(await blockedIds(user.id))] } } : {}),
  };

  let matches = await db.matchRequest.findMany({
    where,
    include: { region: true, levelMin: true, levelMax: true, creator: { select: { profile: { select: { displayName: true } } } } },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    take: daypart ? 500 : limit + 1,
  });

  if (daypart) matches = matches.filter((m) => brusselsSlot(m.startsAt).daypart === daypart);

  const scores = new Map<string, number>();
  if (me?.region && me.level) {
    const slots = await db.availabilitySlot.findMany({ where: { userId: user!.id } });
    for (const m of matches) {
      scores.set(
        m.id,
        matchRequestScore(
          { rank: me.level.rank, point: me.region, slots },
          { minRank: m.levelMin.rank, maxRank: m.levelMax.rank, point: m.region, slot: brusselsSlot(m.startsAt), startsAt: m.startsAt, spotsLeft: m.spotsNeeded - m.filledSpots },
          radius,
        ),
      );
    }
    if (sort === "match") matches.sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));
  }

  const hasMore = matches.length > limit;
  matches = matches.slice(0, limit);

  const query = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ regio: regionSlug, straal: String(radius), niveau: levelCode, van: from, tot: to, dagdeel: daypart, sort, ...extra });
    return `/oproepen?${p}`;
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Oproepen</h1>
          <p className="text-stone-600">Spelers die medespelers zoeken. Doe mee of plaats zelf een oproep.</p>
        </div>
        <Link href={user ? "/oproepen/nieuw" : "/registreren"} className="btn">➕ Oproep plaatsen</Link>
      </div>

      <details className="card mb-5" open={!me}>
        <summary className="cursor-pointer font-semibold">Filters</summary>
        <form className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4" action="/oproepen">
          <div>
            <label className="label" htmlFor="regio">Gemeente</label>
            <select className="input" id="regio" name="regio" defaultValue={regionSlug}>
              <option value="">Heel Leuven en omgeving</option>
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
            <label className="label" htmlFor="niveau">Niveau</label>
            <select className="input" id="niveau" name="niveau" defaultValue={levelCode}>
              <option value="">Alle niveaus</option>
              {levels.map((l) => (
                <option key={l.id} value={l.code}>{l.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="dagdeel">Dagdeel</label>
            <select className="input" id="dagdeel" name="dagdeel" defaultValue={daypart}>
              <option value="">Alle</option>
              <option value="morning">Ochtend (voor 12 u)</option>
              <option value="afternoon">Middag (12–17 u)</option>
              <option value="evening">Avond (vanaf 17 u)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="van">Vanaf</label>
            <input className="input" id="van" name="van" type="date" defaultValue={from} min={today} />
          </div>
          <div>
            <label className="label" htmlFor="tot">Tot en met</label>
            <input className="input" id="tot" name="tot" type="date" defaultValue={to} min={today} />
          </div>
          {me && (
            <div>
              <label className="label" htmlFor="sort">Sorteren</label>
              <select className="input" id="sort" name="sort" defaultValue={sort}>
                <option value="date">Eerstvolgende eerst</option>
                <option value="match">Beste match eerst</option>
              </select>
            </div>
          )}
          <div className="flex items-end gap-2">
            <button className="btn">Toepassen</button>
            <Link href="/oproepen?regio=&niveau=" className="btn-secondary">Wissen</Link>
          </div>
        </form>
      </details>

      {matches.length === 0 ? (
        <div className="card text-center">
          <p className="mb-1 font-semibold">Geen oproepen gevonden.</p>
          <p className="mb-4 text-stone-600">Maak de straal groter, kies een ander niveau, of plaats zelf een oproep.</p>
          <Link href={user ? "/oproepen/nieuw" : "/registreren"} className="btn">Plaats zelf een oproep</Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {matches.map((m) => (
            <MatchCard key={m.id} m={m} badge={(scores.get(m.id) ?? 0) >= 70 ? "Past bij jou" : undefined} />
          ))}
        </div>
      )}
      {hasMore && (
        <div className="mt-6 text-center">
          <Link className="btn-secondary" href={query({ meer: String(Number(sp.meer ?? 1) + 1) })} scroll={false}>
            Meer oproepen tonen
          </Link>
        </div>
      )}
    </div>
  );
}
