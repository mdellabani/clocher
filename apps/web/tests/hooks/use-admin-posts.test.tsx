import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@rural-community-platform/shared";
import { useAdminPosts } from "@/hooks/queries/use-admin-posts";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useAdminPosts", () => {
  it("returns hydrated paginated posts without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    const filters = { types: [], dateFilter: "" as const, page: 1, perPage: 10 };
    qc.setQueryData(queryKeys.posts.adminList("c-1", filters), {
      posts: [{ id: "p-1", title: "X", type: "annonce", is_pinned: false, created_at: "2026-04-18T00:00:00Z", profiles: { display_name: "A" } }],
      totalCount: 1,
    });
    const { result } = renderHook(() => useAdminPosts("c-1", filters), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.posts[0].id).toBe("p-1");
    expect(result.current.data?.totalCount).toBe(1);
  });

  it("is disabled with empty communeId", () => {
    const qc = new QueryClient();
    const { result } = renderHook(
      () => useAdminPosts("", { page: 1, perPage: 10 }),
      { wrapper: wrap(qc) },
    );
    expect(result.current.fetchStatus).toBe("idle");
  });
});
