import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@rural-community-platform/shared";
import { CommentSection } from "@/components/comment-section";

const addCommentMock = vi.fn().mockResolvedValue({ error: null });
const deleteCommentMock = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/app/app/posts/[id]/actions", () => ({
  addCommentAction: (...args: unknown[]) => addCommentMock(...args),
  deleteCommentAction: (...args: unknown[]) => deleteCommentMock(...args),
}));

describe("CommentSection", () => {
  it("renders from cache and invalidates after submit", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.comments("p1"), [
      {
        id: "c1",
        body: "first",
        created_at: new Date().toISOString(),
        author_id: "a",
        profiles: { display_name: "A", avatar_url: null },
      },
    ]);
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    render(
      <QueryClientProvider client={qc}>
        <CommentSection postId="p1" currentUserId="me" isAdmin={false} />
      </QueryClientProvider>,
    );
    expect(screen.getByText("first")).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/commentaire/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "hello" } });
    const submitButton = screen.getByRole("button", { name: /commenter/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(addCommentMock).toHaveBeenCalledWith("p1", "hello");
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.comments("p1") });
    });
  });
});
