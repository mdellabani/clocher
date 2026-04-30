import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { usePosts } from "@/hooks/queries/use-posts";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("usePosts", () => {
  it("returns hydrated first page of posts without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.posts.list("c-1", { types: [], dateFilter: "" }), {
      pages: [[{ id: "p1", title: "hello" }]],
      pageParams: [null],
    });
    const { result } = renderHook(() => usePosts("c-1", { types: [], dateFilter: "" }), {
      wrapper: wrap(qc),
    });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.pages.flat()).toHaveLength(1);
    expect(result.current.data?.pages.flat()[0].id).toBe("p1");
  });

  it("differentiates cache by filter", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.posts.list("c-1", { types: [], dateFilter: "" }), {
      pages: [[{ id: "unfiltered" }]],
      pageParams: [null],
    });
    qc.setQueryData(queryKeys.posts.list("c-1", { types: ["annonce"], dateFilter: "" }), {
      pages: [[{ id: "filtered" }]],
      pageParams: [null],
    });

    const { result: r1 } = renderHook(
      () => usePosts("c-1", { types: [], dateFilter: "" }),
      { wrapper: wrap(qc) },
    );
    const { result: r2 } = renderHook(
      () => usePosts("c-1", { types: ["annonce"], dateFilter: "" }),
      { wrapper: wrap(qc) },
    );

    expect(r1.current.data?.pages.flat()[0].id).toBe("unfiltered");
    expect(r2.current.data?.pages.flat()[0].id).toBe("filtered");
  });

  it("is disabled when communeId is empty", () => {
    const qc = new QueryClient();
    const { result } = renderHook(
      () => usePosts("", { types: [], dateFilter: "" }),
      { wrapper: wrap(qc) },
    );
    expect(result.current.fetchStatus).toBe("idle");
  });
});
