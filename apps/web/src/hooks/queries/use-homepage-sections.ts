import { useQuery } from "@tanstack/react-query";
import { getHomepageSectionsByCommune, queryKeys } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function useHomepageSections(communeId: string) {
  return useQuery({
    queryKey: queryKeys.admin.homepageSections(communeId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getHomepageSectionsByCommune(supabase, communeId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!communeId,
    staleTime: 30 * 60_000,
  });
}
