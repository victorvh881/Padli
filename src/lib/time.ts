// Tijdzone-hulpjes: de database bewaart UTC, de site toont Europe/Brussels.

export const TZ = "Europe/Brussels";

/** Offset van Brussel t.o.v. UTC in minuten op een gegeven moment. */
function brusselsOffsetMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** Zet "2026-10-20" + "19:30" (Brusselse tijd) om naar een UTC-Date. */
export function fromBrussels(date: string, time: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m || !t) return null;
  const guess = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +t[1], +t[2]));
  const offset = brusselsOffsetMinutes(guess);
  const result = new Date(guess.getTime() - offset * 60000);
  // Corrigeer rond de overgang naar zomer-/wintertijd.
  const offset2 = brusselsOffsetMinutes(result);
  return offset2 === offset ? result : new Date(guess.getTime() - offset2 * 60000);
}

/** Datum en tijd in Brussel als { date: "YYYY-MM-DD", time: "HH:MM" } (voor formulieren). */
export function toBrusselsParts(d: Date) {
  const s = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
  const [date, time] = s.split(" ");
  return { date, time };
}

export function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("nl-BE", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatShort(d: Date) {
  return new Intl.DateTimeFormat("nl-BE", { timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
}

/** Weekdag (0 = maandag) en dagdeel van een moment in Brussel. */
export function brusselsSlot(d: Date): { weekday: number; daypart: "morning" | "afternoon" | "evening" } {
  const { time } = toBrusselsParts(d);
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(d);
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(wd);
  const hour = Number(time.slice(0, 2));
  return { weekday, daypart: hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening" };
}

export const WEEKDAYS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
export const DAYPARTS = [
  { key: "morning", label: "Ochtend" },
  { key: "afternoon", label: "Middag" },
  { key: "evening", label: "Avond" },
] as const;
