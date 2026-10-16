export const metadata = { title: "Privacybeleid" };

export default function PrivacyPage() {
  return (
    <article className="prose-padli mx-auto max-w-2xl">
      <h1 className="mb-4 text-3xl font-extrabold">Privacybeleid</h1>
      <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Ontwerptekst: laat deze tekst nalezen voor de officiële lancering.</p>
      <h2>Welke gegevens bewaren we?</h2>
      <ul>
        <li>Je e-mailadres en wachtwoord (versleuteld), om in te loggen.</li>
        <li>Je geboortedatum, alleen om te controleren dat je minstens 16 bent. Niemand anders ziet die.</li>
        <li>Je profiel: naam, gebruikersnaam, gemeente, niveau, beschrijving en beschikbaarheid.</li>
        <li>Je oproepen, reacties, berichten, blokkades en meldingen.</li>
      </ul>
      <h2>Wie ziet wat?</h2>
      <p>
        Bezoekers zien alleen je naam, gemeente, niveau en beschrijving. Ingelogde spelers zien ook je beschikbaarheid. Je e-mailadres en
        geboortedatum zijn nooit zichtbaar voor andere spelers. Moderators zien je e-mailadres niet; alleen beheerders kunnen dat, en dat wordt
        gelogd.
      </p>
      <h2>Waar staan je gegevens?</h2>
      <p>Op servers in de Europese Unie. We verkopen je gegevens nooit en gebruiken ze niet voor reclame.</p>
      <h2>Je rechten</h2>
      <p>
        Je kunt je gegevens altijd downloaden en je account verwijderen via Instellingen. Na verwijdering worden je persoonsgegevens meteen
        geanonimiseerd. Vragen? Mail het Padli-team.
      </p>
    </article>
  );
}
