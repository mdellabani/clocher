import { useQuery } from "@tanstack/react-query";
import { getCommune, queryKeys } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function useCommuneAdmin(communeId: string) {
  return useQuery({
    queryKey: queryKeys.commune(communeId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getCommune(supabase, communeId);
      if (error) throw error;
      return data;
    },
    enabled: !!communeId,
    staleTime: 30 * 60_000,
  });
}
