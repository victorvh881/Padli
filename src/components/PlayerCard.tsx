import Link from "next/link";

export function PlayerCard({
  p,
  score,
  km,
}: {
  p: { username: string; displayName: string; bio: string | null; level: { name: string } | null; region: { name: string } | null };
  score?: number;
  km?: number;
}) {
  return (
    <Link href={`/spelers/${p.username}`} className="card flex gap-3 transition hover:border-brand-500 hover:shadow">
      <div aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
        {p.displayName.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold">{p.displayName}</h3>
          {p.level && <span className="chip">{p.level.name}</span>}
          {score !== undefined && score >= 70 && <span className="chip bg-ball text-brand-900">Goede match</span>}
        </div>
        <p className="text-sm text-stone-600">
          📍 {p.region?.name ?? "Onbekend"}
          {km !== undefined && ` · ${km < 1 ? "< 1" : Math.round(km)} km`}
        </p>
        {p.bio && <p className="mt-1 line-clamp-2 text-sm text-stone-700">{p.bio}</p>}
      </div>
    </Link>
  );
}
