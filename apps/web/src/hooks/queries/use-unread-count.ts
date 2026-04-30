"use client";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getConversations, queryKeys } from "@pretou/shared";

export function useUnreadCount() {
  const supabase = createClient();
  return useQuery({
    queryKey: queryKeys.conversations.unreadCount,
    queryFn: async () => {
      const { rows } = await getConversations(supabase);
      return rows.filter((r) => r.unread).length;
    },
  });
}
