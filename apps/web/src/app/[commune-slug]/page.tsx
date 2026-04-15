import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCommuneBySlug } from "@rural-community-platform/shared";
import { SectionRenderer } from "@/components/sections/section-renderer";

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

  if (!commune) notFound();

  // Fetch page sections
  const { data: sections } = await supabase
    .from("page_sections")
    .select("id, section_type, content")
    .eq("commune_id", commune.id)
    .eq("page", "homepage")
    .eq("visible", true)
    .order("sort_order", { ascending: true });

  // If sections exist, render them
  if (sections && sections.length > 0) {
    return (
      <div className="space-y-8">
        {sections.map((section) => (
          <SectionRenderer
            key={section.id}
            section={section}
            communeId={commune.id}
          />
        ))}
      </div>
    );
  }

  // Fallback: current homepage (announcements + events)
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
      {commune.hero_image_url && (
        <img src={commune.hero_image_url} alt={commune.name}
          className="max-h-80 w-full rounded-xl object-cover" />
      )}
      {commune.description && (
        <p className="text-[var(--foreground)] leading-relaxed">{commune.description}</p>
      )}
      {events && events.length > 0 && (
        <section>
          <h2 className="mb-4 border-b-2 pb-2 text-xl font-semibold"
            style={{ borderColor: "var(--theme-primary)", color: "var(--foreground)" }}>
            Prochains événements
          </h2>
          <div className="space-y-4">
            {events.map((event) => (
              <article key={event.id} className="rounded-[14px] bg-white p-5 shadow-[0_1px_6px_rgba(160,130,90,0.06)]">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">{event.title}</h3>
                  {event.event_date && (
                    <time className="shrink-0 text-sm text-[var(--muted-foreground)]">
                      {new Date(event.event_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </time>
                  )}
                </div>
                {event.event_location && <p className="mt-1 text-sm text-[var(--muted-foreground)]">{event.event_location}</p>}
                {event.body && <p className="mt-2 line-clamp-3 text-sm text-[var(--foreground)]/80">{event.body}</p>}
              </article>
            ))}
          </div>
        </section>
      )}
      <section>
        <h2 className="mb-4 border-b-2 pb-2 text-xl font-semibold"
          style={{ borderColor: "var(--theme-primary)", color: "var(--foreground)" }}>
          Dernières annonces
        </h2>
        {announcements && announcements.length > 0 ? (
          <div className="space-y-4">
            {announcements.map((post) => (
              <article key={post.id} className="rounded-[14px] bg-white p-5 shadow-[0_1px_6px_rgba(160,130,90,0.06)]">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">{post.title}</h3>
                  <time className="shrink-0 text-sm text-[var(--muted-foreground)]">
                    {new Date(post.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </time>
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-[var(--foreground)]/80">{post.body}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">Aucune annonce pour le moment.</p>
        )}
      </section>
    </div>
  );
}
