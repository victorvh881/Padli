import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-md text-center">
      <h1 className="mb-2 text-2xl font-extrabold">Niet gevonden</h1>
      <p className="mb-4 text-stone-600">Deze pagina bestaat niet (meer).</p>
      <Link href="/" className="btn">Naar de startpagina</Link>
    </div>
  );
}
