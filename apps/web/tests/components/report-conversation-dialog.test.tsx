import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReportConversationDialog } from "@/components/report-conversation-dialog";

const reportSpy =
  vi.fn<(args: { conversationId: string; reason?: string }) => Promise<void>>(
    async () => {},
  );
vi.mock("@/app/app/messages/actions", () => ({
  reportConversationAction: (args: { conversationId: string; reason?: string }) =>
    reportSpy(args),
}));

beforeEach(() => {
  reportSpy.mockClear();
});

describe("ReportConversationDialog", () => {
  it("submits with no reason", async () => {
    render(<ReportConversationDialog conversationId="c1" />);
    fireEvent.click(screen.getByRole("button", { name: /signaler/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /signaler/i })[1]);
    await waitFor(() =>
      expect(reportSpy).toHaveBeenCalledWith({
        conversationId: "c1",
        reason: undefined,
      }),
    );
    expect(screen.getByText(/conversation a été signalée/i)).toBeInTheDocument();
  });

  it("submits with trimmed reason", async () => {
    render(<ReportConversationDialog conversationId="c1" />);
    fireEvent.click(screen.getByRole("button", { name: /signaler/i }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "  spam  " },
    });
    fireEvent.click(screen.getAllByRole("button", { name: /signaler/i })[1]);
    await waitFor(() =>
      expect(reportSpy).toHaveBeenCalledWith({
        conversationId: "c1",
        reason: "spam",
      }),
    );
  });
});
