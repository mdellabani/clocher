import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InboxList } from "@/components/inbox-list";
import type { InboxConversation } from "@pretou/shared";

const baseRow = (over: Partial<InboxConversation> = {}): InboxConversation =>
  ({
    id: "c1",
    post_id: "p1",
    user_a: "a",
    user_b: "b",
    user_a_last_read_at: null,
    user_b_last_read_at: null,
    last_message_at: "2026-04-26T10:00:00Z",
    last_message_preview: "Bonjour",
    last_message_sender_id: "b",
    created_at: "2026-04-26T09:00:00Z",
    counterpart: { id: "b", display_name: "Jeanne", commune_slug: "stmed" },
    post: { id: "p1", title: "Garder mon chat", type: "entraide" },
    unread: false,
    ...over,
  }) as InboxConversation;

describe("InboxList", () => {
  it("shows empty state", () => {
    render(<InboxList rows={[]} />);
    expect(screen.getByText(/aucun message/i)).toBeInTheDocument();
  });

  it("renders rows with counterpart and preview", () => {
    render(<InboxList rows={[baseRow()]} />);
    expect(screen.getByText("Jeanne")).toBeInTheDocument();
    expect(screen.getByText(/Garder mon chat/)).toBeInTheDocument();
    expect(screen.getByText("Bonjour")).toBeInTheDocument();
  });

  it("shows unread dot when unread", () => {
    render(<InboxList rows={[baseRow({ unread: true })]} />);
    expect(screen.getByLabelText("non lu")).toBeInTheDocument();
  });
});
