import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeedSkeleton } from "@/components/skeletons/feed-skeleton";

describe("FeedSkeleton", () => {
  it("renders exactly three post-card skeletons", () => {
    const { container } = render(<FeedSkeleton />);
    const cards = container.querySelectorAll("[data-testid='post-card-skeleton']");
    expect(cards.length).toBe(3);
  });

  it("renders a header row with a title placeholder and a button placeholder", () => {
    const { container } = render(<FeedSkeleton />);
    const headerRow = container.querySelector("[data-testid='feed-skeleton-header']");
    expect(headerRow).not.toBeNull();
    expect((headerRow as HTMLElement).className).toContain("flex");
    expect(headerRow!.querySelectorAll(".animate-pulse").length).toBeGreaterThanOrEqual(2);
  });

  it("renders a scope-toggle placeholder row and a filters-bar placeholder", () => {
    render(<FeedSkeleton />);
    expect(screen.getByTestId("feed-skeleton-scope")).toBeInTheDocument();
    expect(screen.getByTestId("feed-skeleton-filters")).toBeInTheDocument();
  });
});
