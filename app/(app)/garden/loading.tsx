export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <div className="mb-2 h-4 w-24 rounded-full bg-surface-sunken" />
          <div className="h-8 w-28 rounded-xl bg-surface-sunken" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex flex-col items-center rounded-blob border border-line bg-surface p-4 shadow-soft"
          >
            <div className="size-20 rounded-full bg-surface-sunken" />
            <div className="mt-3 h-4 w-16 rounded-full bg-surface-sunken" />
            <div className="mt-1.5 h-3 w-12 rounded-full bg-surface-sunken" />
          </div>
        ))}
      </div>
    </div>
  );
}
