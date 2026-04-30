import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageThread } from "@/components/message-thread";
import type { MessageRow } from "@pretou/shared";

const msg = (over: Partial<MessageRow>): MessageRow =>
  ({
    id: "1",
    conversation_id: "c",
    sender_id: "a",
    body: "Bonjour",
    created_at: "2026-04-26T10:00:00Z",
    ...over,
  }) as MessageRow;

describe("MessageThread", () => {
  it("shows empty state when there are no messages", () => {
    render(<MessageThread messages={[]} />);
    expect(screen.getByText(/pas encore de message/i)).toBeInTheDocument();
  });

  it("renders messages in order", () => {
    render(
      <MessageThread
        messages={[
          msg({ id: "1", body: "Bonjour" }),
          msg({ id: "2", body: "Salut", sender_id: "b" }),
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Bonjour");
    expect(items[1]).toHaveTextContent("Salut");
  });

  it("highlights my messages differently", () => {
    render(
      <MessageThread
        myUserId="me"
        messages={[
          msg({ id: "1", sender_id: "me", body: "Mine" }),
          msg({ id: "2", sender_id: "other", body: "Theirs" }),
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0].className).toContain("justify-end");
    expect(items[1].className).toContain("justify-start");
  });
});
