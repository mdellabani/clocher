import { createClient } from "@/lib/supabase/server";

export async function NewsSection({ communeId }: { communeId: string }) {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, body, created_at")
    .eq("commune_id", communeId)
    .eq("type", "annonce")
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!posts || posts.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--theme-primary)" }}>
        Dernières actualités
      </h2>
      <div className="space-y-3">
        {posts.map((post) => (
          <article key={post.id}
            className="rounded-[14px] border border-[#f0e8da] bg-white px-5 py-4 shadow-[0_1px_4px_rgba(140,120,80,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-semibold text-[var(--foreground)]">{post.title}</h3>
              <time className="shrink-0 text-xs text-[var(--muted-foreground)]">
                {new Date(post.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
              </time>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-[var(--muted-foreground)]">{post.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
