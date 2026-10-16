export const metadata = { title: "Veelgestelde vragen" };

const FAQ: [string, string][] = [
  ["Is Padli gratis?", "Ja. Een account maken en Padli gebruiken is gratis."],
  ["Moet ik lid zijn van een club?", "Nee. Padli werkt over clubs heen. Je spreekt zelf af waar je speelt."],
  [
    "Wat betekenen de niveaus?",
    "Complete beginner: je speelde nooit of een paar keer. P100: je speelt af en toe en houdt korte rally's. P200: je speelt regelmatig en gebruikt de glazen. P300: je speelt wekelijks, constant en tactisch. Twijfel je? Doe de korte niveautest bij je profiel.",
  ],
  ["Wie ziet mijn gegevens?", "Bezoekers zien je naam, gemeente, niveau en beschrijving. Ingelogde spelers zien ook wanneer je meestal kunt spelen. Je e-mailadres, geboortedatum en telefoonnummer zijn nooit zichtbaar."],
  ["Waarom mag ik geen telefoonnummer in mijn profiel zetten?", "Voor je veiligheid. Spreek eerst af via de berichten in Padli en deel je nummer pas als je de ander vertrouwt."],
  ["Hoe werkt een oproep?", "Je kiest datum, tijd, gemeente, niveau en hoeveel spelers je zoekt. Spelers reageren met 'Ik doe mee' en jij accepteert of weigert. Wie geaccepteerd is, komt in een groepsgesprek. Als alle plekken bezet zijn, staat de oproep op volzet."],
  ["Iemand gedraagt zich niet correct. Wat nu?", "Blokkeer de speler en meld het via de knop 'Melden' bij het profiel, de oproep of het bericht. We bekijken elke melding binnen 48 uur."],
  ["Hoe verwijder ik mijn account?", "Ga naar Instellingen en kies 'Mijn account verwijderen'. Daar kun je ook al je gegevens downloaden."],
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-3xl font-extrabold">Veelgestelde vragen</h1>
      <div className="space-y-2">
        {FAQ.map(([q, a]) => (
          <details key={q} className="card">
            <summary className="cursor-pointer font-semibold">{q}</summary>
            <p className="mt-2 text-stone-700">{a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
