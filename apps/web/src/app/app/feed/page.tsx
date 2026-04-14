import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@rural-community-platform/shared";
import type { Post } from "@rural-community-platform/shared";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PostCard } from "@/components/post-card";
import { CreatePostDialog } from "@/components/create-post-dialog";
import { ThemeInjector } from "@/components/theme-injector";
import { FeedFilters } from "@/components/feed-filters";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; date?: string; types?: string }>;
}) {
  const params = await searchParams;
  const scope = params.scope === "epci" ? "epci" : "commune";
  const dateFilter = params.date ?? "";
  const typesParam = params.types ?? "";
  const selectedTypes = typesParam ? typesParam.split(",").filter(Boolean) : [];

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile) redirect("/auth/signup");
  if (profile.status === "pending") redirect("/auth/pending");

  // Build query
  let query = supabase
    .from("posts")
    .select("*, profiles!author_id(display_name, avatar_url), post_images(id, storage_path), comments(count), rsvps(status)")
    .eq("commune_id", profile.commune_id)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  // Expiration filter (active service posts only)
  query = query.or("expires_at.is.null,expires_at.gt." + new Date().toISOString());

  // Type filter (multi-select)
  if (selectedTypes.length > 0) {
    query = query.in("type", selectedTypes);
  }

  // Date filter
  if (dateFilter === "today") {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    query = query.gte("created_at", d.toISOString());
  } else if (dateFilter === "week") {
    const d = new Date(); d.setDate(d.getDate() - 7);
    query = query.gte("created_at", d.toISOString());
  } else if (dateFilter === "month") {
    const d = new Date(); d.setDate(d.getDate() - 30);
    query = query.gte("created_at", d.toISOString());
  }

  const { data: posts } = await query;

  return (
    <div className="space-y-4">
      <ThemeInjector theme={profile.communes?.theme} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Fil de la commune</h1>
        <CreatePostDialog isAdmin={profile.role === "admin"} />
      </div>

      {/* Scope toggle */}
      <div className="flex gap-3 text-sm">
        <Link
          href="/app/feed"
          className={scope === "commune"
            ? "font-semibold text-[var(--theme-primary)] underline underline-offset-4"
            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}
        >
          Ma commune
        </Link>
        <Link
          href="/app/feed?scope=epci"
          className={scope === "epci"
            ? "font-semibold text-[var(--theme-primary)] underline underline-offset-4"
            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}
        >
          Intercommunalité
        </Link>
      </div>

      {/* Filters */}
      <FeedFilters types={selectedTypes} date={dateFilter} />

      {/* Posts */}
      {posts && posts.length > 0 ? (
        <div className="space-y-4">
          {(posts as Post[]).map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-[var(--muted-foreground)]">
          Aucune publication pour cette sélection.
        </p>
      )}
    </div>
  );
}
