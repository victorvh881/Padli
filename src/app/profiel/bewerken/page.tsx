import Link from "next/link";
import { requireOnboarded } from "@/lib/auth";
import { ProfileForm } from "@/components/ProfileForm";
import { logout } from "@/app/auth-actions";

export const metadata = { title: "Profiel bewerken" };

export default async function EditProfilePage() {
  const user = await requireOnboarded();
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Mijn profiel</h1>
        <div className="flex gap-2">
          <Link href={`/spelers/${user.profile!.username}`} className="btn-secondary btn-sm">Zo zien anderen je</Link>
          <Link href="/instellingen" className="btn-secondary btn-sm">Instellingen</Link>
          <form action={logout}>
            <button className="btn-secondary btn-sm">Uitloggen</button>
          </form>
        </div>
      </div>
      <ProfileForm user={user} onboarding={false} />
    </div>
  );
}
