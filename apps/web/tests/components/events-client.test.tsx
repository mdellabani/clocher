import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithQuery } from "../helpers/render-with-query";
import { queryKeys } from "@rural-community-platform/shared";
import { EventsClient } from "@/app/app/evenements/events-client";

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/components/event-calendar", () => ({
  EventCalendar: () => <div data-testid="event-calendar" />,
}));

const profile = {
  id: "u-1",
  commune_id: "c-1",
  role: "resident",
  status: "active",
  display_name: "Marie",
  communes: { id: "c-1", name: "Saint-Martin" },
};

describe("EventsClient", () => {
  it("renders an event from hydrated cache in current month", () => {
    const today = new Date();
    const future = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 18, 0).toISOString();
    renderWithQuery(<EventsClient userId="u-1" />, {
      cache: [
        { key: queryKeys.profile("u-1"), data: profile },
        {
          key: queryKeys.events("c-1"),
          data: [
            {
              id: "e-1",
              title: "Fête du village",
              body: "Venez nombreux !",
              type: "evenement",
              event_date: future,
              event_location: "Place de la mairie",
              created_at: today.toISOString(),
              profiles: { display_name: "Marie" },
              rsvps: [],
            },
          ],
        },
      ],
    });
    expect(screen.getByText(/Fête du village/i)).toBeInTheDocument();
  });

  it("shows empty state when no events for the month", () => {
    renderWithQuery(<EventsClient userId="u-1" />, {
      cache: [
        { key: queryKeys.profile("u-1"), data: profile },
        { key: queryKeys.events("c-1"), data: [] },
      ],
    });
    expect(screen.getByText(/Aucun événement/i)).toBeInTheDocument();
  });
});
