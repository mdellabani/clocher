import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";

const captureMock = vi.fn();
(globalThis as unknown as { posthog: { capture: typeof captureMock } }).posthog = {
  capture: captureMock,
};
(window as unknown as { posthog: { capture: typeof captureMock } }).posthog = {
  capture: captureMock,
};

let mockPathname = "/app/feed";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

import { PerfTracker } from "@/components/perf-tracker";

describe("PerfTracker", () => {
  beforeEach(() => {
    captureMock.mockClear();
    mockPathname = "/app/feed";
  });

  it("does not fire on first mount", () => {
    render(<PerfTracker />);
    expect(captureMock).not.toHaveBeenCalled();
  });

  it("fires nav_timing event when pathname changes", () => {
    const { rerender } = render(<PerfTracker />);
    act(() => {
      mockPathname = "/app/events";
      rerender(<PerfTracker />);
    });
    expect(captureMock).toHaveBeenCalledWith(
      "nav_timing",
      expect.objectContaining({
        path: "/app/feed",
        durationMs: expect.any(Number),
        supabaseFetchCount: expect.any(Number),
      }),
    );
  });

  it("does not fire when pathname is unchanged between renders", () => {
    const { rerender } = render(<PerfTracker />);
    rerender(<PerfTracker />);
    rerender(<PerfTracker />);
    expect(captureMock).not.toHaveBeenCalled();
  });
});
