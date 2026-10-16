// Regelgebaseerde matchscore 0–100 (sectie 12 van het ontwerp).

export type Slot = { weekday: number; daypart: string };
type Point = { lat: number; lng: number };

export function distanceKm(a: Point, b: Point) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function distanceScore(km: number, radiusKm: number) {
  if (km < 0.5) return 25;
  return 25 * Math.max(0, 1 - km / radiusKm);
}

function activityScore(lastActiveAt: Date, now = new Date()) {
  const days = (now.getTime() - lastActiveAt.getTime()) / 86400000;
  return days < 7 ? 5 : days < 30 ? 2 : 0;
}

const slotKey = (s: Slot) => `${s.weekday}-${s.daypart}`;

export function playerScore(
  me: { rank: number; point: Point; slots: Slot[] },
  other: { rank: number; point: Point; slots: Slot[]; lastActiveAt: Date },
  radiusKm = 15,
) {
  const diff = Math.abs(me.rank - other.rank);
  let level = 0;
  if (diff === 0) level = 40;
  else if (diff === 1) level = Math.min(me.rank, other.rank) === 0 ? 25 : 20;

  const distance = distanceScore(distanceKm(me.point, other.point), radiusKm);

  let availability = 8;
  if (me.slots.length && other.slots.length) {
    const mine = new Set(me.slots.map(slotKey));
    const shared = other.slots.filter((s) => mine.has(slotKey(s))).length;
    availability = 20 * (shared / Math.min(me.slots.length, other.slots.length));
  }

  return Math.round(level + distance + availability + activityScore(other.lastActiveAt));
}

export function matchRequestScore(
  me: { rank: number; point: Point; slots: Slot[] },
  req: { minRank: number; maxRank: number; point: Point; slot: Slot; startsAt: Date; spotsLeft: number },
  radiusKm = 15,
  now = new Date(),
) {
  let level = 0;
  if (me.rank >= req.minRank && me.rank <= req.maxRank) level = 40;
  else if (me.rank === req.minRank - 1 || me.rank === req.maxRank + 1) level = 15;

  const distance = distanceScore(distanceKm(me.point, req.point), radiusKm);

  let time = 0;
  if (me.slots.some((s) => slotKey(s) === slotKey(req.slot))) time = 20;
  else if (me.slots.some((s) => s.weekday === req.slot.weekday)) time = 8;

  const hours = (req.startsAt.getTime() - now.getTime()) / 3600000;
  const urgency = req.spotsLeft > 0 ? (hours <= 48 ? 10 : hours <= 168 ? 5 : 0) : 0;

  return Math.round(level + distance + time + urgency);
}

/** Niveau-inschatting uit 4 vragen (sectie 12.5): geeft de rank 0–3 terug. */
export function suggestLevelRank(points: number) {
  if (points <= 2) return 0;
  if (points <= 5) return 1;
  if (points <= 8) return 2;
  return 3;
}
