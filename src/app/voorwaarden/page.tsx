import Link from "next/link";

export const metadata = { title: "Gebruiksvoorwaarden" };

export default function TermsPage() {
  return (
    <article className="prose-padoo mx-auto max-w-2xl">
      <h1 className="mb-4 text-3xl font-extrabold">Gebruiksvoorwaarden</h1>
      <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Ontwerptekst (versie 2026-10): laat deze tekst nalezen voor de officiële lancering.</p>
      <ul>
        <li>Padoo helpt spelers elkaar te vinden. Padoo organiseert zelf geen partijen en reserveert geen terreinen.</li>
        <li>Je bent minstens 16 jaar en geeft correcte gegevens op.</li>
        <li>
          Je volgt de <Link href="/communityregels" className="link">communityregels</Link>. Bij overtredingen kan je account geschorst of
          geblokkeerd worden.
        </li>
        <li>Je bent zelf verantwoordelijk voor de afspraken die je maakt en voor je eigen veiligheid tijdens het spelen.</li>
        <li>Je kunt je account op elk moment verwijderen.</li>
      </ul>
    </article>
  );
}
