/** /forum loading state — header + tab + topic-row skeletons. */
import Skeleton from '@/components/Skeleton';

export default function ForumLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-11 w-full sm:w-36" />
      </div>

      <div className="mt-6 flex gap-8 border-b border-border pb-3">
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-4 w-12" />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-card border border-border bg-white p-4">
            <div className="flex gap-3 sm:gap-4">
              <div className="flex flex-col items-center gap-1">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-4 w-5" />
                <Skeleton className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-2 py-0.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
