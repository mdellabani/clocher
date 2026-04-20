import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCommuneBySlugCached } from "@/lib/cached-fetchers/commune";

type Props = { params: Promise<{ "commune-slug": string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { "commune-slug": slug } = await params;
  const commune = await getCommuneBySlugCached(slug);
  return { title: commune ? `Bulletin municipal — ${commune.name}` : "Bulletin municipal" };
}

function getWeekLabel(date: Date): string {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay() + 1); // Monday
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  return `Semaine du ${fmt(start)} au ${fmt(end)}`;
}

export default async function BulletinPage({ params }: Props) {
  const { "commune-slug": slug } = await params;
  const commune = await getCommuneBySlugCached(slug);
  if (!commune) notFound();
  const supabase = await createClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: annonces } = await supabase
    .from("posts")
    .select("id, title, body, created_at, profiles!author_id(display_name)")
    .eq("commune_id", commune.id)
    .eq("type", "annonce")
    .eq("is_hidden", false)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false });

  // Group by week
  const weeks = new Map<string, typeof annonces>();
  for (const post of annonces ?? []) {
    const label = getWeekLabel(new Date(post.created_at));
    if (!weeks.has(label)) weeks.set(label, []);
    weeks.get(label)!.push(post);
  }

  return (
    <div className="space-y-8 print:space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--theme-primary)" }}>
          Bulletin municipal
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">{commune.name} — 30 derniers jours</p>
      </div>

      {weeks.size === 0 ? (
        <p className="py-8 text-center text-[var(--muted-foreground)]">Aucune annonce récente.</p>
      ) : (
        Array.from(weeks.entries()).map(([weekLabel, posts]) => (
          <section key={weekLabel}>
            <h2 className="mb-3 border-b border-[#f0e8da] pb-2 text-sm font-semibold uppercase tracking-wide"
              style={{ color: "var(--theme-primary)" }}>
              {weekLabel}
            </h2>
            <div className="space-y-4">
              {posts!.map((post) => (
                <article key={post.id} className="rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_1px_4px_rgba(140,120,80,0.06)]">
                  <h3 className="font-semibold text-[var(--foreground)]">{post.title}</h3>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)] whitespace-pre-line">{post.body}</p>
                  <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                    {(post.profiles as any)?.display_name ?? "Administration"} —{" "}
                    {new Date(post.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ))
      )}

      {/* Print styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          header, footer, nav { display: none !important; }
          .print\\:space-y-6 > * + * { margin-top: 1.5rem; }
          body { font-size: 12pt; }
        }
      `}} />
    </div>
  );
}
