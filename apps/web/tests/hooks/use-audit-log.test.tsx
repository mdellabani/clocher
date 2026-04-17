import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, beforeEach, describe, it, expect } from "vitest";
import { useAuditLog } from "@/hooks/queries/use-audit-log";

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

describe("useAuditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hydrates cached data from query client", async () => {
    const queryClient = new QueryClient();
    const testLog = [{ id: "a-1", action: "post_hidden" }];

    queryClient.setQueryData(["audit", "c-1"], testLog);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useAuditLog("c-1"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(testLog);
    });
  });

  it("disables query when communeId is empty", () => {
    const { result } = renderHook(() => useAuditLog(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.status).toBe("pending");
  });
});
