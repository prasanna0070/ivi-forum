import Skeleton from '@/components/Skeleton';

/** Skeleton state for /directory while members load from Firestore. Mirrors the
 *  ISB flat-card geometry (6px radius, hairline border) used by MemberCard. */
export default function DirectoryLoading() {
  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-6">
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="mt-3 h-4 w-80 max-w-full" />
        </header>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-11 w-full rounded-input sm:max-w-sm" />
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-14 rounded-input md:h-9" />
            ))}
          </div>
        </div>

        <Skeleton className="mt-5 h-4 w-40" />

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-card border border-border bg-white p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <Skeleton className="h-14 w-14 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="mt-2 h-3 w-full" />
                  <Skeleton className="mt-1.5 h-3 w-1/2" />
                </div>
              </div>
              <div className="mt-4 flex gap-1.5">
                <Skeleton className="h-5 w-16 rounded-input" />
                <Skeleton className="h-5 w-20 rounded-input" />
                <Skeleton className="h-5 w-14 rounded-input" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
