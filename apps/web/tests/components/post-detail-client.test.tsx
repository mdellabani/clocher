import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@rural-community-platform/shared";
import { PostDetailClient } from "@/app/app/posts/[id]/post-detail-client";

vi.mock("@/hooks/use-realtime-comments", () => ({ useRealtimeComments: () => undefined }));
vi.mock("@/components/rsvp-buttons", () => ({ RsvpButtons: () => <div>RSVP</div> }));
vi.mock("@/components/poll-display", () => ({ PollDisplay: () => <div>POLL</div> }));
vi.mock("@/components/comment-section", () => ({ CommentSection: () => <div>COMMENTS</div> }));
vi.mock("@/components/delete-post-button", () => ({ DeletePostButton: () => <div>DELETE</div> }));

describe("PostDetailClient", () => {
  it("renders post from cache", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.posts.detail("p1"), {
      id: "p1",
      title: "Hello",
      body: "Body text",
      type: "discussion",
      created_at: new Date().toISOString(),
      author_id: "a1",
      is_pinned: false,
      profiles: { display_name: "Alice", avatar_url: null },
      post_images: [],
    });
    render(
      <QueryClientProvider client={qc}>
        <PostDetailClient postId="p1" userId="me" userRole="resident" />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Body text")).toBeInTheDocument();
    expect(screen.getByText("COMMENTS")).toBeInTheDocument();
  });
});
