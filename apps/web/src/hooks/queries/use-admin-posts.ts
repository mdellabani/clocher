import { useQuery } from "@tanstack/react-query";
import { getAdminPostsPaginated, queryKeys, type AdminPostFilters } from "@rural-community-platform/shared";
import { createClient } from "@/lib/supabase/client";

export function useAdminPosts(communeId: string, filters: AdminPostFilters) {
  return useQuery({
    queryKey: queryKeys.posts.adminList(communeId, filters),
    queryFn: async () => {
      const supabase = createClient();
      return getAdminPostsPaginated(supabase, communeId, filters);
    },
    enabled: !!communeId,
  });
}
