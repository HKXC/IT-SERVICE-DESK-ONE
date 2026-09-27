export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-56 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl border bg-card" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-xl border bg-card" />
        <div className="h-72 animate-pulse rounded-xl border bg-card" />
      </div>
    </div>
  );
}
