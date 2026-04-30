import { useQuery } from "@tanstack/react-query";
import { getConversations, queryKeys } from "@pretou/shared";
import { supabase } from "@/lib/supabase";

export function useUnreadCount(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.conversations.unreadCount,
    queryFn: async () => {
      const { rows } = await getConversations(supabase);
      return rows.filter((r) => r.unread).length;
    },
    enabled,
  });
}
