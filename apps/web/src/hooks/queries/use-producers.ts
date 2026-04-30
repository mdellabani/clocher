import { useQuery } from "@tanstack/react-query";
import { getActiveProducersByCommune, queryKeys } from "@pretou/shared";
import type { Producer } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function useProducers(communeId: string) {
  return useQuery<Producer[]>({
    queryKey: queryKeys.producers(communeId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getActiveProducersByCommune(supabase, communeId);
      if (error) throw error;
      return (data ?? []) as Producer[];
    },
    staleTime: 1000 * 60 * 15,
    enabled: !!communeId,
  });
}
