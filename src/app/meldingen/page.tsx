import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatShort } from "@/lib/time";

export const metadata = { title: "Meldingen" };

async function markAllRead() {
  "use server";
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
}

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Meldingen</h1>
        {items.some((n) => !n.readAt) && (
          <form action={markAllRead}>
            <button className="btn-secondary btn-sm">Alles gelezen</button>
          </form>
        )}
      </div>
      {items.length === 0 ? (
        <p className="card text-center text-stone-600">Je hebt nog geen meldingen.</p>
      ) : (
        <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {items.map((n) => {
            const content = (
              <div className="flex gap-3 px-4 py-3">
                <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-red-600"}`} aria-hidden />
                <div>
                  <p className={n.readAt ? "" : "font-bold"}>{n.title}</p>
                  {n.body && <p className="text-sm text-stone-600">{n.body}</p>}
                  <p className="text-xs text-stone-500">{formatShort(n.createdAt)}</p>
                </div>
              </div>
            );
            return <li key={n.id}>{n.link ? <Link href={n.link} className="block hover:bg-stone-50">{content}</Link> : content}</li>;
          })}
        </ul>
      )}
    </div>
  );
}
