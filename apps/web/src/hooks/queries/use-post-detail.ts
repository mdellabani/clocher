import { useQuery } from "@tanstack/react-query";
import { getPostById, queryKeys } from "@rural-community-platform/shared";
import { createClient } from "@/lib/supabase/client";

export function usePostDetail(postId: string) {
  return useQuery({
    queryKey: queryKeys.posts.detail(postId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getPostById(supabase, postId);
      if (error) throw error;
      return data;
    },
    enabled: !!postId,
  });
}
