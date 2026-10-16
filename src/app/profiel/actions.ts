"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Daypart } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, str, type ActionState } from "@/lib/action";
import { CONTACT_WARNING, containsContactInfo } from "@/lib/text";

const schema = z.object({
  displayName: z.string().min(2, "Je naam moet minstens 2 tekens hebben.").max(40, "Je naam mag maximaal 40 tekens hebben."),
  username: z
    .string()
    .min(3, "Je gebruikersnaam moet minstens 3 tekens hebben.")
    .max(24, "Je gebruikersnaam mag maximaal 24 tekens hebben.")
    .regex(/^[a-z0-9-]+$/, "Gebruik in je gebruikersnaam alleen kleine letters, cijfers en streepjes."),
  regionId: z.uuid("Kies je gemeente."),
  levelId: z.coerce.number().int().min(1, "Kies je niveau."),
  bio: z.string().max(300, "Je beschrijving mag maximaal 300 tekens hebben."),
  preferredSide: z.enum(["", "left", "right", "none"]),
});

export async function saveProfile(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = schema.safeParse({
    displayName: str(form, "displayName"),
    username: str(form, "username").toLowerCase(),
    regionId: str(form, "regionId"),
    levelId: str(form, "levelId") || 0,
    bio: str(form, "bio"),
    preferredSide: str(form, "preferredSide"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const d = parsed.data;

  if (containsContactInfo(d.displayName) || containsContactInfo(d.bio)) return fail(CONTACT_WARNING);

  const taken = await db.profile.findFirst({ where: { username: d.username, NOT: { userId: user.id } } });
  if (taken) return fail("Deze gebruikersnaam is al bezet. Kies een andere.");

  const region = await db.region.findFirst({ where: { id: d.regionId, isActive: true } });
  const level = await db.level.findUnique({ where: { id: d.levelId } });
  if (!region || !level) return fail("Kies een geldige gemeente en een geldig niveau.");

  const slots = form
    .getAll("slot")
    .map(String)
    .map((s) => s.split("-"))
    .filter(([w, p]) => /^[0-6]$/.test(w) && ["morning", "afternoon", "evening"].includes(p))
    .map(([w, p]) => ({ userId: user.id, weekday: Number(w), daypart: p as Daypart }));

  const firstTime = !user.profile?.onboardedAt;
  await db.$transaction([
    db.profile.update({
      where: { userId: user.id },
      data: {
        displayName: d.displayName,
        username: d.username,
        regionId: region.id,
        levelId: level.id,
        bio: d.bio || null,
        preferredSide: d.preferredSide || null,
        isSearchable: firstTime ? true : form.get("isSearchable") === "on",
        onboardedAt: user.profile?.onboardedAt ?? new Date(),
      },
    }),
    db.availabilitySlot.deleteMany({ where: { userId: user.id } }),
    db.availabilitySlot.createMany({ data: slots, skipDuplicates: true }),
  ]);

  revalidatePath("/", "layout");
  if (firstTime) redirect("/dashboard?welkom=1");
  return { ok: "Je profiel is opgeslagen." };
}
