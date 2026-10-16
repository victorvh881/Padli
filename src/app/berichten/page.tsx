import Link from "next/link";
import { db } from "@/lib/db";
import { requireOnboarded } from "@/lib/auth";
import { formatShort } from "@/lib/time";
import { answerRequest } from "./actions";

export const metadata = { title: "Berichten" };

export default async function MessagesPage() {
  const user = await requireOnboarded();
  const memberships = await db.conversationMember.findMany({
    where: { userId: user.id },
    include: {
      conversation: {
        include: {
          matchRequest: { select: { title: true } },
          members: { include: { user: { select: { id: true, profile: { select: { displayName: true } } } } } },
          messages: { where: { hiddenAt: null }, orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { conversation: { lastMessageAt: "desc" } },
  });

  const rows = memberships
    .filter((m) => m.conversation.messages.length > 0 || m.conversation.type === "match")
    .map((m) => {
      const c = m.conversation;
      const others = c.members.filter((x) => x.userId !== user.id);
      const title = c.type === "match" ? `🎾 ${c.matchRequest?.title ?? "Oproep"}` : others[0]?.user.profile?.displayName || "Verwijderde gebruiker";
      const last = c.messages[0];
      const unread = last && last.senderId !== user.id && (!m.lastReadAt || last.createdAt > m.lastReadAt);
      return { id: c.id, title, last, unread, isRequest: !m.accepted };
    });

  const requests = rows.filter((r) => r.isRequest);
  const chats = rows.filter((r) => !r.isRequest);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-extrabold">Berichten</h1>

      {requests.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 font-bold">Berichtverzoeken ({requests.length})</h2>
          <ul className="space-y-2">
            {requests.map((r) => (
              <li key={r.id} className="card">
                <p className="font-semibold">{r.title}</p>
                <p className="mb-3 line-clamp-2 text-sm text-stone-600">{r.last?.body}</p>
                <div className="flex gap-2">
                  <form action={answerRequest}>
                    <input type="hidden" name="conversationId" value={r.id} />
                    <input type="hidden" name="decision" value="accept" />
                    <button className="btn btn-sm">Accepteren</button>
                  </form>
                  <form action={answerRequest}>
                    <input type="hidden" name="conversationId" value={r.id} />
                    <input type="hidden" name="decision" value="ignore" />
                    <button className="btn-secondary btn-sm">Negeren</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {chats.length === 0 ? (
        <div className="card text-center text-stone-600">
          Nog geen gesprekken. Stuur een bericht vanaf een <Link href="/spelers" className="link">spelersprofiel</Link> of doe mee met een{" "}
          <Link href="/oproepen" className="link">oproep</Link>.
        </div>
      ) : (
        <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {chats.map((r) => (
            <li key={r.id}>
              <Link href={`/berichten/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50">
                <div className="min-w-0 flex-1">
                  <p className={r.unread ? "font-extrabold" : "font-semibold"}>{r.title}</p>
                  <p className="truncate text-sm text-stone-600">{r.last?.body ?? "Nog geen berichten"}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {r.last && <span className="text-xs text-stone-500">{formatShort(r.last.createdAt)}</span>}
                  {r.unread && <span className="h-2.5 w-2.5 rounded-full bg-red-600" aria-label="Ongelezen" />}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
