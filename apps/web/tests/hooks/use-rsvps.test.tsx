import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { useRsvps } from "@/hooks/queries/use-rsvps";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useRsvps", () => {
  it("derives counts + myStatus from cached rows", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.rsvps("p1"), [
      { user_id: "me", status: "going" },
      { user_id: "other1", status: "going" },
      { user_id: "other2", status: "maybe" },
    ]);
    const { result } = renderHook(() => useRsvps("p1", "me"), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.counts).toEqual({ going: 2, maybe: 1, not_going: 0 });
    expect(result.current.data?.myStatus).toBe("going");
  });

  it("is disabled with empty postId", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useRsvps("", "me"), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("is disabled with empty userId", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useRsvps("p1", ""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
