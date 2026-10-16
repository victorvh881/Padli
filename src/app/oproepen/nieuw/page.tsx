import { requireOnboarded } from "@/lib/auth";
import { MatchForm } from "@/components/MatchForm";

export const metadata = { title: "Oproep plaatsen" };

export default async function NewMatchPage() {
  const user = await requireOnboarded();
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-extrabold">Oproep plaatsen</h1>
      <p className="mb-6 text-stone-600">Zoek medespelers voor een partij. Spelers van het juiste niveau zien je oproep.</p>
      <MatchForm defaults={{ regionId: user.profile?.regionId, levelId: user.profile?.levelId }} />
    </div>
  );
}
