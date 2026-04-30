import { useQuery } from "@tanstack/react-query";
import { getPinnedPosts, queryKeys } from "@pretou/shared";
import type { Post } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function usePinnedPosts(communeId: string) {
  return useQuery<Post[]>({
    queryKey: queryKeys.posts.pinned(communeId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getPinnedPosts(supabase, communeId);
      if (error) throw error;
      return (data ?? []) as Post[];
    },
    enabled: !!communeId,
  });
}
