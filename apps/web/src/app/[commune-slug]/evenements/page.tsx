import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCommuneBySlug } from "@rural-community-platform/shared";

type Props = {
  params: Promise<{ "commune-slug": string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { "commune-slug": slug } = await params;
  const supabase = await createClient();
  const { data: commune } = await getCommuneBySlug(supabase, slug);

  return {
    title: commune ? `Événements — ${commune.name}` : "Événements",
  };
}

function formatEventDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatEventTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function EvenementsPage({ params }: Props) {
  const { "commune-slug": slug } = await params;

  const supabase = await createClient();
  const { data: commune } = await getCommuneBySlug(supabase, slug);

  if (!commune) {
    notFound();
  }

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
    <div className="space-y-10">
      <h1 className="text-2xl font-bold text-gray-900">
        Événements à {commune.name}
      </h1>

      {/* Upcoming events */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
          À venir
        </h2>
        {upcoming && upcoming.length > 0 ? (
          <div className="space-y-4">
            {upcoming.map((event) => (
              <article
                key={event.id}
                className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-gray-900">
                  {event.title}
                </h3>
                {event.event_date && (
                  <div className="mt-2 flex flex-col gap-0.5 text-sm text-gray-600">
                    <time dateTime={event.event_date} className="font-medium">
                      {formatEventDate(event.event_date)} à{" "}
                      {formatEventTime(event.event_date)}
                    </time>
                    {event.event_location && (
                      <p>📍 {event.event_location}</p>
                    )}
                  </div>
                )}
                {event.body && (
                  <p className="text-gray-700 mt-3 text-sm whitespace-pre-line">
                    {event.body}
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            Aucun événement à venir pour le moment.
          </p>
        )}
      </section>

      {/* Past events */}
      {past && past.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
            Événements passés
          </h2>
          <div className="space-y-4">
            {past.map((event) => (
              <article
                key={event.id}
                className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm opacity-75"
              >
                <h3 className="text-lg font-semibold text-gray-700">
                  {event.title}
                </h3>
                {event.event_date && (
                  <div className="mt-2 flex flex-col gap-0.5 text-sm text-gray-500">
                    <time dateTime={event.event_date}>
                      {formatEventDate(event.event_date)}
                    </time>
                    {event.event_location && (
                      <p>📍 {event.event_location}</p>
                    )}
                  </div>
                )}
                {event.body && (
                  <p className="text-gray-600 mt-3 text-sm line-clamp-2">
                    {event.body}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
