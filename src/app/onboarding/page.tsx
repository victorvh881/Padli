import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ProfileForm } from "@/components/ProfileForm";

export const metadata = { title: "Welkom" };

export default async function OnboardingPage() {
  const user = await requireUser();
  if (user.profile?.onboardedAt) redirect("/dashboard");
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-extrabold">Welkom bij Padli! 🎾</h1>
      <p className="mb-6 text-stone-600">Nog drie korte stappen, dan zoeken we spelers van jouw niveau.</p>
      <ProfileForm user={user} onboarding />
    </div>
  );
}
