import Link from "next/link";
import { requireStaff } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  return (
    <div>
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Beheer">
        <Link href="/admin" className="btn-secondary btn-sm">Overzicht</Link>
        <Link href="/admin/meldingen" className="btn-secondary btn-sm">Meldingen</Link>
        <Link href="/admin/gebruikers" className="btn-secondary btn-sm">Gebruikers</Link>
      </nav>
      {children}
    </div>
  );
}
