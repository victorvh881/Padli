import Link from "next/link";

export const metadata = { title: "Over Padli" };

export default function AboutPage() {
  return (
    <article className="prose-padli mx-auto max-w-2xl">
      <h1 className="mb-4 text-3xl font-extrabold">Over Padli</h1>
      <p>
        Padli is een gratis platform voor beginnende en recreatieve padelspelers in Leuven en omgeving. Veel spelers spelen minder dan ze
        willen: hun vaste groep is klein, de niveaus passen niet en clubgroepen zijn vaak gesloten. Padli brengt spelers samen op niveau en
        regio, over clubs heen.
      </p>
      <h2>Wat kun je doen?</h2>
      <ul>
        <li>Een profiel maken met je niveau, gemeente en wanneer je kunt spelen.</li>
        <li>Spelers van jouw niveau in de buurt zoeken.</li>
        <li>Een oproep plaatsen als je nog spelers zoekt, of meedoen met een oproep van iemand anders.</li>
        <li>Afspreken via berichten in Padli, zonder je telefoonnummer te delen.</li>
      </ul>
      <h2>Veilig en privé</h2>
      <p>
        Andere spelers zien alleen je voornaam of bijnaam, je gemeente, je niveau en je korte beschrijving. Je e-mailadres, geboortedatum en
        telefoonnummer zijn nooit zichtbaar. Je kunt spelers blokkeren en alles melden wat niet in orde is. Lees ook onze{" "}
        <Link href="/communityregels" className="link">communityregels</Link>.
      </p>
      <p>
        <Link href="/registreren" className="btn">Doe mee</Link>
      </p>
    </article>
  );
}
