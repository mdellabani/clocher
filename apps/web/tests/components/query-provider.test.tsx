import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useQueryClient } from "@tanstack/react-query";
import { QueryProvider } from "@/components/providers/query-provider";

function Consumer() {
  const client = useQueryClient();
  return <div data-testid="stale">{String(client.getDefaultOptions().queries?.staleTime)}</div>;
}

describe("QueryProvider", () => {
  it("exposes a QueryClient to its children", () => {
    render(
      <QueryProvider>
        <Consumer />
      </QueryProvider>,
    );
    // makeQueryClient default is 5 minutes in ms.
    expect(screen.getByTestId("stale").textContent).toBe(String(1000 * 60 * 5));
  });

  it("renders children", () => {
    render(
      <QueryProvider>
        <span>child-content</span>
      </QueryProvider>,
    );
    expect(screen.getByText("child-content")).toBeInTheDocument();
  });
});
