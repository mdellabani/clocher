import { useInfiniteQuery } from "@tanstack/react-query";
import { getEpciPosts, queryKeys } from "@pretou/shared";
import type { Post } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function useEpciPosts(epciId: string, communeIds?: string[]) {
  return useInfiniteQuery({
    queryKey: queryKeys.posts.epci(epciId, communeIds),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getEpciPosts(supabase, epciId, communeIds);
      if (error) throw error;
      return (data ?? []) as Post[];
    },
    initialPageParam: null as string | null,
    getNextPageParam: () => undefined,
    enabled: !!epciId,
  });
}
