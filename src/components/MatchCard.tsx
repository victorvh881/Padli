import Link from "next/link";
import { formatDateTime } from "@/lib/time";

export type MatchCardData = {
  id: string;
  title: string;
  startsAt: Date;
  durationMinutes: number;
  spotsNeeded: number;
  filledSpots: number;
  status: string;
  region: { name: string };
  levelMin: { name: string; rank: number };
  levelMax: { name: string; rank: number };
  creator: { profile: { displayName: string } | null };
};

export function levelRange(min: { name: string }, max: { name: string }) {
  return min.name === max.name ? min.name : `${min.name} – ${max.name}`;
}

export function MatchCard({ m, badge }: { m: MatchCardData; badge?: string }) {
  const left = m.spotsNeeded - m.filledSpots;
  const past = m.startsAt < new Date();
  return (
    <Link href={`/oproepen/${m.id}`} className="card block transition hover:border-brand-500 hover:shadow">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="chip">{levelRange(m.levelMin, m.levelMax)}</span>
        {m.status === "cancelled" ? (
          <span className="chip bg-red-100 text-red-700">Geannuleerd</span>
        ) : past ? (
          <span className="chip bg-stone-200 text-stone-700">Voorbij</span>
        ) : left > 0 ? (
          <span className="chip bg-ball text-brand-900">{left} {left === 1 ? "plek" : "plekken"} vrij</span>
        ) : (
          <span className="chip bg-stone-200 text-stone-700">Volzet</span>
        )}
        {badge && <span className="chip bg-amber-100 text-amber-800">{badge}</span>}
      </div>
      <h3 className="text-lg leading-snug font-bold">{m.title}</h3>
      <p className="mt-1 text-sm text-stone-600">
        📅 {formatDateTime(m.startsAt)} · {m.durationMinutes} min
      </p>
      <p className="text-sm text-stone-600">
        📍 {m.region.name} · door {m.creator.profile?.displayName || "Verwijderde gebruiker"}
      </p>
    </Link>
  );
}
