import Link from "next/link";
import { db } from "@/lib/db";
import { requireOnboarded } from "@/lib/auth";
import { blockedIds } from "@/lib/blocks";
import { searchPlayers } from "@/lib/players";
import { distanceKm, matchRequestScore } from "@/lib/matching";
import { brusselsSlot } from "@/lib/time";
import { MatchCard } from "@/components/MatchCard";
import { PlayerCard } from "@/components/PlayerCard";

export const metadata = { title: "Dashboard" };

const include = { region: true, levelMin: true, levelMax: true, creator: { select: { profile: { select: { displayName: true } } } } } as const;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welkom?: string }> }) {
  const user = await requireOnboarded();
  const { welkom } = await searchParams;
  const me = user.profile!;
  const now = new Date();

  const upcoming = await db.matchRequest.findMany({
    where: {
      startsAt: { gte: now },
      status: { in: ["open", "full"] },
      OR: [{ creatorId: user.id }, { participants: { some: { userId: user.id, status: "accepted" } } }],
    },
    include,
    orderBy: { startsAt: "asc" },
    take: 4,
  });

  // Voorgestelde oproepen: niveau-overlap ±1, binnen 15 km, gesorteerd op matchscore.
  const blocked = await blockedIds(user.id);
  const candidates = await db.matchRequest.findMany({
    where: {
      status: "open",
      hiddenAt: null,
      startsAt: { gte: now },
      creatorId: { notIn: [user.id, ...blocked] },
      creator: { status: "active" },
      participants: { none: { userId: user.id } },
      ...(me.level ? { levelMin: { rank: { lte: me.level.rank + 1 } }, levelMax: { rank: { gte: me.level.rank - 1 } } } : {}),
    },
    include,
    take: 200,
    orderBy: { startsAt: "asc" },
  });
  const slots = await db.availabilitySlot.findMany({ where: { userId: user.id } });
  const suggested = me.region && me.level
    ? candidates
        .filter((m) => distanceKm(me.region!, m.region) <= 15)
        .map((m) => ({
          m,
          score: matchRequestScore(
            { rank: me.level!.rank, point: me.region!, slots },
            { minRank: m.levelMin.rank, maxRank: m.levelMax.rank, point: m.region, slot: brusselsSlot(m.startsAt), startsAt: m.startsAt, spotsLeft: m.spotsNeeded - m.filledSpots },
          ),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
    : [];

  const players = await searchPlayers(user, { limit: 4 });

  return (
    <div className="space-y-8">
      {welkom && (
        <p className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-brand-900">
          Welkom bij Padli, {me.displayName}! Hieronder vind je oproepen en spelers die bij jou passen.
        </p>
      )}
      {user.status === "pending_verification" && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          Bevestig je e-mailadres via de link in je mailbox, dan kun je oproepen plaatsen en berichten sturen.{" "}
          <Link href="/instellingen" className="link">Mail opnieuw sturen</Link>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Hoi {me.displayName} 👋</h1>
          <p className="text-stone-600">{me.level?.name} · {me.region?.name}</p>
        </div>
        <Link href="/oproepen/nieuw" className="btn">➕ Oproep plaatsen</Link>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold">Jouw komende partijen</h2>
          <Link href="/mijn-oproepen" className="link text-sm">Mijn oproepen</Link>
        </div>
        {upcoming.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((m) => (
              <MatchCard key={m.id} m={m} badge={m.creatorId === user.id ? "Jij organiseert" : "Je doet mee"} />
            ))}
          </div>
        ) : (
          <p className="text-stone-600">Nog niets gepland. Doe mee met een oproep hieronder of plaats er zelf een.</p>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold">Oproepen voor jou</h2>
          <Link href="/oproepen" className="link text-sm">Alle oproepen</Link>
        </div>
        {suggested.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {suggested.map(({ m, score }) => (
              <MatchCard key={m.id} m={m} badge={score >= 70 ? "Past bij jou" : undefined} />
            ))}
          </div>
        ) : (
          <p className="text-stone-600">Er zijn nu geen open oproepen op jouw niveau in de buurt.</p>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold">Spelers voor jou</h2>
          <Link href="/spelers" className="link text-sm">Zoek spelers</Link>
        </div>
        {players.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {players.map(({ p, km, score }) => (
              <PlayerCard key={p.userId} p={p} km={km} score={score} />
            ))}
          </div>
        ) : (
          <p className="text-stone-600">Nog geen spelers van jouw niveau in de buurt. Nodig je padelvrienden uit!</p>
        )}
      </section>
    </div>
  );
}
