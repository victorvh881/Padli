import { db } from "@/lib/db";

export const metadata = { title: "Beheer" };

export default async function AdminHome() {
  const now = new Date();
  const d30 = new Date(Date.now() - 30 * 86400000);
  const d7 = new Date(Date.now() - 7 * 86400000);

  const [users, newUsers7, onboarded, active30, matches30, full30, openReports, levelSplit, regionSplit] = await Promise.all([
    db.user.count({ where: { status: { notIn: ["deleted"] } } }),
    db.user.count({ where: { createdAt: { gte: d7 } } }),
    db.profile.count({ where: { onboardedAt: { not: null }, bio: { not: null } } }),
    db.user.count({ where: { lastActiveAt: { gte: d30 }, status: "active" } }),
    db.matchRequest.count({ where: { createdAt: { gte: d30 } } }),
    db.matchRequest.count({ where: { createdAt: { gte: d30 }, status: "full" } }),
    db.report.count({ where: { status: { in: ["open", "in_review"] } } }),
    db.profile.groupBy({ by: ["levelId"], _count: true, where: { onboardedAt: { not: null } } }),
    db.profile.groupBy({ by: ["regionId"], _count: true, where: { onboardedAt: { not: null } }, orderBy: { _count: { regionId: "desc" } }, take: 8 }),
  ]);
  const [levels, regions] = await Promise.all([db.level.findMany(), db.region.findMany()]);
  const upcoming = await db.matchRequest.count({ where: { startsAt: { gte: now }, status: "open" } });

  const kpis = [
    ["Geregistreerde gebruikers", `${users}`, "Doel: 500 na 6 maanden"],
    ["Nieuw deze week", `${newUsers7}`, ""],
    ["Profielen volledig (met beschrijving)", users ? `${Math.round((onboarded / users) * 100)}%` : "–", "Doel: ≥ 80%"],
    ["Actief laatste 30 dagen", users ? `${Math.round((active30 / users) * 100)}%` : "–", "Doel: ≥ 40%"],
    ["Oproepen laatste 30 dagen", `${matches30}`, "Doel: ≥ 150 per maand"],
    ["Volzette oproepen (30 d)", matches30 ? `${Math.round((full30 / matches30) * 100)}%` : "–", "Doel: ≥ 50%"],
    ["Open oproepen nu", `${upcoming}`, ""],
    ["Open meldingen", `${openReports}`, ""],
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Beheer</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(([label, value, goal]) => (
          <div key={label} className="card">
            <p className="text-sm text-stone-600">{label}</p>
            <p className="text-3xl font-extrabold">{value}</p>
            {goal && <p className="text-xs text-stone-500">{goal}</p>}
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 font-bold">Spelers per niveau</h2>
          <ul className="space-y-1 text-sm">
            {levels.map((l) => (
              <li key={l.id} className="flex justify-between">
                <span>{l.name}</span>
                <strong>{levelSplit.find((s) => s.levelId === l.id)?._count ?? 0}</strong>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2 className="mb-2 font-bold">Spelers per gemeente (top 8)</h2>
          <ul className="space-y-1 text-sm">
            {regionSplit.map((s) => (
              <li key={s.regionId ?? "x"} className="flex justify-between">
                <span>{regions.find((r) => r.id === s.regionId)?.name ?? "Onbekend"}</span>
                <strong>{s._count}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
