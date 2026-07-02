/** /forum/[topicId] loading state — topic card + reply skeletons. */
import Skeleton from '@/components/Skeleton';

export default function TopicLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <Skeleton className="h-4 w-16" />

      <div className="mt-4 rounded-card border border-border bg-white p-5 md:p-6">
        <div className="flex gap-3 sm:gap-4">
          <div className="flex flex-col items-center gap-1">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-4 w-5" />
            <Skeleton className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-card border border-border bg-white p-4">
            <div className="flex gap-3">
              <div className="flex flex-col items-center gap-1">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-3 w-4" />
                <Skeleton className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
