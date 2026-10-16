import "server-only";
import { db } from "./db";

/** Alle gebruikers die ik blokkeerde of die mij blokkeerden. */
export async function blockedIds(userId: string): Promise<string[]> {
  const rows = await db.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return [...new Set(rows.map((r) => (r.blockerId === userId ? r.blockedId : r.blockerId)))];
}

export async function isBlockedBetween(a: string, b: string) {
  const n = await db.block.count({
    where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
  });
  return n > 0;
}
