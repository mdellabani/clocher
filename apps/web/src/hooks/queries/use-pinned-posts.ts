import { useQuery } from "@tanstack/react-query";
import { getPinnedPosts, queryKeys } from "@rural-community-platform/shared";
import type { Post } from "@rural-community-platform/shared";
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
