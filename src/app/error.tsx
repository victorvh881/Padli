"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-md text-center">
      <h1 className="mb-2 text-2xl font-extrabold">Er ging iets mis</h1>
      <p className="mb-4 text-stone-600">Probeer het opnieuw. Blijft het mislukken, laat het ons dan weten.</p>
      <button onClick={reset} className="btn">Opnieuw proberen</button>
    </div>
  );
}
