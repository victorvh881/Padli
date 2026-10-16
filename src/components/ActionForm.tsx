"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/action";

type Props = {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
};

/** Formulier dat een server action uitvoert en fouten of bevestigingen toont. */
export function ActionForm({ action, children, className }: Props) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className ?? "space-y-4"}>
      {state?.error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900">
          {state.ok}
        </p>
      )}
      {children}
    </form>
  );
}
