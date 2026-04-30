import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { supabase } from "@/lib/supabase";

export function useRealtimeConversations(myUserId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!myUserId) return;
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: queryKeys.conversations.all });
    };
    const channel = supabase
      .channel(`user:${myUserId}:conversations:${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `user_a=eq.${myUserId}`,
        },
        invalidate,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `user_b=eq.${myUserId}`,
        },
        invalidate,
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [myUserId, qc]);
}
