"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { EventCalendar } from "@/components/event-calendar";
import { useProfile } from "@/hooks/queries/use-profile";
import { useEvents } from "@/hooks/queries/use-events";

interface EventPost {
  id: string;
  title: string;
  body: string | null;
  type: string;
  event_date: string | null;
  event_location: string | null;
  created_at: string;
  profiles: { display_name: string } | { display_name: string }[] | null;
  rsvps: { status: string }[];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function firstOrSame<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export function EventsClient({ userId }: { userId: string }) {
  const { data: profile } = useProfile(userId);
  const { data: rawEvents } = useEvents(profile?.commune_id ?? "");
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [displayYear, setDisplayYear] = useState(today.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(today.getMonth());

  if (!profile) return null;

  const events = ((rawEvents ?? []) as EventPost[]).map((e) => ({
    ...e,
    profiles: firstOrSame(e.profiles),
  }));

  const calendarEvents = events
    .filter((e) => e.event_date != null)
    .map((e) => ({ id: e.id, date: e.event_date!, title: e.title }));

  const filteredEvents = selectedDate
    ? events.filter((e) => {
        if (!e.event_date) return false;
        const d = new Date(e.event_date);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return dateStr === selectedDate;
      })
    : events.filter((e) => {
        if (!e.event_date) return false;
        const d = new Date(e.event_date);
        return d.getFullYear() === displayYear && d.getMonth() === displayMonth;
      });

  const monthLabel = new Date(displayYear, displayMonth, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <EventCalendar
        events={calendarEvents}
        onDateSelect={setSelectedDate}
        selectedDate={selectedDate}
        onMonthChange={(year, month) => {
          setDisplayYear(year);
          setDisplayMonth(month);
        }}
      />

      {selectedDate ? (
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[var(--foreground)]">
            {filteredEvents.length} événement{filteredEvents.length !== 1 ? "s" : ""} le{" "}
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
            })}
          </p>
          <button
            onClick={() => setSelectedDate(null)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
            style={{
              backgroundColor: "var(--theme-pin-bg)",
              color: "var(--theme-primary)",
            }}
          >
            Voir tout le mois
          </button>
        </div>
      ) : (
        <p className="text-sm text-[var(--muted-foreground)]">
          {filteredEvents.length} événement{filteredEvents.length !== 1 ? "s" : ""} en {monthLabel}
        </p>
      )}

      {filteredEvents.length > 0 ? (
        <div className="space-y-4">
          {filteredEvents.map((event) => {
            const rsvpCount = event.rsvps?.filter((r) => r.status === "going").length ?? 0;
            return (
              <Link key={event.id} href={`/app/posts/${event.id}`} className="block">
                <div className="relative rounded-[14px] border border-[#f0e8da] bg-white shadow-[0_2px_8px_rgba(140,120,80,0.08)] transition-all hover:shadow-[0_4px_16px_rgba(140,120,80,0.14)] hover:-translate-y-0.5">
                  <div className="px-5 py-4">
                    {event.event_date && (
                      <div
                        className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5"
                        style={{ backgroundColor: "var(--theme-pin-bg)" }}
                      >
                        <CalendarDays size={14} style={{ color: "var(--theme-primary)" }} />
                        <span
                          className="text-xs font-semibold"
                          style={{ color: "var(--theme-primary)" }}
                        >
                          {formatDate(event.event_date)} · {formatTime(event.event_date)}
                        </span>
                      </div>
                    )}

                    <h3 className="font-semibold leading-tight text-[var(--foreground)]">
                      {event.title}
                    </h3>

                    {event.event_location && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <MapPin size={13} className="text-[var(--muted-foreground)]" />
                        <span
                          className="text-sm font-medium"
                          style={{ color: "var(--theme-primary)" }}
                        >
                          {event.event_location}
                        </span>
                      </div>
                    )}

                    {event.body && (
                      <p className="mt-2 line-clamp-2 text-sm text-[var(--muted-foreground)]">
                        {event.body}
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                      <span className="font-medium">
                        {event.profiles?.display_name ?? "Anonyme"}
                      </span>
                      {rsvpCount > 0 && (
                        <>
                          <span>·</span>
                          <span style={{ color: "var(--theme-primary)" }}>
                            {rsvpCount} participant{rsvpCount > 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="py-8 text-center text-[var(--muted-foreground)]">
          Aucun événement{selectedDate ? " pour cette date" : " à venir"}.
        </p>
      )}
    </div>
  );
}
