import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

const levels = [
  { id: 1, code: "BEGINNER", name: "Complete beginner", rank: 0, description: "Nooit of enkele keren gespeeld; leert de regels en basisslagen." },
  { id: 2, code: "P100", name: "P100", rank: 1, description: "Speelt af en toe, houdt korte rally's, beperkte glasbeheersing." },
  { id: 3, code: "P200", name: "P200", rank: 2, description: "Speelt regelmatig, gebruikt de glazen, eerste lobs en volleys." },
  { id: 4, code: "P300", name: "P300", rank: 3, description: "Speelt wekelijks, constante rally's, eerste bandeja, speelt tactisch." },
];

// Gemeenten rond Leuven met een benaderd middelpunt (voor afstandsberekening).
const municipalities: [string, number, number][] = [
  ["Leuven", 50.8798, 4.7005],
  ["Heverlee", 50.864, 4.696],
  ["Kessel-Lo", 50.889, 4.729],
  ["Wilsele", 50.905, 4.699],
  ["Wijgmaal", 50.927, 4.7],
  ["Herent", 50.905, 4.672],
  ["Kortenberg", 50.889, 4.543],
  ["Bertem", 50.865, 4.628],
  ["Oud-Heverlee", 50.837, 4.663],
  ["Holsbeek", 50.921, 4.757],
  ["Rotselaar", 50.953, 4.716],
  ["Haacht", 50.977, 4.638],
  ["Lubbeek", 50.883, 4.84],
  ["Bierbeek", 50.829, 4.759],
  ["Boutersem", 50.835, 4.835],
  ["Tervuren", 50.824, 4.514],
];

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function main() {
  for (const l of levels) {
    await prisma.level.upsert({ where: { id: l.id }, update: l, create: l });
  }

  const area = await prisma.region.upsert({
    where: { slug: "leuven-en-omgeving" },
    update: {},
    create: { name: "Leuven en omgeving", slug: "leuven-en-omgeving", type: "area", lat: 50.8798, lng: 4.7005 },
  });

  for (const [i, [name, lat, lng]] of municipalities.entries()) {
    const slug = slugify(name);
    await prisma.region.upsert({
      where: { slug },
      update: { lat, lng, sortOrder: i },
      create: { name, slug, type: "municipality", lat, lng, parentId: area.id, sortOrder: i },
    });
  }

  // Optioneel: eerste beheerder aanmaken via ADMIN_EMAIL en ADMIN_PASSWORD.
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({ where: { email }, data: { role: "admin" } });
    } else {
      await prisma.user.create({
        data: {
          email,
          passwordHash: await hash(password),
          birthDate: new Date("1990-01-01"),
          role: "admin",
          status: "active",
          emailVerifiedAt: new Date(),
          termsVersion: "2026-10",
          termsAcceptedAt: new Date(),
          profile: { create: { username: "padli-team", displayName: "Padli-team", isSearchable: false } },
        },
      });
    }
    console.log(`Beheerder klaar: ${email}`);
  }

  console.log("Seed klaar.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
