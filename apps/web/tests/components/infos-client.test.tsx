import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithQuery } from "../helpers/render-with-query";
import { queryKeys } from "@rural-community-platform/shared";
import { InfosClient } from "@/app/app/infos-pratiques/infos-client";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({
    profile: { id: "u-1", commune_id: "c-1", role: "resident", status: "active", display_name: "Marie" },
    userEmail: "marie@example.fr",
    loading: false,
    isAdmin: false,
    isModerator: false,
  }),
}));

describe("InfosClient", () => {
  it("renders the mairie contact + hours from cached commune", () => {
    renderWithQuery(<InfosClient />, {
      cache: [
        {
          key: queryKeys.commune("c-1"),
          data: {
            id: "c-1",
            name: "Saint-Martin",
            phone: "0123456789",
            email: "mairie@saint-martin.fr",
            address: "1 place de la mairie",
            opening_hours: { lundi: "9h-12h" },
            associations: [],
            infos_pratiques: {},
          },
        },
      ],
    });
    expect(screen.getAllByText(/Saint-Martin/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/0123456789/)).toBeInTheDocument();
    expect(screen.getByText(/mairie@saint-martin.fr/i)).toBeInTheDocument();
  });

  it("renders empty state when commune has no practical info", () => {
    renderWithQuery(<InfosClient />, {
      cache: [
        {
          key: queryKeys.commune("c-1"),
          data: {
            id: "c-1",
            name: "Saint-Martin",
            phone: null,
            email: null,
            address: null,
            opening_hours: {},
            associations: [],
            infos_pratiques: {},
          },
        },
      ],
    });
    expect(screen.getByText(/Aucune information pratique/i)).toBeInTheDocument();
  });
});
