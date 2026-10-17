// Controleert of elke Neon-dienst werkt: `npm run neon:check`.
// Leest de variabelen uit .env.local (ingevuld door `neon deploy`).
import { neon } from "@neondatabase/serverless";
import { deleteFile, getFile, putFile } from "../src/lib/storage";

const env = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`${k} ontbreekt in .env.local`);
  return v;
};

async function check(name: string, fn: () => Promise<string>) {
  try {
    console.log(`OK    ${name}: ${await fn()}`);
    return true;
  } catch (e) {
    console.log(`FOUT  ${name}: ${(e as Error).message}`);
    return false;
  }
}

const sql = neon(env("DATABASE_URL_UNPOOLED"));

const results = [
  await check("Postgres", async () => {
    const [row] = await sql`select current_database() as db, version() as v,
      (select count(*) from information_schema.tables where table_schema = 'public') as tables`;
    return `${row.db}, ${String(row.v).split(" ").slice(0, 2).join(" ")}, ${row.tables} tabellen in public`;
  }),

  await check("Object Storage", async () => {
    const key = `neon-check/${Date.now()}.txt`;
    await putFile(key, "hallo padoo", "text/plain");
    const back = new TextDecoder().decode((await getFile(key)) ?? new Uint8Array());
    await deleteFile(key);
    if (back !== "hallo padoo") throw new Error(`teruggelezen inhoud klopt niet: ${back}`);
    return "bestand geschreven, gelezen en verwijderd in bucket uploads";
  }),

  await check("Functions", async () => {
    const res = await fetch(env("NEON_FUNCTION_HELLO_BASE_URL"));
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return `hello antwoordt "${text}"`;
  }),

  await check("Auth", async () => {
    const base = env("NEON_AUTH_BASE_URL");
    const email = `neon-check-${Date.now()}@example.com`;
    const password = "Test-wachtwoord-123";
    const post = (path: string, body: object) =>
      fetch(`${base}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify(body),
      });
    try {
      const up = await post("/sign-up/email", { email, password, name: "Neon check" });
      if (!up.ok) throw new Error(`registreren: HTTP ${up.status} ${await up.text()}`);
      const inRes = await post("/sign-in/email", { email, password });
      const data = (await inRes.json()) as { token?: string };
      if (!inRes.ok || !data.token) throw new Error(`inloggen: HTTP ${inRes.status}`);
      return "testaccount geregistreerd en ingelogd (sessie ontvangen)";
    } finally {
      // Testaccount opruimen; sessies en accounts verdwijnen mee.
      await sql`delete from neon_auth."user" where email = ${email}`;
    }
  }),
];

if (results.includes(false)) process.exit(1);
