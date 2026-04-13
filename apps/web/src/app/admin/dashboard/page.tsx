import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getProfile,
  getPendingUsers,
} from "@rural-community-platform/shared";
import { PendingUsers } from "@/components/admin/pending-users";
import { PostManagement } from "@/components/admin/post-management";
import { SummaryCards } from "@/components/admin/summary-cards";
import { MiniCalendar } from "@/components/admin/mini-calendar";
import { ThemeInjector } from "@/components/theme-injector";
import type { PostType } from "@rural-community-platform/shared";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile || profile.role !== "admin") redirect("/app/feed");

  const { data: pendingUsers } = await getPendingUsers(supabase, profile.commune_id);

  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, type, is_pinned, created_at, profiles!author_id(display_name)")
    .eq("commune_id", profile.commune_id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Count posts this week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const postsThisWeek = (posts ?? []).filter(
    (p) => new Date(p.created_at) >= oneWeekAgo
  ).length;

  // Extract events for calendar
  const { data: eventPosts } = await supabase
    .from("posts")
    .select("title, type, event_date")
    .eq("commune_id", profile.commune_id)
    .eq("type", "evenement")
    .not("event_date", "is", null);

  const calendarEvents = (eventPosts ?? []).map((e) => ({
    date: e.event_date!,
    title: e.title,
    type: e.type,
  }));

  return (
    <div className="space-y-6">
      <ThemeInjector theme={profile.communes?.theme} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Administration</h1>
        <Link
          href="/app/feed"
          className="inline-flex items-center gap-2 rounded-[14px] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
          style={{
            background:
              "linear-gradient(135deg, var(--theme-gradient-1), var(--theme-gradient-2), var(--theme-gradient-3))",
          }}
        >
          <Plus size={16} />
          Publier
        </Link>
      </div>

      <SummaryCards
        pendingCount={pendingUsers?.length ?? 0}
        postsThisWeek={postsThisWeek}
        openReports={0}
      />

      <MiniCalendar events={calendarEvents} />

      <PendingUsers users={pendingUsers ?? []} />
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
      />
    </div>
  );
}
