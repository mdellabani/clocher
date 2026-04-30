import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { useEvents } from "@/hooks/queries/use-events";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useEvents", () => {
  it("returns hydrated events without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.events("c-1"), [
      { id: "e-1", title: "Fête du village", type: "evenement" },
    ]);
    const { result } = renderHook(() => useEvents("c-1"), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.[0].id).toBe("e-1");
  });

  it("is disabled with empty communeId", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useEvents(""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
