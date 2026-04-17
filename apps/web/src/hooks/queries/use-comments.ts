import { useQuery } from "@tanstack/react-query";
import { getComments, queryKeys } from "@rural-community-platform/shared";
import { createClient } from "@/lib/supabase/client";

export function useComments(postId: string) {
  return useQuery({
    queryKey: queryKeys.comments(postId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getComments(supabase, postId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!postId,
  });
}
