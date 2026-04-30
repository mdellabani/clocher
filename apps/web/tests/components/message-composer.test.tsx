import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { MessageComposer } from "@/components/message-composer";

vi.mock("@/app/app/messages/actions", () => ({
  sendMessageAction: vi.fn(async () => ({})),
}));

function withQuery(ui: ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

describe("MessageComposer", () => {
  it("disables send when empty", () => {
    render(withQuery(<MessageComposer conversationId="c1" />));
    expect(screen.getByRole("button", { name: /envoyer/i })).toBeDisabled();
  });

  it("enables send when body is non-empty", () => {
    render(withQuery(<MessageComposer conversationId="c1" />));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Bonjour" } });
    expect(screen.getByRole("button", { name: /envoyer/i })).toBeEnabled();
  });

  it("disables send when only whitespace", () => {
    render(withQuery(<MessageComposer conversationId="c1" />));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "   " } });
    expect(screen.getByRole("button", { name: /envoyer/i })).toBeDisabled();
  });
});
