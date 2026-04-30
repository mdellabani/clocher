import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithQuery } from "../helpers/render-with-query";
import { queryKeys } from "@pretou/shared";
import { ProducersClient } from "@/app/app/producteurs/producers-client";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

const profile = {
  id: "u-1",
  commune_id: "c-1",
  role: "resident",
  status: "active",
  display_name: "Marie",
  communes: { id: "c-1", name: "Saint-Martin" },
};

vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({ profile, loading: false, isAdmin: false, isModerator: false }),
}));

describe("ProducersClient", () => {
  it("renders producer list from hydrated cache", () => {
    renderWithQuery(<ProducersClient />, {
      cache: [
        {
          key: queryKeys.producers("c-1"),
          data: [
            {
              id: "p-1",
              name: "Ferme des tilleuls",
              description: "Maraîchage bio",
              categories: ["maraicher"],
              status: "active",
              commune_id: "c-1",
              created_by: "u-1",
            },
          ],
        },
      ],
    });
    expect(screen.getByText(/Ferme des tilleuls/i)).toBeInTheDocument();
  });
});
