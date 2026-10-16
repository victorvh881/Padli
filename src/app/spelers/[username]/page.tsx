import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isBlockedBetween } from "@/lib/blocks";
import { DAYPARTS, WEEKDAYS } from "@/lib/time";
import { ReportForm } from "@/components/ReportForm";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { toggleBlock } from "@/app/veiligheid/actions";
import { startConversation } from "@/app/berichten/actions";

export const metadata = { title: "Spelersprofiel", robots: { index: false } };

const SIDES: Record<string, string> = { left: "Links", right: "Rechts", none: "Maakt niet uit" };

export default async function PlayerPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const viewer = await getCurrentUser();
  const p = await db.profile.findUnique({
    where: { username: decodeURIComponent(username).toLowerCase() },
    include: { level: true, region: true, user: { select: { id: true, status: true, availability: true } } },
  });
  const isStaff = viewer?.role === "admin" || viewer?.role === "moderator";
  const isSelf = viewer?.id === p?.userId;
  if (!p || !p.onboardedAt) notFound();
  if ((p.hiddenAt || p.user.status === "banned" || p.user.status === "deleted") && !isStaff && !isSelf) notFound();

  const blockedByMe = viewer ? await db.block.findUnique({ where: { blockerId_blockedId: { blockerId: viewer.id, blockedId: p.userId } } }) : null;
  if (viewer && !isSelf && !blockedByMe && (await isBlockedBetween(viewer.id, p.userId))) notFound();

  const slots = new Set(p.user.availability.map((s) => `${s.weekday}-${s.daypart}`));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {isSelf && (
        <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900">
          Zo zien andere spelers je profiel. <Link href="/profiel/bewerken" className="link">Bewerken</Link>
        </p>
      )}
      <div className="card">
        <div className="flex items-center gap-4">
          <div aria-hidden className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
            {p.displayName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">{p.displayName}</h1>
            <p className="text-stone-600">
              {p.level?.name} · 📍 {p.region?.name}
            </p>
          </div>
        </div>
        {p.bio && <p className="mt-4 whitespace-pre-line text-stone-700">{p.bio}</p>}
        {viewer && p.preferredSide && <p className="mt-2 text-sm text-stone-600">Voorkeurskant: {SIDES[p.preferredSide]}</p>}
      </div>

      {viewer ? (
        <>
          <div className="card">
            <h2 className="mb-2 font-bold">Meestal beschikbaar</h2>
            {slots.size === 0 ? (
              <p className="text-sm text-stone-600">Nog niet ingevuld.</p>
            ) : (
              <table className="text-sm">
                <thead>
                  <tr>
                    <th className="sr-only">Dagdeel</th>
                    {WEEKDAYS.map((d) => (
                      <th key={d} className="px-1 font-semibold text-stone-600">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYPARTS.map((dp) => (
                    <tr key={dp.key}>
                      <th className="pr-2 text-left font-normal text-stone-600">{dp.label}</th>
                      {WEEKDAYS.map((d, wi) => (
                        <td key={d} className="p-1">
                          <span className={`block h-7 w-7 rounded-md ${slots.has(`${wi}-${dp.key}`) ? "bg-brand-500" : "bg-stone-100"}`}>
                            <span className="sr-only">{slots.has(`${wi}-${dp.key}`) ? "beschikbaar" : "niet beschikbaar"}</span>
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!isSelf && (
            <div className="card space-y-4">
              {blockedByMe ? (
                <p className="text-stone-600">Je hebt deze speler geblokkeerd.</p>
              ) : (
                <ActionForm action={startConversation} className="space-y-2">
                  <input type="hidden" name="userId" value={p.userId} />
                  <label className="label" htmlFor="body">Bericht sturen aan {p.displayName}</label>
                  <textarea className="input" id="body" name="body" maxLength={2000} required placeholder="Hoi! Zin om eens samen te spelen?" />
                  <SubmitButton className="btn">Versturen</SubmitButton>
                </ActionForm>
              )}
              <div className="flex flex-wrap items-start gap-4 border-t border-stone-200 pt-3">
                <form action={toggleBlock}>
                  <input type="hidden" name="userId" value={p.userId} />
                  <button className="text-sm text-stone-500 hover:text-red-700">{blockedByMe ? "🔓 Deblokkeren" : "⛔ Blokkeren"}</button>
                </form>
                <ReportForm targetType="user" targetId={p.userId} label="Profiel melden" />
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card text-center">
          <p className="mb-3">Log in om beschikbaarheid te zien en een bericht te sturen.</p>
          <div className="flex justify-center gap-2">
            <Link href="/registreren" className="btn">Registreren</Link>
            <Link href={`/inloggen?next=/spelers/${p.username}`} className="btn-secondary">Inloggen</Link>
          </div>
        </div>
      )}
    </div>
  );
}
