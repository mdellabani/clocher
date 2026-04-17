import { Skeleton } from "@/components/ui/skeleton";
import { PostCardSkeleton } from "@/components/skeletons/post-card-skeleton";

export function FeedSkeleton() {
  return (
    <div className="space-y-4">
      <div data-testid="feed-skeleton-header" className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      <div data-testid="feed-skeleton-scope" className="flex gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-32" />
      </div>

      <Skeleton data-testid="feed-skeleton-filters" className="h-10 w-full" />

      <div className="space-y-4">
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    </div>
  );
}
