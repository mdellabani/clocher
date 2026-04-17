import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "@/components/skeletons/list-skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-40" />
      </div>
      <Skeleton className="h-10 w-full" />
      <ListSkeleton rows={4} />
    </div>
  );
}
