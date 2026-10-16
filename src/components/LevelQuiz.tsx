"use client";

import { useState } from "react";
import { suggestLevelRank } from "@/lib/matching";

const QUESTIONS = [
  { q: "Hoe vaak speel je padel?", a: [["Nog nooit of enkele keren", 0], ["Maandelijks", 1], ["Wekelijks", 2], ["Meerdere keren per week", 3]] },
  { q: "Sinds wanneer speel je?", a: [["Minder dan 3 maanden", 0], ["3 tot 12 maanden", 1], ["1 tot 3 jaar", 2], ["Langer dan 3 jaar", 3]] },
  { q: "Gebruik je de glazen bewust?", a: [["Nee", 0], ["Soms", 1], ["Vaak", 2], ["Altijd, tactisch", 3]] },
  { q: "Speel je competitie of tornooien?", a: [["Nee", 0], ["Interclub of tornooi in een lagere reeks", 2], ["Regelmatig", 3]] },
] as const;

/** Vier vragen die een niveau voorstellen (sectie 12.5). Kiest het voorstel in het niveauveld. */
export function LevelQuiz({ levels, selectId }: { levels: { id: number; name: string; rank: number }[]; selectId: string }) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null, null]);
  const done = answers.every((a) => a !== null);
  const total = answers.reduce<number>((s, a) => s + (a ?? 0), 0);
  const suggestion = done ? levels.find((l) => l.rank === suggestLevelRank(total)) : undefined;

  if (!open) {
    return (
      <button type="button" className="link text-sm" onClick={() => setOpen(true)}>
        Twijfel je? Doe de korte niveautest
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
      {QUESTIONS.map((item, qi) => (
        <fieldset key={qi}>
          <legend className="mb-1 text-sm font-semibold">{item.q}</legend>
          <div className="flex flex-wrap gap-2">
            {item.a.map(([label, pts]) => (
              <button
                type="button"
                key={label}
                onClick={() => setAnswers((prev) => prev.map((v, i) => (i === qi ? pts : v)))}
                className={`rounded-full border px-3 py-1 text-sm ${answers[qi] === pts ? "border-brand-600 bg-brand-600 text-white" : "border-stone-300 bg-white"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      {suggestion && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-3 text-sm">
          <span>
            Ons voorstel: <strong>{suggestion.name}</strong>. Jij kiest zelf je definitieve niveau.
          </span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              const el = document.getElementById(selectId) as HTMLSelectElement | null;
              if (el) el.value = String(suggestion.id);
            }}
          >
            Neem dit niveau
          </button>
        </div>
      )}
    </div>
  );
}
