import { useQuery } from "@tanstack/react-query";
import { getPendingProducers, queryKeys } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function usePendingProducers(communeId: string) {
  return useQuery({
    queryKey: queryKeys.admin.pendingProducers(communeId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getPendingProducers(supabase, communeId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!communeId,
    staleTime: 60_000,
  });
}
