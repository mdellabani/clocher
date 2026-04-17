import { useQuery } from "@tanstack/react-query";
import { getPostsThisWeekCount, queryKeys } from "@rural-community-platform/shared";
import { createClient } from "@/lib/supabase/client";

export function usePostsThisWeek(communeId: string) {
  return useQuery({
    queryKey: queryKeys.admin.postsThisWeek(communeId),
    queryFn: async () => {
      const supabase = createClient();
      return getPostsThisWeekCount(supabase, communeId);
    },
    enabled: !!communeId,
  });
}
