import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithQuery } from "../helpers/render-with-query";
import { queryKeys } from "@rural-community-platform/shared";
import { SettingsClient } from "@/app/app/settings/settings-client";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

describe("SettingsClient", () => {
  it("displays email, commune name, and role from hydrated cache", () => {
    renderWithQuery(<SettingsClient userId="u-1" userEmail="marie@example.fr" />, {
      cache: [
        {
          key: queryKeys.profile("u-1"),
          data: {
            id: "u-1",
            commune_id: "c-1",
            role: "admin",
            status: "active",
            display_name: "Marie",
            avatar_url: null,
          },
        },
        { key: queryKeys.commune("c-1"), data: { id: "c-1", name: "Saint-Martin" } },
      ],
    });
    expect(screen.getByText("marie@example.fr")).toBeInTheDocument();
    expect(screen.getByText("Saint-Martin")).toBeInTheDocument();
    expect(screen.getByText("Administrateur")).toBeInTheDocument();
  });
});
