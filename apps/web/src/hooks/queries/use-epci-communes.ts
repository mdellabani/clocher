import { useQuery } from "@tanstack/react-query";
import { getCommunesByEpci } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function useEpciCommunes(epciId: string | null) {
  return useQuery<{ id: string; name: string }[]>({
    queryKey: ["epci-communes", epciId],
    queryFn: async () => {
      if (!epciId) return [];
      const supabase = createClient();
      const { data, error } = await getCommunesByEpci(supabase, epciId);
      if (error) throw error;
      return (data ?? []).map((c) => ({ id: c.id, name: c.name }));
    },
    enabled: !!epciId,
  });
}
