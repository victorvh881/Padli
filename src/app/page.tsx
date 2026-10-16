import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { MatchCard } from "@/components/MatchCard";

export default async function Home({ searchParams }: { searchParams: Promise<{ verwijderd?: string }> }) {
  const user = await getCurrentUser();
  if (user?.profile?.onboardedAt) redirect("/dashboard");
  const { verwijderd } = await searchParams;

  const [latest, players] = await Promise.all([
    db.matchRequest.findMany({
      where: { status: "open", hiddenAt: null, startsAt: { gte: new Date() }, creator: { status: "active" } },
      include: { region: true, levelMin: true, levelMax: true, creator: { select: { profile: { select: { displayName: true } } } } },
      orderBy: { startsAt: "asc" },
      take: 4,
    }),
    db.profile.count({ where: { onboardedAt: { not: null } } }),
  ]);

  return (
    <div className="space-y-12">
      {verwijderd && <p className="rounded-xl bg-stone-100 px-4 py-3">Je account is verwijderd. Bedankt dat je Padli gebruikte.</p>}

      <section className="-mx-4 rounded-none bg-gradient-to-br from-brand-700 to-brand-900 px-6 py-12 text-white sm:mx-0 sm:rounded-3xl sm:px-10 sm:py-16">
        <p className="mb-3 inline-block rounded-full bg-ball px-3 py-1 text-sm font-bold text-brand-900">Leuven en omgeving</p>
        <h1 className="mb-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Padel verbindt.</h1>
        <p className="mb-2 text-xl font-semibold text-brand-100">Vind. Speel. Verbind.</p>
        <p className="mb-8 max-w-xl text-lg text-brand-50">
          Vind padelspelers van jouw niveau in de buurt, plaats een oproep als je nog spelers zoekt en spreek veilig af, zonder je nummer te delen.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href={user ? "/onboarding" : "/registreren"} className="btn bg-ball text-brand-900 hover:bg-white">
            {user ? "Maak je profiel af" : "Gratis registreren"}
          </Link>
          <Link href="/oproepen" className="btn-secondary border-white/40 bg-white/10 text-white hover:bg-white/20">Bekijk oproepen</Link>
        </div>
        {players >= 20 && <p className="mt-6 text-sm text-brand-100">Al {players} spelers doen mee.</p>}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["🔎", "Vind", "Spelers en oproepen van jouw niveau, van complete beginner tot P300, in jouw gemeente."],
          ["🎾", "Speel", "Plaats in een paar klikken een oproep of doe mee met een partij die al gepland is."],
          ["💬", "Verbind", "Spreek af via berichten in Padli. Je telefoonnummer en e-mail blijven privé."],
        ].map(([icon, title, text]) => (
          <div key={title} className="card">
            <p className="mb-2 text-3xl" aria-hidden>{icon}</p>
            <h2 className="mb-1 text-lg font-bold">{title}</h2>
            <p className="text-stone-600">{text}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">Nieuwste oproepen</h2>
          <Link href="/oproepen" className="link text-sm">Alle oproepen</Link>
        </div>
        {latest.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {latest.map((m) => (
              <MatchCard key={m.id} m={m} />
            ))}
          </div>
        ) : (
          <p className="card text-stone-600">Nog geen open oproepen. Wees de eerste!</p>
        )}
      </section>

      <section className="card text-center">
        <h2 className="mb-2 text-xl font-bold">Weet je je niveau niet?</h2>
        <p className="mb-4 text-stone-600">Geen probleem. Bij het aanmaken van je profiel helpt een korte test van 4 vragen je op weg.</p>
        <Link href="/faq" className="btn-secondary">Lees de veelgestelde vragen</Link>
      </section>
    </div>
  );
}
