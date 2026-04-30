import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { PostDetailClient } from "@/app/app/posts/[id]/post-detail-client";

vi.mock("@/components/rsvp-buttons", () => ({ RsvpButtons: () => <div>RSVP</div> }));
vi.mock("@/components/poll-display", () => ({ PollDisplay: () => <div>POLL</div> }));
vi.mock("@/components/delete-post-button", () => ({ DeletePostButton: () => <div>DELETE</div> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/app/app/messages/actions", () => ({
  startConversationAction: vi.fn(async () => ({ id: "c1", created: true })),
}));

vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({
    profile: { id: "me", role: "resident", commune_id: "c-1", status: "active", display_name: "Me" },
    loading: false,
    isAdmin: false,
    isModerator: false,
  }),
}));

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
        <PostDetailClient postId="p1" />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Body text")).toBeInTheDocument();
  });
});
