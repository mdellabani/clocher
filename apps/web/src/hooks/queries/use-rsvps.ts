import { useQuery } from "@tanstack/react-query";
import { getRsvps, queryKeys } from "@pretou/shared";
import type { RsvpStatus } from "@pretou/shared";
import { createClient } from "@/lib/supabase/client";

type RsvpRow = { user_id: string; status: RsvpStatus };
type Derived = {
  counts: { going: number; maybe: number; not_going: number };
  myStatus: RsvpStatus | null;
  rows: RsvpRow[];
};

export function useRsvps(postId: string, userId: string) {
  return useQuery<RsvpRow[], Error, Derived>({
    queryKey: queryKeys.rsvps(postId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await getRsvps(supabase, postId);
      if (error) throw error;
      return (data ?? []) as RsvpRow[];
    },
    enabled: !!postId && !!userId,
    select: (rows) => ({
      rows,
      counts: {
        going: rows.filter((r) => r.status === "going").length,
        maybe: rows.filter((r) => r.status === "maybe").length,
        not_going: rows.filter((r) => r.status === "not_going").length,
      },
      myStatus: (rows.find((r) => r.user_id === userId)?.status ?? null) as RsvpStatus | null,
    }),
  });
}
