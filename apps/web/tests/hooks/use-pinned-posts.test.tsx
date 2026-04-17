import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@rural-community-platform/shared";
import { usePinnedPosts } from "@/hooks/queries/use-pinned-posts";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              or: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
            }),
          }),
        }),
      }),
    }),
  }),
}));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("usePinnedPosts", () => {
  it("returns hydrated pinned posts without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.posts.pinned("c-1"), [
      { id: "p1", title: "Annonce importante", is_pinned: true },
    ]);
    const { result } = renderHook(() => usePinnedPosts("c-1"), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].id).toBe("p1");
  });

  it("is disabled with empty communeId", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => usePinnedPosts(""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
