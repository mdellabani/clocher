import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function useProducerCount(communeId: string) {
  return useQuery<number>({
    queryKey: ["producer-count", communeId],
    queryFn: async () => {
      const supabase = createClient();
      const { count, error } = await supabase
        .from("producers")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .eq("commune_id", communeId);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 1000 * 60 * 30,
    enabled: !!communeId,
  });
}
