import { useQuery } from "@tanstack/react-query";
import { getPendingUsers, queryKeys } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function usePendingUsers(communeId: string) {
  return useQuery({
    queryKey: queryKeys.admin.pendingUsers(communeId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getPendingUsers(supabase, communeId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!communeId,
    staleTime: 60_000,
  });
}
