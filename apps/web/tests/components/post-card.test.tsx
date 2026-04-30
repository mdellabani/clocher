import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PostCard } from "@/components/post-card";
import type { Post } from "@pretou/shared";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, fill }: { src: string; alt: string; fill?: boolean }) =>
    fill ? <img src={src} alt={alt} data-testid="image-fill" /> : <img src={src} alt={alt} />,
}));

vi.mock("@/components/post-type-badge", () => ({
  PostTypeBadge: ({ type }: { type: string }) => <span>{type}</span>,
}));

vi.mock("@/components/report-dialog", () => ({
  ReportDialog: ({ postId }: { postId: string }) => <button>Signaler</button>,
}));

const basePost: Post = {
  id: "p1",
  commune_id: "c1",
  author_id: "u1",
  title: "Hello",
  body: "World",
  type: "discussion",
  is_pinned: false,
  is_hidden: false,
  event_date: null,
  event_location: null,
  expires_at: null,
  epci_visible: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  profiles: { display_name: "Pierre", avatar_url: null },
  communes: { name: "Saint-Médard" },
  comments: [{ count: 0 }],
  rsvps: [],
  post_images: [],
} as unknown as Post;

describe("PostCard", () => {
  it("renders without thumbnail when no image", () => {
    render(<PostCard post={basePost} />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
    // img with empty alt comes from next/image mock but should not be rendered
    // when post_images is empty
    const images = screen.queryAllByRole("img");
    expect(images).toHaveLength(0);
  });

  it("renders thumbnail when post has an image", () => {
    const withImage = {
      ...basePost,
      post_images: [{ id: "img1", storage_path: "posts/abc/1.png" }],
    } as unknown as Post;
    render(<PostCard post={withImage} />);
    const img = screen.getByTestId("image-fill");
    expect(img).toHaveAttribute("src", expect.stringContaining("posts/abc/1.png"));
  });

  it("applies pinned styling when post is pinned", () => {
    const pinned = { ...basePost, is_pinned: true } as unknown as Post;
    const { container } = render(<PostCard post={pinned} />);
    expect(screen.getByText("Épinglé")).toBeInTheDocument();
    // Check that the card has pinned styling applied (inline style with borderTopColor)
    const cards = container.querySelectorAll("div[style]");
    const pinnedCard = Array.from(cards).find(
      (el) =>
        (el as HTMLElement).style.borderTopColor ||
        (el as HTMLElement).style.borderTopWidth === "3px"
    );
    expect(pinnedCard).not.toBeUndefined();
  });

  it("renders expiry text for service posts", () => {
    const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const service = {
      ...basePost,
      type: "service",
      expires_at: future,
    } as unknown as Post;
    render(<PostCard post={service} />);
    expect(screen.getByText(/Expire dans 3j/)).toBeInTheDocument();
  });
});
