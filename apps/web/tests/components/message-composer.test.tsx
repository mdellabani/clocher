import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MessageComposer } from "@/components/message-composer";

vi.mock("@/app/app/messages/actions", () => ({
  sendMessageAction: vi.fn(async () => ({})),
}));

describe("MessageComposer", () => {
  it("disables send when empty", () => {
    render(<MessageComposer conversationId="c1" />);
    expect(screen.getByRole("button", { name: /envoyer/i })).toBeDisabled();
  });

  it("enables send when body is non-empty", () => {
    render(<MessageComposer conversationId="c1" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Bonjour" } });
    expect(screen.getByRole("button", { name: /envoyer/i })).toBeEnabled();
  });

  it("disables send when only whitespace", () => {
    render(<MessageComposer conversationId="c1" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "   " } });
    expect(screen.getByRole("button", { name: /envoyer/i })).toBeDisabled();
  });
});
