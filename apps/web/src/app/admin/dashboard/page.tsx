import { redirect } from "next/navigation";
import { HydrationBoundary } from "@tanstack/react-query";
import {
  getProfile,
  getPendingUsers,
  getPendingProducers,
  getCommuneMembers,
  getAuditLog,
  getCommune,
  getCouncilDocsByCommune,
  getPostsThisWeekCount,
  getAdminPostsPaginated,
  queryKeys,
} from "@rural-community-platform/shared";
import { createClient } from "@/lib/supabase/server";
import { prefetchAndDehydrate } from "@/lib/query/prefetch";
import { DashboardClient } from "./dashboard-client";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile || profile.role !== "admin") redirect("/app/feed");

  const communeId = profile.commune_id;

  const dehydratedState = await prefetchAndDehydrate(async (qc) => {
    qc.setQueryData(queryKeys.profile(user.id), profile);
    await Promise.all([
      qc.prefetchQuery({
        queryKey: queryKeys.admin.pendingUsers(communeId),
        queryFn: async () => {
          const { data } = await getPendingUsers(supabase, communeId);
          return data ?? [];
        },
      }),
      qc.prefetchQuery({
        queryKey: queryKeys.admin.pendingProducers(communeId),
        queryFn: async () => {
          const { data } = await getPendingProducers(supabase, communeId);
          return data ?? [];
        },
      }),
      qc.prefetchQuery({
        queryKey: queryKeys.admin.members(communeId),
        queryFn: async () => {
          const { data } = await getCommuneMembers(supabase, communeId);
          return data ?? [];
        },
      }),
      qc.prefetchQuery({
        queryKey: queryKeys.audit(communeId),
        queryFn: async () => {
          const { data } = await getAuditLog(supabase, communeId, 50);
          return data ?? [];
        },
      }),
      qc.prefetchQuery({
        queryKey: queryKeys.commune(communeId),
        queryFn: async () => {
          const { data } = await getCommune(supabase, communeId);
          return data;
        },
      }),
      qc.prefetchQuery({
        queryKey: queryKeys.councilDocs(communeId),
        queryFn: async () => {
          const { data } = await getCouncilDocsByCommune(supabase, communeId);
          return data ?? [];
        },
      }),
      qc.prefetchQuery({
        queryKey: queryKeys.admin.postsThisWeek(communeId),
        queryFn: async () => getPostsThisWeekCount(supabase, communeId),
      }),
      qc.prefetchQuery({
        queryKey: queryKeys.posts.adminList(communeId, { types: [], dateFilter: "", page: 1, perPage: 10 }),
        queryFn: async () => getAdminPostsPaginated(supabase, communeId, { types: [], dateFilter: "", page: 1, perPage: 10 }),
      }),
    ]);
  });

  return (
    <HydrationBoundary state={dehydratedState}>
      <DashboardClient communeId={communeId} />
    </HydrationBoundary>
  );
}
