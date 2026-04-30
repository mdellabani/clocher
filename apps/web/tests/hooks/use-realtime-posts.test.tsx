import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { useRealtimePosts } from "@/hooks/use-realtime-posts";

type Listener = (payload: { eventType: string; new?: unknown; old?: unknown }) => void;
let capturedListener: Listener | null = null;
const removeChannel = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: () => ({
      on: (_evt: string, _filter: unknown, cb: Listener) => {
        capturedListener = cb;
        return { subscribe: () => ({ unsubscribe: vi.fn() }) };
      },
    }),
    removeChannel,
  }),
}));

function wrap(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const FILTERS = { types: [], dateFilter: "" as const };

function seedInfinite(qc: QueryClient, communeId: string, posts: { id: string }[]) {
  qc.setQueryData(queryKeys.posts.list(communeId, FILTERS), {
    pages: [posts],
    pageParams: [null],
  });
}

describe("useRealtimePosts", () => {
  it("prepends INSERT payload to the cached first page", () => {
    capturedListener = null;
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    seedInfinite(qc, "c-1", [{ id: "p-old" }]);

    renderHook(() => useRealtimePosts("c-1", FILTERS), { wrapper: wrap(qc) });
    expect(capturedListener).not.toBeNull();

    act(() => {
      capturedListener!({ eventType: "INSERT", new: { id: "p-new", is_pinned: false, is_hidden: false } });
    });

    const cached = qc.getQueryData(queryKeys.posts.list("c-1", FILTERS)) as {
      pages: { id: string }[][];
    };
    expect(cached.pages[0][0].id).toBe("p-new");
    expect(cached.pages[0][1].id).toBe("p-old");
  });

  it("patches UPDATE payload in place", () => {
    capturedListener = null;
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    seedInfinite(qc, "c-1", [{ id: "p-1", body: "old" } as unknown as { id: string }]);
    renderHook(() => useRealtimePosts("c-1", FILTERS), { wrapper: wrap(qc) });

    act(() => {
      capturedListener!({ eventType: "UPDATE", new: { id: "p-1", body: "new", is_pinned: false } });
    });

    const cached = qc.getQueryData(queryKeys.posts.list("c-1", FILTERS)) as {
      pages: { id: string; body?: string }[][];
    };
    expect(cached.pages[0][0].body).toBe("new");
  });

  it("removes DELETE payload from cache", () => {
    capturedListener = null;
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    seedInfinite(qc, "c-1", [{ id: "p-1" }, { id: "p-2" }]);
    renderHook(() => useRealtimePosts("c-1", FILTERS), { wrapper: wrap(qc) });

    act(() => {
      capturedListener!({ eventType: "DELETE", old: { id: "p-1" } });
    });

    const cached = qc.getQueryData(queryKeys.posts.list("c-1", FILTERS)) as {
      pages: { id: string }[][];
    };
    expect(cached.pages[0]).toHaveLength(1);
    expect(cached.pages[0][0].id).toBe("p-2");
  });

  it("calls removeChannel on unmount", () => {
    const qc = new QueryClient();
    const { unmount } = renderHook(() => useRealtimePosts("c-1", FILTERS), { wrapper: wrap(qc) });
    removeChannel.mockClear();
    unmount();
    expect(removeChannel).toHaveBeenCalledTimes(1);
  });

  it("does nothing when communeId is empty", () => {
    capturedListener = null;
    const qc = new QueryClient();
    renderHook(() => useRealtimePosts("", FILTERS), { wrapper: wrap(qc) });
    expect(capturedListener).toBeNull();
  });
});
