export default function GlobalLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] p-4 dark:bg-[#0B1220]" aria-busy="true" aria-label="Loading">
      <div className="w-full max-w-2xl space-y-3">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
