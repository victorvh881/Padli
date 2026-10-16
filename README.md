# Padli

**Vind. Speel. Verbind.** Padli is een website waarop padelspelers in Leuven en omgeving medespelers van hun niveau vinden,
oproepen plaatsen en elkaar berichten sturen. Alles werkt in de browser, op gsm, tablet en computer.

Dit is de eerste versie (MVP) volgens het softwareontwerp "Padli – Softwareontwerp MVP en schaalbare versie".

## Wat zit erin?

| Onderdeel | Wat kun je doen |
| --- | --- |
| Account | Registreren met e-mail en wachtwoord (min. 16 jaar), inloggen, wachtwoord vergeten, uitloggen op alle toestellen, account verwijderen, je gegevens downloaden |
| Profiel | Korte onboarding in 3 stappen, niveautest van 4 vragen, gemeente, niveau, beschikbaarheid, beschrijving, zichtbaar in zoekresultaten aan/uit |
| Spelers zoeken | Op gemeente + straal, niveau, beschikbaarheid en naam, gesorteerd op matchscore |
| Oproepen | Plaatsen, wijzigen, annuleren, filteren, "Ik doe mee", accepteren of weigeren, automatisch accepteren, afmelden, automatisch volzet |
| Berichten | 1-op-1-gesprekken met berichtverzoeken, een groepsgesprek per oproep, ongelezen-teller |
| Veiligheid | Melden en blokkeren, telefoonnummers/e-mail/links worden geweigerd, spamrem op nieuwe gesprekken, automatisch verbergen na meerdere meldingen |
| Beheer (`/admin`) | Overzicht met KPI's, meldingen behandelen (verbergen, waarschuwen, schorsen, blokkeren), gebruikers en rollen, auditlog |
| Pagina's | Home, Over, FAQ, Communityregels, Privacy, Voorwaarden, sitemap, installeerbaar op het beginscherm (PWA) |

Bewust nog niet in deze versie (zie het ontwerp): inloggen met Google/Apple, e-maildigest van nieuwe oproepen, profielfoto's,
live berichten via WebSockets (de site ververst nu elke paar seconden), headless WordPress voor de blog.

## Techniek

Next.js 16 (React, TypeScript), Tailwind CSS, PostgreSQL met Prisma. Wachtwoorden met Argon2id, sessies in de database,
e-mail via Brevo (optioneel).

## Lokaal starten (voor ontwikkelaars)

```bash
cp .env.example .env          # vul DATABASE_URL en DIRECT_URL in
npm install
npx prisma migrate dev        # maakt de tabellen
npm run db:seed               # niveaus en gemeenten rond Leuven
npm run dev                   # http://localhost:3000
npm test                      # unit tests
```

Zonder `BREVO_API_KEY` worden nieuwe accounts meteen geactiveerd en verschijnen e-mails (zoals wachtwoordlinks) alleen in de serverlog.

## Online zetten (gratis)

1. Maak een gratis database bij [Neon](https://neon.tech) in regio **Frankfurt (EU)**. Kopieer twee verbindings-URL's:
   de "pooled" URL (`DATABASE_URL`) en de directe URL zonder `-pooler` (`DIRECT_URL`).
2. Maak een gratis account bij [Vercel](https://vercel.com) met je GitHub-account en importeer de repository `padli`.
3. Vul bij **Environment Variables** in: `DATABASE_URL`, `DIRECT_URL`, `APP_URL` (bv. `https://padli.vercel.app`),
   en voor je eigen beheerdersaccount `ADMIN_EMAIL` en `ADMIN_PASSWORD`.
4. Klik op **Deploy**. Vercel maakt de tabellen, vult niveaus en gemeenten in en zet de site online.
5. Later: koppel je eigen domein (bv. padli.be) in Vercel, zet e-mail aan met een gratis Brevo-account
   (`BREVO_API_KEY` en `EMAIL_FROM`), en laat ucll.info/cjup doorverwijzen naar het nieuwe adres.
