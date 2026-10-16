import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isUuid } from "@/lib/text";
import { formatDateTime } from "@/lib/time";
import { isBlockedBetween } from "@/lib/blocks";
import { levelRange } from "@/components/MatchCard";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { ReportForm } from "@/components/ReportForm";
import { cancelMatch, joinMatch, respondToParticipant, withdrawFromMatch } from "../actions";

async function load(id: string) {
  if (!isUuid(id)) return null;
  return db.matchRequest.findUnique({
    where: { id },
    include: {
      region: true,
      levelMin: true,
      levelMax: true,
      creator: { select: { id: true, status: true, profile: { select: { displayName: true, username: true } } } },
      participants: { include: { user: { select: { id: true, profile: { select: { displayName: true, username: true, level: true } } } } }, orderBy: { createdAt: "asc" } },
      conversation: { select: { id: true } },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const m = await load((await params).id);
  if (!m || m.hiddenAt) return { title: "Oproep" };
  const desc = `${levelRange(m.levelMin, m.levelMax)} · ${formatDateTime(m.startsAt)} · ${m.region.name}`;
  return { title: m.title, description: desc, openGraph: { title: m.title, description: desc } };
}

export default async function MatchPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nieuw?: string }> }) {
  const { id } = await params;
  const { nieuw } = await searchParams;
  const [m, user] = await Promise.all([load(id), getCurrentUser()]);
  if (!m) notFound();
  const isOrganizer = user?.id === m.creatorId;
  const isStaff = user?.role === "admin" || user?.role === "moderator";
  if ((m.hiddenAt || m.creator.status === "banned") && !isOrganizer && !isStaff) notFound();
  if (user && !isOrganizer && (await isBlockedBetween(user.id, m.creatorId))) notFound();

  const mine = m.participants.find((p) => p.userId === user?.id);
  const accepted = m.participants.filter((p) => p.status === "accepted");
  const pending = m.participants.filter((p) => p.status === "pending");
  const left = m.spotsNeeded - m.filledSpots;
  const past = m.startsAt < new Date();
  const canSeeConversation = m.conversation && (isOrganizer || mine?.status === "accepted");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/oproepen" className="text-sm text-stone-600 hover:underline">← Alle oproepen</Link>

      {nieuw && (
        <p className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-brand-900">
          Je oproep staat online. Je krijgt een melding zodra iemand wil meedoen.
        </p>
      )}
      {m.hiddenAt && <p className="rounded-xl bg-amber-50 px-3 py-2 text-amber-900">Deze oproep is verborgen na meldingen en wordt bekeken door een moderator.</p>}

      <article className="card space-y-3">
        <div className="flex flex-wrap gap-2">
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
          {m.autoAccept && <span className="chip bg-sky-100 text-sky-800">Direct meedoen</span>}
        </div>
        <h1 className="text-2xl font-extrabold">{m.title}</h1>
        <dl className="grid gap-1 text-stone-700">
          <div>📅 <dt className="sr-only">Wanneer</dt><dd className="inline">{formatDateTime(m.startsAt)} · {m.durationMinutes} minuten</dd></div>
          <div>
            📍 <dt className="sr-only">Waar</dt>
            <dd className="inline">
              {m.region.name}
              {user ? (m.locationText ? ` · ${m.locationText}` : "") : " · log in om de club te zien"}
            </dd>
          </div>
          <div>
            👤 <dt className="sr-only">Organisator</dt>
            <dd className="inline">
              Georganiseerd door{" "}
              {m.creator.profile?.username ? (
                <Link className="link" href={`/spelers/${m.creator.profile.username}`}>{m.creator.profile.displayName}</Link>
              ) : (
                "Verwijderde gebruiker"
              )}
            </dd>
          </div>
        </dl>
        {m.description && <p className="whitespace-pre-line text-stone-700">{m.description}</p>}

        {user && accepted.length > 0 && (
          <div>
            <h2 className="mb-1 font-bold">Doen mee ({accepted.length}/{m.spotsNeeded})</h2>
            <ul className="flex flex-wrap gap-2">
              {accepted.map((p) => (
                <li key={p.userId}>
                  <Link href={`/spelers/${p.user.profile?.username}`} className="chip bg-stone-100 text-stone-800">
                    {p.user.profile?.displayName} · {p.user.profile?.level?.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>

      {/* Acties voor bezoekers en spelers */}
      {!user && (
        <div className="card text-center">
          <p className="mb-3">Wil je meedoen? Maak gratis een account of log in.</p>
          <div className="flex justify-center gap-2">
            <Link href="/registreren" className="btn">Registreren</Link>
            <Link href={`/inloggen?next=/oproepen/${m.id}`} className="btn-secondary">Inloggen</Link>
          </div>
        </div>
      )}

      {user && !isOrganizer && m.status !== "cancelled" && !past && (
        <div className="card">
          {!mine || mine.status === "withdrawn" ? (
            m.status === "open" ? (
              <ActionForm action={joinMatch} className="space-y-3">
                <input type="hidden" name="id" value={m.id} />
                <label className="label" htmlFor="message">Kort bericht aan de organisator (optioneel)</label>
                <textarea className="input" id="message" name="message" maxLength={300} placeholder="Bv. Ik speel P200 en kan zeker om 19 u." />
                <SubmitButton className="btn w-full sm:w-auto">🎾 Ik doe mee</SubmitButton>
              </ActionForm>
            ) : (
              <p className="text-stone-600">Deze oproep is volzet.</p>
            )
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p>
                {mine.status === "pending" && "Je reactie is verstuurd. De organisator beslist."}
                {mine.status === "accepted" && "Je doet mee! 🎉"}
                {mine.status === "rejected" && "De organisator heeft je deze keer niet gekozen."}
              </p>
              <div className="flex gap-2">
                {canSeeConversation && <Link href={`/berichten/${m.conversation!.id}`} className="btn btn-sm">Groepsgesprek</Link>}
                {(mine.status === "pending" || mine.status === "accepted") && (
                  <form action={withdrawFromMatch}>
                    <input type="hidden" name="id" value={m.id} />
                    <button className="btn-secondary btn-sm">Afmelden</button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {isOrganizer && (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Jouw oproep</h2>
            <div className="flex gap-2">
              {canSeeConversation && <Link href={`/berichten/${m.conversation!.id}`} className="btn btn-sm">Groepsgesprek</Link>}
              {m.status !== "cancelled" && !past && (
                <>
                  <Link href={`/oproepen/${m.id}/bewerken`} className="btn-secondary btn-sm">Wijzigen</Link>
                  <form action={cancelMatch}>
                    <input type="hidden" name="id" value={m.id} />
                    <button className="btn-danger btn-sm">Annuleren</button>
                  </form>
                </>
              )}
            </div>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">Reacties ({pending.length})</h3>
            {pending.length === 0 ? (
              <p className="text-sm text-stone-600">Nog geen nieuwe reacties.</p>
            ) : (
              <ul className="space-y-2">
                {pending.map((p) => (
                  <li key={p.userId} className="rounded-xl border border-stone-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link href={`/spelers/${p.user.profile?.username}`} className="link">
                        {p.user.profile?.displayName} · {p.user.profile?.level?.name}
                      </Link>
                      {m.status === "open" && (
                        <div className="flex gap-2">
                          <form action={respondToParticipant}>
                            <input type="hidden" name="id" value={m.id} />
                            <input type="hidden" name="userId" value={p.userId} />
                            <input type="hidden" name="decision" value="accept" />
                            <button className="btn btn-sm">Accepteren</button>
                          </form>
                          <form action={respondToParticipant}>
                            <input type="hidden" name="id" value={m.id} />
                            <input type="hidden" name="userId" value={p.userId} />
                            <input type="hidden" name="decision" value="reject" />
                            <button className="btn-secondary btn-sm">Weigeren</button>
                          </form>
                        </div>
                      )}
                    </div>
                    {p.message && <p className="mt-1 text-sm text-stone-700">“{p.message}”</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {user && !isOrganizer && <ReportForm targetType="match_request" targetId={m.id} label="Oproep melden" />}
    </div>
  );
}
