import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, beforeEach, describe, it, expect } from "vitest";
import { useCommuneAdmin } from "@/hooks/queries/use-commune-admin";

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

describe("useCommuneAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hydrates cached data from query client", async () => {
    const queryClient = new QueryClient();
    const testCommune = { id: "c-1", slug: "x", invite_code: "ABC" };

    queryClient.setQueryData(["commune", "c-1"], testCommune);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCommuneAdmin("c-1"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data?.invite_code).toBe("ABC");
    });
  });

  it("disables query when communeId is empty", () => {
    const { result } = renderHook(() => useCommuneAdmin(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.status).toBe("pending");
  });
});
