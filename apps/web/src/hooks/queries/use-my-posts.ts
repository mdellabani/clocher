import { useQuery } from "@tanstack/react-query";
import { getMyPosts, queryKeys } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function useMyPosts(userId: string) {
  return useQuery({
    queryKey: queryKeys.me.posts(userId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getMyPosts(supabase, userId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}
