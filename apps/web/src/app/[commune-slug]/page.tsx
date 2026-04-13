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
    title: commune ? `${commune.name} — Commune` : "Commune",
  };
}

export default async function CommuneHomePage({ params }: Props) {
  const { "commune-slug": slug } = await params;

  const supabase = await createClient();
  const { data: commune } = await getCommuneBySlug(supabase, slug);

  if (!commune) {
    notFound();
  }

  const now = new Date().toISOString();

  const [{ data: announcements }, { data: events }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, title, body, created_at")
      .eq("commune_id", commune.id)
      .eq("type", "annonce")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("posts")
      .select("id, title, body, event_date, event_location")
      .eq("commune_id", commune.id)
      .eq("type", "evenement")
      .gte("event_date", now)
      .order("event_date", { ascending: true })
      .limit(5),
  ]);

  return (
    <div className="space-y-10">
      {/* Upcoming events section */}
      {events && events.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
            Prochains événements
          </h2>
          <div className="space-y-4">
            {events.map((event) => (
              <article
                key={event.id}
                className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {event.title}
                  </h3>
                  {event.event_date && (
                    <time
                      dateTime={event.event_date}
                      className="text-sm text-gray-500 whitespace-nowrap shrink-0"
                    >
                      {new Date(event.event_date).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </time>
                  )}
                </div>
                {event.event_location && (
                  <p className="text-sm text-gray-500 mt-1">
                    📍 {event.event_location}
                  </p>
                )}
                {event.body && (
                  <p className="text-gray-700 mt-2 text-sm line-clamp-3">
                    {event.body}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Announcements section */}
      <section>
        <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
          Annonces officielles
        </h2>
        {announcements && announcements.length > 0 ? (
          <div className="space-y-4">
            {announcements.map((post) => (
              <article
                key={post.id}
                className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {post.title}
                  </h3>
                  <time
                    dateTime={post.created_at}
                    className="text-sm text-gray-500 whitespace-nowrap shrink-0"
                  >
                    {new Date(post.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </time>
                </div>
                <p className="text-gray-700 mt-2 text-sm line-clamp-3">
                  {post.body}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            Aucune annonce pour le moment.
          </p>
        )}
      </section>
    </div>
  );
}
