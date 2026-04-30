import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { useEpciPosts } from "@/hooks/queries/use-epci-posts";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useEpciPosts", () => {
  it("returns hydrated EPCI posts without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.posts.epci("e-1"), {
      pages: [[{ id: "p1" }]],
      pageParams: [null],
    });
    const { result } = renderHook(() => useEpciPosts("e-1"), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.pages.flat()).toHaveLength(1);
  });

  it("scopes cache by optional communeIds filter", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.posts.epci("e-1"), { pages: [[{ id: "all" }]], pageParams: [null] });
    qc.setQueryData(queryKeys.posts.epci("e-1", ["c-1"]), {
      pages: [[{ id: "filtered" }]],
      pageParams: [null],
    });
    const { result: r1 } = renderHook(() => useEpciPosts("e-1"), { wrapper: wrap(qc) });
    const { result: r2 } = renderHook(() => useEpciPosts("e-1", ["c-1"]), { wrapper: wrap(qc) });
    expect(r1.current.data?.pages.flat()[0].id).toBe("all");
    expect(r2.current.data?.pages.flat()[0].id).toBe("filtered");
  });

  it("is disabled when epciId is empty", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useEpciPosts(""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
