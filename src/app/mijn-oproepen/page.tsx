import Link from "next/link";
import { db } from "@/lib/db";
import { requireOnboarded } from "@/lib/auth";
import { MatchCard } from "@/components/MatchCard";

export const metadata = { title: "Mijn oproepen" };

const include = { region: true, levelMin: true, levelMax: true, creator: { select: { profile: { select: { displayName: true } } } } } as const;

export default async function MyMatchesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireOnboarded();
  const tab = (await searchParams).tab === "deelname" ? "deelname" : "georganiseerd";
  const since = new Date(Date.now() - 30 * 86400000);

  const organized = await db.matchRequest.findMany({
    where: { creatorId: user.id, startsAt: { gte: since } },
    include: { ...include, participants: { where: { status: "pending" }, select: { userId: true } } },
    orderBy: { startsAt: "asc" },
  });
  const joined = await db.matchParticipant.findMany({
    where: { userId: user.id, status: { in: ["pending", "accepted"] }, matchRequest: { startsAt: { gte: since } } },
    include: { matchRequest: { include } },
    orderBy: { matchRequest: { startsAt: "asc" } },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Mijn oproepen</h1>
        <Link href="/oproepen/nieuw" className="btn btn-sm">➕ Nieuwe oproep</Link>
      </div>
      <div className="mb-4 flex gap-2" role="tablist">
        <Link role="tab" aria-selected={tab === "georganiseerd"} href="/mijn-oproepen" className={tab === "georganiseerd" ? "btn btn-sm" : "btn-secondary btn-sm"}>
          Georganiseerd ({organized.length})
        </Link>
        <Link role="tab" aria-selected={tab === "deelname"} href="/mijn-oproepen?tab=deelname" className={tab === "deelname" ? "btn btn-sm" : "btn-secondary btn-sm"}>
          Ik doe mee ({joined.length})
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {tab === "georganiseerd" &&
          (organized.length ? (
            organized.map((m) => (
              <MatchCard key={m.id} m={m} badge={m.participants.length ? `${m.participants.length} nieuwe reactie(s)` : undefined} />
            ))
          ) : (
            <p className="text-stone-600">Je hebt nog geen oproepen geplaatst.</p>
          ))}
        {tab === "deelname" &&
          (joined.length ? (
            joined.map((p) => <MatchCard key={p.matchRequestId} m={p.matchRequest} badge={p.status === "pending" ? "Wacht op antwoord" : "Je doet mee"} />)
          ) : (
            <p className="text-stone-600">Je doet nog nergens aan mee. <Link href="/oproepen" className="link">Bekijk de oproepen</Link>.</p>
          ))}
      </div>
    </div>
  );
}
