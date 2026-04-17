import { redirect } from "next/navigation";
import { HydrationBoundary } from "@tanstack/react-query";
import {
  getProfile,
  getHomepageSectionsByCommune,
  getCommune,
  queryKeys,
} from "@rural-community-platform/shared";
import { createClient } from "@/lib/supabase/server";
import { prefetchAndDehydrate } from "@/lib/query/prefetch";
import { HomepageClient } from "./homepage-client";

export default async function AdminHomepagePage() {
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
        queryKey: queryKeys.admin.homepageSections(communeId),
        queryFn: async () => {
          const { data } = await getHomepageSectionsByCommune(supabase, communeId);
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
    ]);
  });

  return (
    <HydrationBoundary state={dehydratedState}>
      <HomepageClient communeId={communeId} />
    </HydrationBoundary>
  );
}
