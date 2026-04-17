import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "@/components/ui/skeleton";

describe("Skeleton", () => {
  it("renders a div with the pulsing class", () => {
    const { container } = render(<Skeleton />);
    const div = container.firstChild as HTMLElement;
    expect(div).not.toBeNull();
    expect(div.className).toContain("animate-pulse");
  });

  it("merges consumer className over defaults", () => {
    const { container } = render(<Skeleton className="h-10 w-40" />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain("h-10");
    expect(div.className).toContain("w-40");
    expect(div.className).toContain("animate-pulse");
  });
});
