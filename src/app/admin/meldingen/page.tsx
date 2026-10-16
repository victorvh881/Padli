import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { formatShort } from "@/lib/time";
import { handleReport } from "../actions";

export const metadata = { title: "Meldingen behandelen" };

const REASON: Record<string, string> = {
  spam: "Spam",
  harassment: "Intimidatie",
  inappropriate: "Ongepast",
  fake_profile: "Nepprofiel",
  underage: "Minderjarig",
  no_show: "No-show",
  other: "Andere",
};
const TYPE: Record<string, string> = { user: "Profiel", match_request: "Oproep", message: "Bericht" };

async function preview(type: string, id: string) {
  if (type === "message") {
    const m = await db.message.findUnique({ where: { id } });
    return m ? { text: m.body, link: undefined, hidden: !!m.hiddenAt } : null;
  }
  if (type === "match_request") {
    const m = await db.matchRequest.findUnique({ where: { id } });
    return m ? { text: `${m.title}\n${m.description ?? ""}`, link: `/oproepen/${id}`, hidden: !!m.hiddenAt } : null;
  }
  const p = await db.profile.findUnique({ where: { userId: id } });
  return p ? { text: `${p.displayName}\n${p.bio ?? ""}`, link: `/spelers/${p.username}`, hidden: !!p.hiddenAt } : null;
}

export default async function ReportsQueue() {
  const mod = await requireStaff();
  const reports = await db.report.findMany({
    where: { status: { in: ["open", "in_review"] } },
    orderBy: [{ severity: "desc" }, { createdAt: "asc" }],
    take: 50,
    include: { targetUser: { select: { status: true, profile: { select: { displayName: true, username: true } } } } },
  });
  const previews = await Promise.all(reports.map((r) => preview(r.targetType, r.targetId)));
  const priorCounts = await Promise.all(
    reports.map((r) => (r.targetUserId ? db.report.count({ where: { targetUserId: r.targetUserId } }) : Promise.resolve(0))),
  );

  return (
    <div>
      <h1 className="mb-4 text-2xl font-extrabold">Meldingen ({reports.length})</h1>
      {reports.length === 0 && <p className="card text-stone-600">Geen open meldingen. 🎉</p>}
      <ul className="space-y-3">
        {reports.map((r, i) => {
          const pv = previews[i];
          return (
            <li key={r.id} className="card space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={`chip ${r.severity === 3 ? "bg-red-100 text-red-800" : r.severity === 2 ? "bg-amber-100 text-amber-800" : ""}`}>Ernst {r.severity}</span>
                <span className="chip bg-stone-100 text-stone-700">{TYPE[r.targetType]}</span>
                <span className="font-semibold">{REASON[r.reason]}</span>
                <span className="text-stone-500">{formatShort(r.createdAt)}</span>
                {pv?.hidden && <span className="chip bg-stone-200 text-stone-700">Automatisch verborgen</span>}
              </div>
              <p className="text-sm">
                Over:{" "}
                {r.targetUser?.profile ? (
                  <Link className="link" href={`/spelers/${r.targetUser.profile.username}`}>{r.targetUser.profile.displayName}</Link>
                ) : (
                  "onbekend"
                )}{" "}
                · {priorCounts[i]} melding(en) in totaal · status {r.targetUser?.status}
              </p>
              {pv && (
                <blockquote className="rounded-lg bg-stone-50 p-3 text-sm whitespace-pre-line text-stone-700">
                  {pv.text}
                  {pv.link && <> <Link href={pv.link} className="link">Bekijk</Link></>}
                </blockquote>
              )}
              {r.details && <p className="text-sm text-stone-600">Toelichting melder: “{r.details}”</p>}
              <form action={handleReport} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="reportId" value={r.id} />
                <div className="min-w-48 flex-1">
                  <label className="label" htmlFor={`reason-${r.id}`}>Reden (verplicht)</label>
                  <input className="input" id={`reason-${r.id}`} name="reason" required placeholder="Waarom deze beslissing?" />
                </div>
                <button name="action" value="dismiss" className="btn-secondary btn-sm">Geen overtreding</button>
                <button name="action" value="hide" className="btn-secondary btn-sm">Verbergen</button>
                <button name="action" value="warn" className="btn-secondary btn-sm">Verbergen + waarschuwen</button>
                <button name="action" value="suspend7" className="btn-danger btn-sm">Schorsen 7 d</button>
                <button name="action" value="suspend30" className="btn-danger btn-sm">Schorsen 30 d</button>
                {mod.role === "admin" && <button name="action" value="ban" className="btn-danger btn-sm">Permanent blokkeren</button>}
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
