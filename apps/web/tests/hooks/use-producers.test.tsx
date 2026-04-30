import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { useProducers } from "@/hooks/queries/use-producers";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useProducers", () => {
  it("returns hydrated producers without fetching", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.producers("c-1"), [
      { id: "p-1", name: "Ferme des tilleuls", status: "active" },
    ]);
    const { result } = renderHook(() => useProducers("c-1"), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.[0].name).toBe("Ferme des tilleuls");
  });

  it("is disabled with empty communeId", () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useProducers(""), { wrapper: wrap(qc) });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
