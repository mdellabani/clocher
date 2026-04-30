import { useQuery } from "@tanstack/react-query";
import { getPollByPostId, queryKeys, type Poll } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function usePoll(postId: string) {
  return useQuery<Poll | null>({
    queryKey: queryKeys.poll(postId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getPollByPostId(supabase, postId);
      if (error) throw error;
      return (data ?? null) as Poll | null;
    },
    enabled: !!postId,
  });
}
