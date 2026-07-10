export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="mb-2 h-4 w-20 rounded-full bg-surface-sunken" />
        <div className="h-8 w-32 rounded-xl bg-surface-sunken" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-3xl border border-line bg-surface px-4 py-4 shadow-soft"
          >
            <div className="size-11 shrink-0 rounded-2xl bg-surface-sunken" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-28 rounded-full bg-surface-sunken" />
              <div className="h-3 w-40 rounded-full bg-surface-sunken" />
            </div>
            <div className="h-7 w-12 shrink-0 rounded-full bg-surface-sunken" />
          </div>
        ))}
      </div>
    </div>
  );
}
