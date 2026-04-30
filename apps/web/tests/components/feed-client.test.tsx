import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithQuery } from "../helpers/render-with-query";
import { queryKeys } from "@pretou/shared";
import { FeedClient } from "@/app/app/feed/feed-client";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/app/feed",
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/hooks/use-realtime-posts", () => ({ useRealtimePosts: vi.fn() }));

let mockProfile: { role: string; commune_id: string; communes?: unknown } | null = null;
vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({
    profile: mockProfile,
    loading: false,
    isAdmin: mockProfile?.role === "admin",
    isModerator: mockProfile?.role === "moderator" || mockProfile?.role === "admin",
  }),
}));

import { useRealtimePosts } from "@/hooks/use-realtime-posts";

const profileFor = (role: "admin" | "resident") => ({
  id: "u-1",
  commune_id: "c-1",
  role,
  status: "active",
  display_name: "Marie",
  communes: { id: "c-1", name: "Saint-Martin", epci_id: null },
});

const post = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  title: id,
  body: "body",
  type: "discussion",
  created_at: "2026-04-17T00:00:00Z",
  profiles: { display_name: "Marie", avatar_url: null },
  post_images: [],
  comments: [{ count: 0 }],
  rsvps: [],
  is_pinned: false,
  is_hidden: false,
  ...overrides,
});

describe("FeedClient", () => {
  it("renders pinned posts before regular posts from hydrated cache (commune scope)", () => {
    mockProfile = profileFor("admin");
    renderWithQuery(<FeedClient />, {
      cache: [
        { key: queryKeys.posts.pinned("c-1"), data: [post("Pinned!", { is_pinned: true, type: "annonce" })] },
        {
          key: queryKeys.posts.list("c-1", { types: [], dateFilter: "" }),
          data: { pages: [[post("Regular")]], pageParams: [null] },
        },
        { key: ["producer-count", "c-1"], data: 3 },
      ],
    });
    const cards = screen.getAllByTestId("post-card");
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain("Pinned!");
    expect(cards[1].textContent).toContain("Regular");
  });

  it("renders empty state when no posts are in cache", () => {
    mockProfile = profileFor("resident");
    renderWithQuery(<FeedClient />, {
      cache: [
        { key: queryKeys.posts.pinned("c-1"), data: [] },
        {
          key: queryKeys.posts.list("c-1", { types: [], dateFilter: "" }),
          data: { pages: [[]], pageParams: [null] },
        },
        { key: ["producer-count", "c-1"], data: 0 },
      ],
    });
    expect(screen.getByText(/Aucune publication/i)).toBeInTheDocument();
  });

  it("subscribes to realtime with communeId and active filters in commune scope", () => {
    mockProfile = profileFor("resident");
    renderWithQuery(<FeedClient />, {
      cache: [
        { key: queryKeys.posts.pinned("c-1"), data: [] },
        {
          key: queryKeys.posts.list("c-1", { types: [], dateFilter: "" }),
          data: { pages: [[]], pageParams: [null] },
        },
        { key: ["producer-count", "c-1"], data: 0 },
      ],
    });
    expect(useRealtimePosts).toHaveBeenCalledWith(
      "c-1",
      expect.objectContaining({ types: [], dateFilter: "" }),
    );
  });

  it("renders producers banner when producer count > 0", () => {
    mockProfile = profileFor("resident");
    renderWithQuery(<FeedClient />, {
      cache: [
        { key: queryKeys.posts.pinned("c-1"), data: [] },
        {
          key: queryKeys.posts.list("c-1", { types: [], dateFilter: "" }),
          data: { pages: [[]], pageParams: [null] },
        },
        { key: ["producer-count", "c-1"], data: 5 },
      ],
    });
    expect(screen.getByText(/Producteurs locaux/i)).toBeInTheDocument();
    expect(screen.getByText(/5 producteurs/i)).toBeInTheDocument();
  });
});
