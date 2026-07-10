import type { ReactNode } from "react";

export default function CareSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-4 shadow-soft">
      <div className="mb-2 flex items-center gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-sprout-100">
          {icon}
        </div>
        <h3 className="font-bold text-forest-800">{title}</h3>
      </div>
      <div className="text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}
