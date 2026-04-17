import { useQuery } from "@tanstack/react-query";
import { getAuditLog, queryKeys } from "@rural-community-platform/shared";
import { createClient } from "@/lib/supabase/client";

export function useAuditLog(communeId: string, limit = 50) {
  return useQuery({
    queryKey: queryKeys.audit(communeId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getAuditLog(supabase, communeId, limit);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!communeId,
    staleTime: 30_000,
  });
}
