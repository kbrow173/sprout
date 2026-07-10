/**
 * Today's loading skeleton — shown instantly on nav while getDueTasks()
 * round-trips to Supabase, instead of a frozen blank screen (the app
 * "feeling unreactive" was largely this: force-dynamic pages with nothing
 * shown until the full server response resolved).
 */
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <div className="mb-2 h-4 w-28 rounded-full bg-surface-sunken" />
          <div className="h-8 w-32 rounded-xl bg-surface-sunken" />
        </div>
      </div>
      <div className="space-y-2.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-3xl border border-line bg-surface px-4 py-3 shadow-soft"
          >
            <div className="size-12 shrink-0 rounded-2xl bg-surface-sunken" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-24 rounded-full bg-surface-sunken" />
              <div className="h-3 w-16 rounded-full bg-surface-sunken" />
            </div>
            <div className="size-10 shrink-0 rounded-full bg-surface-sunken" />
          </div>
        ))}
      </div>
    </div>
  );
}
