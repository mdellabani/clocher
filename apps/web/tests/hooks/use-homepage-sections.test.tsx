import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, beforeEach, describe, it, expect } from "vitest";
import { useHomepageSections } from "@/hooks/queries/use-homepage-sections";

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

describe("useHomepageSections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hydrates cached data from query client", async () => {
    const queryClient = new QueryClient();
    const testSections = [
      { id: "s-1", section_type: "hero", visible: true, sort_order: 0, content: {} },
    ];

    queryClient.setQueryData(["admin", "homepage-sections", "c-1"], testSections);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useHomepageSections("c-1"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(testSections);
    });
  });

  it("disables query when communeId is empty", () => {
    const { result } = renderHook(() => useHomepageSections(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.status).toBe("pending");
  });
});
