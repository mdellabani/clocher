import { useQuery } from "@tanstack/react-query";
import { getCommuneMembers, queryKeys } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

export function useCommuneMembers(communeId: string) {
  return useQuery({
    queryKey: queryKeys.admin.members(communeId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getCommuneMembers(supabase, communeId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!communeId,
  });
}
