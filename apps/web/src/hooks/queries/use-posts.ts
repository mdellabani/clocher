import { useInfiniteQuery } from "@tanstack/react-query";
import { getPostsPaginated, queryKeys } from "@pretou/shared";
import type { Post, PostListFilters } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

const PAGE_SIZE = 20;

export function usePosts(communeId: string, filters: PostListFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.posts.list(communeId, filters),
    queryFn: async ({ pageParam }) => {
      const supabase = createClient();
      const { data, error } = await getPostsPaginated(
        supabase,
        communeId,
        pageParam,
        PAGE_SIZE,
        filters,
      );
      if (error) throw error;
      return (data ?? []) as Post[];
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return lastPage[lastPage.length - 1].created_at;
    },
    enabled: !!communeId,
  });
}
