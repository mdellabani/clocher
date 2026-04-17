import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PostCardSkeleton } from "@/components/skeletons/post-card-skeleton";

describe("PostCardSkeleton", () => {
  it("renders a card-shaped outer container", () => {
    const { container } = render(<PostCardSkeleton />);
    const outer = container.firstChild as HTMLElement;
    expect(outer).not.toBeNull();
    expect(outer.className).toContain("rounded-xl");
    expect(outer.className).toContain("border");
  });

  it("contains a round avatar placeholder plus at least three text bars", () => {
    const { container } = render(<PostCardSkeleton />);
    const pulses = container.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThanOrEqual(4);
    const hasCircle = Array.from(pulses).some((el) =>
      (el as HTMLElement).className.includes("rounded-full"),
    );
    expect(hasCircle).toBe(true);
  });
});
