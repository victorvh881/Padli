"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Ververst de pagina op de achtergrond, zodat nieuwe berichten verschijnen. */
export function AutoRefresh({ seconds = 8 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
