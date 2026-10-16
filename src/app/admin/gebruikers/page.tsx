import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/notify";
import { setRole, setUserStatus } from "../actions";

export const metadata = { title: "Gebruikers" };

export default async function UsersAdmin({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const mod = await requireStaff();
  const q = (await searchParams).q?.trim() ?? "";
  const isAdmin = mod.role === "admin";

  const users = await db.user.findMany({
    where: q
      ? {
          OR: [
            { profile: { displayName: { contains: q, mode: "insensitive" } } },
            { profile: { username: { contains: q.toLowerCase() } } },
            // Alleen beheerders zoeken op e-mailadres (sectie 14.5).
            ...(isAdmin ? [{ email: { contains: q.toLowerCase() } }] : []),
          ],
        }
      : {},
    include: { profile: { include: { level: true, region: true } }, _count: { select: { reportsReceived: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  if (isAdmin && q) await audit(mod.id, "admin_user_search", "user", undefined, { q });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-extrabold">Gebruikers</h1>
      <form className="mb-4 flex gap-2">
        <input className="input" name="q" defaultValue={q} placeholder={isAdmin ? "Naam, gebruikersnaam of e-mail" : "Naam of gebruikersnaam"} />
        <button className="btn">Zoek</button>
      </form>
      <ul className="space-y-2">
        {users.map((u) => (
          <li key={u.id} className="card space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {u.profile?.username ? (
                <Link className="link" href={`/spelers/${u.profile.username}`}>{u.profile.displayName || u.profile.username}</Link>
              ) : (
                <span>—</span>
              )}
              <span className="chip bg-stone-100 text-stone-700">{u.role}</span>
              <span className={`chip ${u.status === "active" ? "" : "bg-red-100 text-red-800"}`}>{u.status}</span>
              <span className="text-sm text-stone-600">
                {u.profile?.level?.name} · {u.profile?.region?.name} · {u._count.reportsReceived} melding(en)
              </span>
              {isAdmin && <span className="text-sm text-stone-500">{u.email}</span>}
            </div>
            {u.id !== mod.id && (
              <div className="flex flex-wrap items-end gap-2">
                <form action={setUserStatus} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="userId" value={u.id} />
                  <input className="input max-w-56 py-1.5 text-sm" name="reason" required placeholder="Reden" aria-label="Reden" />
                  {u.status === "suspended" && <button name="action" value="unsuspend" className="btn-secondary btn-sm">Schorsing opheffen</button>}
                  {u.status === "active" && <button name="action" value="suspend7" className="btn-danger btn-sm">Schorsen 7 d</button>}
                  {isAdmin && u.status !== "banned" && u.status !== "deleted" && <button name="action" value="ban" className="btn-danger btn-sm">Blokkeren</button>}
                  {isAdmin && u.status === "banned" && <button name="action" value="unban" className="btn-secondary btn-sm">Deblokkeren</button>}
                </form>
                {isAdmin && (
                  <form action={setRole} className="flex items-end gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <select name="role" defaultValue={u.role} className="input py-1.5 text-sm" aria-label="Rol">
                      <option value="player">Speler</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Beheerder</option>
                    </select>
                    <button className="btn-secondary btn-sm">Rol opslaan</button>
                  </form>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
