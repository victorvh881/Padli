"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** Toont het aantal ongelezen berichten of meldingen en ververst elke 20 seconden. */
export function UnreadBadge({ kind, initial }: { kind: "messages" | "notifications"; initial: number }) {
  const [count, setCount] = useState(initial);
  const pathname = usePathname();
  useEffect(() => {
    const tick = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/unread", { cache: "no-store" });
        if (res.ok) setCount((await res.json())[kind] ?? 0);
      } catch {}
    };
    // Meteen na elke paginawissel (bv. na het lezen van een gesprek) en daarna elke 20 seconden.
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, [kind, pathname]);
  if (!count) return null;
  return (
    <span className="absolute -top-1 -right-2 min-w-5 rounded-full bg-red-600 px-1.5 text-center text-[11px] leading-5 font-bold text-white">
      {count > 99 ? "99+" : count}
      <span className="sr-only"> ongelezen</span>
    </span>
  );
}
