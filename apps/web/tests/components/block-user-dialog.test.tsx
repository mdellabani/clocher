import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BlockUserDialog } from "@/components/block-user-dialog";

const pushSpy = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushSpy }),
}));

const blockSpy = vi.fn<(id: string) => Promise<void>>(async () => {});
vi.mock("@/app/app/messages/actions", () => ({
  blockUserAction: (id: string) => blockSpy(id),
}));

beforeEach(() => {
  pushSpy.mockClear();
  blockSpy.mockClear();
});

describe("BlockUserDialog", () => {
  it("opens dialog on click and confirms block", async () => {
    render(<BlockUserDialog blockedId="user-x" />);
    fireEvent.click(screen.getByRole("button", { name: /bloquer/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /bloquer/i })[1]);
    await waitFor(() => expect(blockSpy).toHaveBeenCalledWith("user-x"));
    await waitFor(() => expect(pushSpy).toHaveBeenCalledWith("/app/messages"));
  });

  it("closes on Annuler without blocking", () => {
    render(<BlockUserDialog blockedId="user-x" />);
    fireEvent.click(screen.getByRole("button", { name: /bloquer/i }));
    fireEvent.click(screen.getByRole("button", { name: /annuler/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(blockSpy).not.toHaveBeenCalled();
  });
});
