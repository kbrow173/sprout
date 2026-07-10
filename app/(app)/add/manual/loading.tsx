export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-16 rounded-full bg-surface-sunken" />
      <div className="mt-4">
        <div className="mb-2 h-4 w-16 rounded-full bg-surface-sunken" />
        <div className="h-11 w-full rounded-full bg-surface-sunken" />
      </div>
      <div className="mt-3 space-y-1.5 rounded-3xl border border-line bg-surface p-2 shadow-soft">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
            <div className="size-10 shrink-0 rounded-full bg-surface-sunken" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-3.5 w-28 rounded-full bg-surface-sunken" />
              <div className="h-3 w-20 rounded-full bg-surface-sunken" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
