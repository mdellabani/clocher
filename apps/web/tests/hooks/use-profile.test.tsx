import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@rural-community-platform/shared";
import { useProfile } from "@/hooks/queries/use-profile";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: new Error("should not be called when hydrated") }),
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

describe("useProfile", () => {
  it("returns hydrated profile data without calling Supabase", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    const userId = "u-1";
    qc.setQueryData(queryKeys.profile(userId), {
      id: userId,
      commune_id: "c-1",
      role: "admin",
      status: "active",
      display_name: "Marie",
      communes: { id: "c-1", name: "Saint-Martin" },
    });

    const { result } = renderHook(() => useProfile(userId), { wrapper: wrap(qc) });

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.id).toBe(userId);
    expect(result.current.data?.communes?.name).toBe("Saint-Martin");
  });

  it("is disabled when userId is empty (no fetch attempted)", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useProfile(""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
