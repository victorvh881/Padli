import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { unreadCounts } from "@/lib/unread";
import { UnreadBadge } from "./UnreadBadge";

export async function Nav() {
  const user = await getCurrentUser();
  const counts = user ? await unreadCounts(user.id) : null;
  const isStaff = user?.role === "admin" || user?.role === "moderator";

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-brand-700">
            <span aria-hidden className="inline-block h-5 w-5 rounded-full bg-ball ring-2 ring-brand-600" />
            Padoo
          </Link>
          <nav className="ml-auto hidden items-center gap-5 text-sm font-semibold md:flex" aria-label="Hoofdmenu">
            <Link href="/oproepen" className="hover:text-brand-700">Oproepen</Link>
            {user ? (
              <>
                <Link href="/spelers" className="hover:text-brand-700">Spelers</Link>
                <Link href="/oproepen/nieuw" className="hover:text-brand-700">Oproep plaatsen</Link>
                <Link href="/berichten" className="relative hover:text-brand-700">
                  Berichten
                  <UnreadBadge kind="messages" initial={counts!.messages} />
                </Link>
                <Link href="/meldingen" className="relative hover:text-brand-700" aria-label="Meldingen">
                  🔔
                  <UnreadBadge kind="notifications" initial={counts!.notifications} />
                </Link>
                {isStaff && <Link href="/admin" className="hover:text-brand-700">Beheer</Link>}
                <Link href="/profiel/bewerken" className="hover:text-brand-700">Profiel</Link>
              </>
            ) : (
              <>
                <Link href="/over" className="hover:text-brand-700">Over</Link>
                <Link href="/inloggen" className="hover:text-brand-700">Inloggen</Link>
                <Link href="/registreren" className="btn btn-sm">Gratis registreren</Link>
              </>
            )}
          </nav>
          {/* Mobiel: compacte knoppen bovenaan */}
          <div className="ml-auto flex items-center gap-3 md:hidden">
            {user ? (
              <Link href="/meldingen" className="relative text-lg" aria-label="Meldingen">
                🔔
                <UnreadBadge kind="notifications" initial={counts!.notifications} />
              </Link>
            ) : (
              <>
                <Link href="/inloggen" className="text-sm font-semibold">Inloggen</Link>
                <Link href="/registreren" className="btn btn-sm">Registreren</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {user && (
        <nav
          aria-label="Snelmenu"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] text-[11px] font-semibold md:hidden"
        >
          <Tab href="/dashboard" icon="🏠" label="Home" />
          <Tab href="/oproepen" icon="🎾" label="Oproepen" />
          <Tab href="/oproepen/nieuw" icon="➕" label="Plaatsen" />
          <Tab href="/berichten" icon="💬" label="Berichten" badge={<UnreadBadge kind="messages" initial={counts!.messages} />} />
          <Tab href={isStaff ? "/admin" : "/profiel/bewerken"} icon="👤" label={isStaff ? "Beheer" : "Profiel"} />
        </nav>
      )}
    </>
  );
}

function Tab({ href, icon, label, badge }: { href: string; icon: string; label: string; badge?: React.ReactNode }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-0.5 py-2 text-stone-700">
      <span className="relative text-lg" aria-hidden>
        {icon}
        {badge}
      </span>
      {label}
    </Link>
  );
}
