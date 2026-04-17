import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@rural-community-platform/shared";
import { usePostDetail } from "@/hooks/queries/use-post-detail";

const singleMock = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ single: singleMock }),
      }),
    }),
  }),
}));

describe("usePostDetail", () => {
  beforeEach(() => singleMock.mockReset());

  it("reads from cache when posts.detail is seeded", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.posts.detail("p1"), { id: "p1", title: "X" });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => usePostDetail("p1"), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual({ id: "p1", title: "X" }));
    expect(singleMock).not.toHaveBeenCalled();
  });

  it("fetches when cache is empty", async () => {
    singleMock.mockResolvedValue({ data: { id: "p2", title: "Fresh" }, error: null });
    const qc = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => usePostDetail("p2"), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual({ id: "p2", title: "Fresh" }));
  });
});
