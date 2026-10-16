import { describe, expect, it } from "vitest";
import { containsContactInfo } from "../src/lib/text";
import { fromBrussels, toBrusselsParts, brusselsSlot } from "../src/lib/time";
import { distanceKm, matchRequestScore, playerScore, suggestLevelRank } from "../src/lib/matching";

describe("containsContactInfo", () => {
  it.each([
    "bel me op 0470 12 34 56",
    "+32 470 12 34 56",
    "mail naar jan@example.com",
    "kijk op www.mijnclub.be",
    "https://wa.me/123",
  ])("weigert %s", (t) => expect(containsContactInfo(t)).toBe(true));

  it.each(["Ik speel graag op dinsdagavond", "Niveau P200, 3 jaar ervaring", "Zaterdag 10u in Heverlee"])(
    "laat %s door",
    (t) => expect(containsContactInfo(t)).toBe(false),
  );
});

describe("tijdzone", () => {
  it("zet zomertijd om naar UTC", () => {
    expect(fromBrussels("2026-07-01", "19:30")!.toISOString()).toBe("2026-07-01T17:30:00.000Z");
  });
  it("zet wintertijd om naar UTC", () => {
    expect(fromBrussels("2026-12-01", "19:30")!.toISOString()).toBe("2026-12-01T18:30:00.000Z");
  });
  it("gaat heen en terug", () => {
    expect(toBrusselsParts(fromBrussels("2026-11-03", "08:15")!)).toEqual({ date: "2026-11-03", time: "08:15" });
  });
  it("bepaalt weekdag en dagdeel", () => {
    // 20 oktober 2026 is een dinsdag
    expect(brusselsSlot(fromBrussels("2026-10-20", "19:00")!)).toEqual({ weekday: 1, daypart: "evening" });
  });
});

describe("matching", () => {
  const leuven = { lat: 50.8798, lng: 4.7005 };
  const heverlee = { lat: 50.864, lng: 4.696 };

  it("berekent afstand", () => {
    expect(distanceKm(leuven, heverlee)).toBeGreaterThan(1);
    expect(distanceKm(leuven, heverlee)).toBeLessThan(3);
  });

  it("geeft hogere score bij zelfde niveau en beschikbaarheid", () => {
    const me = { rank: 2, point: leuven, slots: [{ weekday: 1, daypart: "evening" }] };
    const same = playerScore(me, { ...me, lastActiveAt: new Date() });
    const other = playerScore(me, { rank: 3, point: heverlee, slots: [{ weekday: 5, daypart: "morning" }], lastActiveAt: new Date() });
    expect(same).toBe(90); // zonder gedeelde terreinen (max 10) is 90 het maximum
    expect(other).toBeLessThan(same);
  });

  it("geeft beginner ↔ P100 een bonus", () => {
    const a = playerScore({ rank: 0, point: leuven, slots: [] }, { rank: 1, point: leuven, slots: [], lastActiveAt: new Date(0) });
    const b = playerScore({ rank: 2, point: leuven, slots: [] }, { rank: 3, point: leuven, slots: [], lastActiveAt: new Date(0) });
    expect(a - b).toBe(5);
  });

  it("scoort oproepen", () => {
    const now = new Date("2026-10-19T12:00:00Z");
    const s = matchRequestScore(
      { rank: 2, point: leuven, slots: [{ weekday: 1, daypart: "evening" }] },
      { minRank: 1, maxRank: 2, point: leuven, slot: { weekday: 1, daypart: "evening" }, startsAt: new Date("2026-10-20T17:00:00Z"), spotsLeft: 1 },
      15,
      now,
    );
    expect(s).toBe(95);
  });

  it("stelt een niveau voor", () => {
    expect([0, 2, 3, 5, 6, 8, 9, 12].map(suggestLevelRank)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });
});
