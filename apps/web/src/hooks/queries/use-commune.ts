import { useQuery } from "@tanstack/react-query";
import { getCommune, queryKeys } from "@rural-community-platform/shared";
import { createClient } from "@/lib/supabase/client";

export function useCommune(communeId: string) {
  return useQuery({
    queryKey: queryKeys.commune(communeId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getCommune(supabase, communeId);
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 30,
    enabled: !!communeId,
  });
}
