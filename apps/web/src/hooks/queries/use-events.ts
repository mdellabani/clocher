import { useQuery } from "@tanstack/react-query";
import { getEventsByCommune, queryKeys } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function useEvents(communeId: string) {
  return useQuery({
    queryKey: queryKeys.events(communeId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getEventsByCommune(supabase, communeId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!communeId,
  });
}
