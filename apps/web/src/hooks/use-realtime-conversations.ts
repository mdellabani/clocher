"use client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@rural-community-platform/shared";

export function useRealtimeConversations(myUserId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!myUserId) return;
    const supabase = createClient();
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: queryKeys.conversations.all });
    };
    const channel = supabase
      .channel(`user:${myUserId}:conversations`)
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
      supabase.removeChannel(channel);
    };
  }, [myUserId, qc]);
}
