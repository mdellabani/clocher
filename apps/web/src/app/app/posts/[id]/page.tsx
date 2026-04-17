import { redirect } from "next/navigation";
import { HydrationBoundary } from "@tanstack/react-query";
import {
  getPostById,
  getComments,
  getRsvps,
  getProfile,
  getPollByPostId,
  queryKeys,
} from "@rural-community-platform/shared";
import { createClient } from "@/lib/supabase/server";
import { prefetchAndDehydrate } from "@/lib/query/prefetch";
import { PostDetailClient } from "./post-detail-client";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile) redirect("/auth/signup");
  if (profile.status === "pending") redirect("/auth/pending");

  const dehydratedState = await prefetchAndDehydrate(async (qc) => {
    qc.setQueryData(queryKeys.profile(user.id), profile);
    await Promise.all([
      qc.prefetchQuery({
        queryKey: queryKeys.posts.detail(id),
        queryFn: async () => {
          const { data } = await getPostById(supabase, id);
          return data;
        },
      }),
      qc.prefetchQuery({
        queryKey: queryKeys.comments(id),
        queryFn: async () => {
          const { data } = await getComments(supabase, id);
          return data ?? [];
        },
      }),
      qc.prefetchQuery({
        queryKey: queryKeys.rsvps(id),
        queryFn: async () => {
          const { data } = await getRsvps(supabase, id);
          return data ?? [];
        },
      }),
      qc.prefetchQuery({
        queryKey: queryKeys.poll(id),
        queryFn: async () => {
          const { data } = await getPollByPostId(supabase, id);
          return data ?? null;
        },
      }),
    ]);
  });

  return (
    <HydrationBoundary state={dehydratedState}>
      <PostDetailClient postId={id} userId={user.id} userRole={profile.role} />
    </HydrationBoundary>
  );
}
