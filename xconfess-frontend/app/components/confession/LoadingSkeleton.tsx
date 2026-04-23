export const SkeletonCard = () => (
  <div
    role="status"
    aria-label="loading"
    className="luxury-panel animate-pulse rounded-[30px] p-6"
  >
    {/* Author skeleton */}
    <div className="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-[var(--skeleton)]" />
        <div className="h-3 w-24 rounded bg-[var(--skeleton)]" />
      </div>
      <div className="h-2 w-16 rounded bg-[var(--skeleton)]" />
    </div>

    {/* Content skeleton */}
    <div className="mb-4 space-y-3">
      <div className="h-4 w-24 rounded-full bg-[var(--accent-soft)]" />
      <div className="h-6 w-full rounded bg-[var(--skeleton)]" />
      <div className="h-6 w-full rounded bg-[var(--skeleton)]" />
      <div className="h-6 w-3/4 rounded bg-[var(--skeleton)]" />
    </div>

    {/* Actions skeleton */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-10 w-20 rounded-full bg-[var(--skeleton)]" />
        <div className="h-10 w-20 rounded-full bg-[var(--skeleton)]" />
      </div>
      <div className="flex gap-2">
        <div className="h-10 w-20 rounded-full bg-[var(--skeleton)]" />
        <div className="h-10 w-20 rounded-full bg-[var(--skeleton)]" />
      </div>
    </div>
  </div>
);
