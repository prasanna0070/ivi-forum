/** /forum loading state — header + tab + topic-row skeletons. */
import Card from '@/components/Card';
import Skeleton from '@/components/Skeleton';

export default function ForumLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      <div className="mt-6 flex gap-6 border-b border-neutral-200 pb-2">
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-4 w-12" />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex gap-4">
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
          </Card>
        ))}
      </div>
    </main>
  );
}
