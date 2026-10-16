import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const matches = await db.matchRequest.findMany({
    where: { status: "open", hiddenAt: null, startsAt: { gte: new Date() } },
    select: { id: true, updatedAt: true },
    take: 1000,
  });
  return [
    ...["", "/oproepen", "/over", "/faq", "/communityregels", "/privacy", "/voorwaarden"].map((p) => ({ url: `${base}${p}` })),
    ...matches.map((m) => ({ url: `${base}/oproepen/${m.id}`, lastModified: m.updatedAt })),
  ];
}
