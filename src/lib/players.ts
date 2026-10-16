import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { blockedIds } from "./blocks";
import { distanceKm, playerScore } from "./matching";
import type { CurrentUser } from "./auth";

type Filters = { regionSlug?: string; radiusKm?: number; levelCodes?: string[]; slots?: string[]; q?: string; limit?: number };

/** Zoekt spelers met de vaste uitsluitingen uit sectie 11.3 en berekent de matchscore. */
export async function searchPlayers(me: CurrentUser, f: Filters) {
  const profile = me.profile!;
  const [levels, regions, mySlots, blocked] = await Promise.all([
    db.level.findMany(),
    db.region.findMany({ where: { type: "municipality", isActive: true } }),
    db.availabilitySlot.findMany({ where: { userId: me.id } }),
    blockedIds(me.id),
  ]);

  const radius = f.radiusKm ?? 15;
  const origin = regions.find((r) => r.slug === f.regionSlug) ?? profile.region ?? undefined;
  const regionIds = origin ? regions.filter((r) => distanceKm(origin, r) <= radius).map((r) => r.id) : undefined;
  const levelIds = f.levelCodes?.length ? levels.filter((l) => f.levelCodes!.includes(l.code)).map((l) => l.id) : undefined;

  const slotFilter = (f.slots ?? [])
    .map((s) => s.split("-"))
    .filter(([w, p]) => /^[0-6]$/.test(w) && ["morning", "afternoon", "evening"].includes(p))
    .map(([w, p]) => ({ weekday: Number(w), daypart: p as "morning" | "afternoon" | "evening" }));

  const where: Prisma.ProfileWhereInput = {
    userId: { notIn: [me.id, ...blocked] },
    isSearchable: true,
    hiddenAt: null,
    onboardedAt: { not: null },
    user: {
      status: "active",
      ...(slotFilter.length ? { availability: { some: { OR: slotFilter } } } : {}),
    },
    ...(regionIds ? { regionId: { in: regionIds } } : {}),
    ...(levelIds ? { levelId: { in: levelIds } } : {}),
    ...(f.q ? { displayName: { contains: f.q, mode: "insensitive" } } : {}),
  };

  const rows = await db.profile.findMany({
    where,
    include: { level: true, region: true, user: { select: { lastActiveAt: true, availability: true } } },
    take: 200,
    orderBy: { updatedAt: "desc" },
  });

  const results = rows.map((p) => {
    const km = origin && p.region ? distanceKm(origin, p.region) : undefined;
    const score =
      profile.level && profile.region && p.level && p.region
        ? playerScore(
            { rank: profile.level.rank, point: profile.region, slots: mySlots },
            { rank: p.level.rank, point: p.region, slots: p.user.availability, lastActiveAt: p.user.lastActiveAt },
            radius,
          )
        : 0;
    return { p, km, score };
  });
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, f.limit ?? 60);
}
