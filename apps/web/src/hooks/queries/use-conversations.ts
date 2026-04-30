"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getConversations, queryKeys } from "@pretou/shared";

export function useConversations() {
  const supabase = createClient();
  return useInfiniteQuery({
    queryKey: queryKeys.conversations.list(),
    queryFn: ({ pageParam }) => getConversations(supabase, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
