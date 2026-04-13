import { createClient } from "@/lib/supabase/server";
import {
  getProfile,
  POST_TYPE_LABELS,
} from "@rural-community-platform/shared";
import type { Post, PostType } from "@rural-community-platform/shared";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PostCard } from "@/components/post-card";
import { CreatePostDialog } from "@/components/create-post-dialog";
import { ThemeInjector } from "@/components/theme-injector";

const DATE_FILTERS: { value: string; label: string; days: number | null }[] = [
  { value: "", label: "Toutes", days: null },
  { value: "today", label: "Aujourd'hui", days: 0 },
  { value: "week", label: "Cette semaine", days: 7 },
  { value: "month", label: "Ce mois", days: 30 },
];

const TYPE_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Tout" },
  { value: "annonce", label: POST_TYPE_LABELS.annonce },
  { value: "evenement", label: POST_TYPE_LABELS.evenement },
  { value: "entraide", label: POST_TYPE_LABELS.entraide },
  { value: "discussion", label: POST_TYPE_LABELS.discussion },
];

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; date?: string; type?: string }>;
}) {
  const params = await searchParams;
  const scope = params.scope === "epci" ? "epci" : "commune";
  const dateFilter = params.date ?? "";
  const typeFilter = params.type ?? "";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile) redirect("/auth/signup");
  if (profile.status === "pending") redirect("/auth/pending");

  // Build query with filters
  let query = supabase
    .from("posts")
    .select("*, profiles!author_id(display_name, avatar_url), post_images(id, storage_path), comments(count), rsvps(status)")
    .eq("commune_id", profile.commune_id)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  // Date filter
  const dateDef = DATE_FILTERS.find((d) => d.value === dateFilter);
  if (dateDef && dateDef.days !== null) {
    const since = new Date();
    if (dateDef.days === 0) {
      since.setHours(0, 0, 0, 0);
    } else {
      since.setDate(since.getDate() - dateDef.days);
    }
    query = query.gte("created_at", since.toISOString());
  }

  // Type filter
  if (typeFilter && ["annonce", "evenement", "entraide", "discussion"].includes(typeFilter)) {
    query = query.eq("type", typeFilter);
  }

  const { data: posts } = await query;

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    const merged = { scope: scope === "epci" ? "epci" : "", date: dateFilter, type: typeFilter, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v);
    }
    const qs = p.toString();
    return qs ? `/app/feed?${qs}` : "/app/feed";
  }

  return (
    <div className="space-y-4">
      <ThemeInjector theme={profile.communes?.theme} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Fil de la commune</h1>
        <CreatePostDialog isAdmin={profile.role === "admin"} />
      </div>

      {/* Scope toggle */}
      <div className="flex gap-2 text-sm">
        <Link
          href={buildUrl({ scope: "" })}
          className={scope === "commune"
            ? "font-semibold text-[var(--theme-primary)] underline underline-offset-4"
            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}
        >
          Ma commune
        </Link>
        <Link
          href={buildUrl({ scope: "epci" })}
          className={scope === "epci"
            ? "font-semibold text-[var(--theme-primary)] underline underline-offset-4"
            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}
        >
          Intercommunalité
        </Link>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Type filter pills */}
        {TYPE_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={buildUrl({ type: f.value })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              typeFilter === f.value
                ? "bg-[var(--theme-primary)] text-white"
                : "bg-white border border-[#e8dfd0] text-[var(--muted-foreground)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]"
            }`}
          >
            {f.label}
          </Link>
        ))}

        <span className="mx-1 text-[#d4c4a8]">|</span>

        {/* Date filter pills */}
        {DATE_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={buildUrl({ date: f.value })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              dateFilter === f.value
                ? "bg-[var(--theme-primary)] text-white"
                : "bg-white border border-[#e8dfd0] text-[var(--muted-foreground)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Posts */}
      {posts && posts.length > 0 ? (
        <div className="space-y-4">
          {(posts as Post[]).map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-[var(--muted-foreground)]">
          Aucune publication pour cette période.
        </p>
      )}
    </div>
  );
}
