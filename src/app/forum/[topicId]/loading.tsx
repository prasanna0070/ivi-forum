/** /forum/[topicId] loading state — topic card + reply skeletons. */
import Card from '@/components/Card';
import Skeleton from '@/components/Skeleton';

export default function TopicLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Skeleton className="h-4 w-16" />

      <Card className="mt-4 p-6">
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-1">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-4 w-5" />
            <Skeleton className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </Card>

      <div className="mt-8 flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4">
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
          </Card>
        ))}
      </div>
    </main>
  );
}
