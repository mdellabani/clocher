import { useQuery } from "@tanstack/react-query";
import { getMyRsvps, queryKeys } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function useMyRsvps(userId: string) {
  return useQuery({
    queryKey: queryKeys.me.rsvps(userId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getMyRsvps(supabase, userId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}
