import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithQuery } from "../helpers/render-with-query";
import { queryKeys } from "@rural-community-platform/shared";
import { EspaceClient } from "@/app/app/mon-espace/espace-client";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

const profileFixture = {
  id: "u-1",
  commune_id: "c-1",
  role: "resident",
  status: "active",
  display_name: "Marie",
  communes: { id: "c-1", name: "Saint-Martin" },
};

vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({ profile: profileFixture, loading: false, isAdmin: false, isModerator: false }),
}));

describe("EspaceClient", () => {
  it("renders content from hydrated cache for each section", () => {
    renderWithQuery(<EspaceClient />, {
      cache: [
        { key: queryKeys.profile("u-1"), data: profileFixture },
        {
          key: queryKeys.me.posts("u-1"),
          data: [
            {
              id: "p-1",
              title: "Ma publication",
              type: "discussion",
              created_at: "2026-04-17T00:00:00Z",
              is_pinned: false,
            },
          ],
        },
        {
          key: queryKeys.me.rsvps("u-1"),
          data: [
            {
              status: "going",
              posts: {
                id: "p-3",
                title: "Fête du village",
                type: "evenement",
                event_date: "2026-05-01T18:00:00Z",
                event_location: "Place de la mairie",
              },
            },
          ],
        },
      ],
    });
    expect(screen.getByText("Ma publication")).toBeInTheDocument();
    expect(screen.getByText(/Fête du village/i)).toBeInTheDocument();
  });

  it("shows empty states in each section when cache is empty", () => {
    renderWithQuery(<EspaceClient />, {
      cache: [
        { key: queryKeys.profile("u-1"), data: profileFixture },
        { key: queryKeys.me.posts("u-1"), data: [] },
        { key: queryKeys.me.rsvps("u-1"), data: [] },
      ],
    });
    expect(screen.getAllByText(/Aucun/i).length).toBeGreaterThan(0);
  });
});
