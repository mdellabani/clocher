import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { usePoll } from "@/hooks/queries/use-poll";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("usePoll", () => {
  it("returns hydrated poll without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    const poll = { id: "poll1", question: "?", poll_type: "vote" as const, allow_multiple: false, poll_options: [], post_id: "p1", created_at: "" };
    qc.setQueryData(queryKeys.poll("p1"), poll);
    const { result } = renderHook(() => usePoll("p1"), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBe(poll));
  });

  it("is disabled with empty postId", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => usePoll(""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
