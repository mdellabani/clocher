import { createClient } from "@/lib/supabase/server";

export async function EventsSection({ communeId }: { communeId: string }) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data: events } = await supabase
    .from("posts")
    .select("id, title, body, event_date, event_location")
    .eq("commune_id", communeId)
    .eq("type", "evenement")
    .eq("is_hidden", false)
    .gte("event_date", now)
    .order("event_date", { ascending: true })
    .limit(5);

  if (!events || events.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--theme-primary)" }}>
        Prochains événements
      </h2>
      <div className="space-y-3">
        {events.map((event) => (
          <article key={event.id}
            className="rounded-[14px] border border-[#f0e8da] bg-white px-5 py-4 shadow-[0_1px_4px_rgba(140,120,80,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-semibold text-[var(--foreground)]">{event.title}</h3>
              {event.event_date && (
                <time className="shrink-0 text-xs font-medium" style={{ color: "var(--theme-primary)" }}>
                  {new Date(event.event_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                </time>
              )}
            </div>
            {event.event_location && (
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">{event.event_location}</p>
            )}
            {event.body && (
              <p className="mt-1 line-clamp-2 text-sm text-[var(--muted-foreground)]">{event.body}</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
