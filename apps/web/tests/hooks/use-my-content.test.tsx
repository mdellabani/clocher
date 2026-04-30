import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { useMyPosts } from "@/hooks/queries/use-my-posts";
import { useMyRsvps } from "@/hooks/queries/use-my-rsvps";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useMyPosts", () => {
  it("returns hydrated posts without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.me.posts("u-1"), [{ id: "p-1", title: "Hello" }]);
    const { result } = renderHook(() => useMyPosts("u-1"), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.[0].id).toBe("p-1");
  });
  it("is disabled on empty userId", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useMyPosts(""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useMyRsvps", () => {
  it("returns hydrated rsvps without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.me.rsvps("u-1"), [{ status: "going", posts: { id: "p-1", title: "Fête" } }]);
    const { result } = renderHook(() => useMyRsvps("u-1"), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.[0].status).toBe("going");
  });
  it("is disabled on empty userId", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useMyRsvps(""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
