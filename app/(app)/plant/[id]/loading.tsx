export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-16 rounded-full bg-surface-sunken" />
      <div className="mt-4 flex flex-col items-center">
        <div className="size-24 rounded-full bg-surface-sunken" />
        <div className="mt-4 h-7 w-36 rounded-xl bg-surface-sunken" />
        <div className="mt-2 h-4 w-28 rounded-full bg-surface-sunken" />
      </div>
      <div className="mt-6 space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-3xl border border-line bg-surface px-4 py-4 shadow-soft">
            <div className="h-4 w-20 rounded-full bg-surface-sunken" />
            <div className="mt-2 h-3 w-full rounded-full bg-surface-sunken" />
            <div className="mt-1.5 h-3 w-2/3 rounded-full bg-surface-sunken" />
          </div>
        ))}
      </div>
    </div>
  );
}
