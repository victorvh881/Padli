import "server-only";
import { cache } from "react";
import { db } from "./db";

export const getLevels = cache(() => db.level.findMany({ orderBy: { rank: "asc" } }));

/** Actieve gemeenten (de regio's waaruit spelers kiezen). */
export const getRegions = cache(() =>
  db.region.findMany({ where: { isActive: true, type: "municipality" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
);
