import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { InboxNavLink } from "@/components/inbox-nav-link";

let unread = 0;
vi.mock("@/hooks/queries/use-unread-count", () => ({
  useUnreadCount: () => ({ data: unread }),
}));
vi.mock("@/hooks/use-realtime-conversations", () => ({
  useRealtimeConversations: () => {},
}));
vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({ profile: { id: "u-1" }, loading: false, isAdmin: false, isModerator: false }),
}));

describe("InboxNavLink", () => {
  it("renders without badge when no unread", () => {
    unread = 0;
    render(<InboxNavLink className="x" />);
    expect(screen.getByRole("link", { name: /messages/i })).toBeInTheDocument();
    expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument();
  });

  it("shows count when unread > 0", () => {
    unread = 5;
    render(<InboxNavLink className="x" />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("clamps to 99+", () => {
    unread = 250;
    render(<InboxNavLink className="x" />);
    expect(screen.getByText("99+")).toBeInTheDocument();
  });
});
