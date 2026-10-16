import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireOnboarded } from "@/lib/auth";
import { isUuid } from "@/lib/text";
import { formatShort } from "@/lib/time";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ReportForm } from "@/components/ReportForm";
import { answerRequest, sendMessage } from "../actions";

export const metadata = { title: "Gesprek" };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireOnboarded();
  if (!isUuid(id)) notFound();
  const conv = await db.conversation.findUnique({
    where: { id },
    include: {
      matchRequest: { select: { id: true, title: true } },
      members: { include: { user: { select: { id: true, profile: { select: { displayName: true, username: true } } } } } },
      messages: { orderBy: { createdAt: "asc" }, take: 300, include: { sender: { select: { profile: { select: { displayName: true } } } } } },
    },
  });
  const me = conv?.members.find((m) => m.userId === user.id);
  if (!conv || !me) notFound();

  await db.conversationMember.update({
    where: { conversationId_userId: { conversationId: id, userId: user.id } },
    data: { lastReadAt: new Date() },
  });

  const others = conv.members.filter((m) => m.userId !== user.id);
  const other = others[0]?.user.profile;

  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      <AutoRefresh />
      <div className="mb-3 flex items-center gap-3">
        <Link href="/berichten" className="text-sm text-stone-600 hover:underline">← Berichten</Link>
      </div>
      <h1 className="mb-1 text-xl font-extrabold">
        {conv.type === "match" ? (
          <Link href={`/oproepen/${conv.matchRequest?.id}`} className="hover:underline">🎾 {conv.matchRequest?.title ?? "Oproep"}</Link>
        ) : other ? (
          <Link href={`/spelers/${other.username}`} className="hover:underline">{other.displayName}</Link>
        ) : (
          "Verwijderde gebruiker"
        )}
      </h1>
      {conv.type === "match" && (
        <p className="mb-3 text-sm text-stone-600">Met: {conv.members.map((m) => m.user.profile?.displayName).join(", ")}</p>
      )}

      {!me.accepted && (
        <div className="card mb-3 flex flex-wrap items-center justify-between gap-2 bg-amber-50">
          <p className="text-sm">Dit is een berichtverzoek. Antwoord of accepteer om verder te praten.</p>
          <div className="flex gap-2">
            <form action={answerRequest}>
              <input type="hidden" name="conversationId" value={id} />
              <input type="hidden" name="decision" value="accept" />
              <button className="btn btn-sm">Accepteren</button>
            </form>
            <form action={answerRequest}>
              <input type="hidden" name="conversationId" value={id} />
              <input type="hidden" name="decision" value="ignore" />
              <button className="btn-secondary btn-sm">Negeren</button>
            </form>
          </div>
        </div>
      )}

      <ol className="mb-4 space-y-2">
        {conv.messages.map((m) => {
          const mine = m.senderId === user.id;
          return (
            <li key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${mine ? "bg-brand-600 text-white" : "border border-stone-200 bg-white"}`}>
                {!mine && conv.type === "match" && <p className="text-xs font-bold text-brand-700">{m.sender?.profile?.displayName ?? "Verwijderde gebruiker"}</p>}
                <p className="break-words whitespace-pre-line">{m.hiddenAt ? <em className="opacity-70">Dit bericht is verborgen door de moderatie.</em> : m.body}</p>
              </div>
              <div className="flex items-center gap-3 px-1 text-[11px] text-stone-500">
                {formatShort(m.createdAt)}
                {!mine && !m.hiddenAt && <ReportForm targetType="message" targetId={m.id} label="Melden" />}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="sticky bottom-16 rounded-2xl border border-stone-200 bg-white p-2 shadow md:bottom-2">
        <ActionForm action={sendMessage} className="flex items-end gap-2">
          <input type="hidden" name="conversationId" value={id} />
          <label htmlFor="body" className="sr-only">Bericht</label>
          <textarea id="body" name="body" required maxLength={2000} rows={1} className="input min-h-11 flex-1 resize-y" placeholder="Schrijf een bericht…" />
          <SubmitButton className="btn">Stuur</SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
