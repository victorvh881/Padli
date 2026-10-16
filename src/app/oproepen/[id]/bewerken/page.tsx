import { notFound } from "next/navigation";
import { requireOnboarded } from "@/lib/auth";
import { db } from "@/lib/db";
import { MatchForm } from "@/components/MatchForm";

export const metadata = { title: "Oproep wijzigen" };

export default async function EditMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireOnboarded();
  const match = await db.matchRequest.findUnique({ where: { id } }).catch(() => null);
  if (!match || match.creatorId !== user.id) notFound();
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-extrabold">Oproep wijzigen</h1>
      <MatchForm match={match} />
    </div>
  );
}
