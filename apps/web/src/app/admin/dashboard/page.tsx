import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getProfile,
  getPendingUsers,
} from "@rural-community-platform/shared";
import { PendingUsers } from "@/components/admin/pending-users";
import { PostManagement } from "@/components/admin/post-management";
import { SummaryCards } from "@/components/admin/summary-cards";
import { ThemeInjector } from "@/components/theme-injector";
import { FeedFilters } from "@/components/feed-filters";
import type { PostType } from "@rural-community-platform/shared";
import { CreatePostDialog } from "@/components/create-post-dialog";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; perPage?: string; types?: string; date?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const perPage = [10, 25, 50].includes(Number(params.perPage)) ? Number(params.perPage) : 10;
  const typesParam = params.types ?? "";
  const selectedTypes = typesParam ? typesParam.split(",").filter(Boolean) : [];
  const dateFilter = params.date ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile || profile.role !== "admin") redirect("/app/feed");

  const { data: pendingUsers } = await getPendingUsers(supabase, profile.commune_id);

  // Count posts this week (for summary card)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const { count: postsThisWeek } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("commune_id", profile.commune_id)
    .gte("created_at", oneWeekAgo.toISOString());

  // Compute date filter boundary
  let dateSince: string | null = null;
  if (dateFilter === "today") {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    dateSince = d.toISOString();
  } else if (dateFilter === "week") {
    const d = new Date(); d.setDate(d.getDate() - 7);
    dateSince = d.toISOString();
  } else if (dateFilter === "month") {
    const d = new Date(); d.setDate(d.getDate() - 30);
    dateSince = d.toISOString();
  }

  // Count total posts (with optional filters)
  let countQuery = supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("commune_id", profile.commune_id);
  if (selectedTypes.length > 0) countQuery = countQuery.in("type", selectedTypes);
  if (dateSince) countQuery = countQuery.gte("created_at", dateSince);
  const { count: totalCount } = await countQuery;

  // Fetch paginated posts
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  let postsQuery = supabase
    .from("posts")
    .select("id, title, type, is_pinned, created_at, profiles!author_id(display_name)")
    .eq("commune_id", profile.commune_id)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (selectedTypes.length > 0) postsQuery = postsQuery.in("type", selectedTypes);
  if (dateSince) postsQuery = postsQuery.gte("created_at", dateSince);
  const { data: posts } = await postsQuery;

  return (
    <div className="space-y-6">
      <ThemeInjector theme={profile.communes?.theme} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Administration</h1>
        <CreatePostDialog isAdmin={true} />
      </div>

      <SummaryCards
        pendingCount={pendingUsers?.length ?? 0}
        postsThisWeek={postsThisWeek ?? 0}
        openReports={0}
      />

      <PendingUsers users={pendingUsers ?? []} />
      <FeedFilters types={selectedTypes} date={dateFilter} />

      <PostManagement
        posts={
          (posts ?? []).map((p) => ({
            id: p.id,
            title: p.title,
            type: p.type as PostType,
            is_pinned: p.is_pinned ?? false,
            created_at: p.created_at,
            profiles: Array.isArray(p.profiles) ? p.profiles[0] ?? null : p.profiles,
          }))
        }
        totalCount={totalCount ?? 0}
        page={page}
        perPage={perPage}
      />
    </div>
  );
}
