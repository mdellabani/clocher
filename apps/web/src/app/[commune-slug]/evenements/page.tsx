import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCommuneBySlugCached } from "@/lib/cached-fetchers/commune";
import { EventsWithCalendar } from "@/components/events-with-calendar";

type Props = {
  params: Promise<{ "commune-slug": string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { "commune-slug": slug } = await params;
  const commune = await getCommuneBySlugCached(slug);

  return {
    title: commune ? `Evenements — ${commune.name}` : "Evenements",
  };
}

export default async function EvenementsPage({ params }: Props) {
  const { "commune-slug": slug } = await params;

  const commune = await getCommuneBySlugCached(slug);

  if (!commune) {
    notFound();
  }

  const supabase = await createClient();

  const now = new Date().toISOString();

  const [{ data: upcoming }, { data: past }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, title, body, event_date, event_location, created_at")
      .eq("commune_id", commune.id)
      .eq("type", "evenement")
      .gte("event_date", now)
      .order("event_date", { ascending: true }),
    supabase
      .from("posts")
      .select("id, title, body, event_date, event_location, created_at")
      .eq("commune_id", commune.id)
      .eq("type", "evenement")
      .lt("event_date", now)
      .order("event_date", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        Evenements a {commune.name}
      </h1>

      <EventsWithCalendar
        upcomingEvents={upcoming ?? []}
        pastEvents={past ?? []}
      />
    </div>
  );
}
