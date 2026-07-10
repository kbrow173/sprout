import type { ReactNode } from "react";

/**
 * Consistent screen header. `eyebrow` is a small kicker line, `title` the big
 * display heading, and `action` an optional right-aligned control.
 */
export default function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-end justify-between gap-3">
      <div>
        {eyebrow ? (
          <p className="mb-1 text-sm font-semibold text-sprout-600">{eyebrow}</p>
        ) : null}
        <h1 className="text-3xl font-bold text-forest-800">{title}</h1>
      </div>
      {action}
    </header>
  );
}
