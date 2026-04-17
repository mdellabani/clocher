import { useQuery } from "@tanstack/react-query";
import { getProfile, queryKeys } from "@rural-community-platform/shared";
import { createClient } from "@/lib/supabase/client";

export function useProfile(userId: string) {
  return useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getProfile(supabase, userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}
