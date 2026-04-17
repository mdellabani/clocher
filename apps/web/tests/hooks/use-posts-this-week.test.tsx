import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, beforeEach, describe, it, expect } from "vitest";
import { usePostsThisWeek } from "@/hooks/queries/use-posts-this-week";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("usePostsThisWeek", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hydrates cached data from query client", async () => {
    const queryClient = new QueryClient();

    queryClient.setQueryData(["admin", "posts-this-week", "c-1"], 7);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => usePostsThisWeek("c-1"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toBe(7);
    });
  });

  it("disables query when communeId is empty", () => {
    const { result } = renderHook(() => usePostsThisWeek(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.status).toBe("pending");
  });
});
