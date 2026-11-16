"use client";

import { useFormStatus } from "react-dom";

/**
 * Submit button that disables itself while its form's Server Action runs.
 * WHY: a double-tap on a server-component form fired the action twice — for
 * "I watered it just now" that used to shrink the learned factor twice (L29).
 */
export default function PendingSubmit({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${className ?? ""} disabled:opacity-60`}>
      {children}
    </button>
  );
}
