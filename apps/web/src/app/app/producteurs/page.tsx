import { HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getProfile,
  getActiveProducersByCommune,
  queryKeys,
} from "@rural-community-platform/shared";
import type { Producer } from "@rural-community-platform/shared";
import { prefetchAndDehydrate } from "@/lib/query/prefetch";
import { ThemeInjector } from "@/components/theme-injector";
import { ProducersClient } from "./producers-client";

export default async function ProducteursPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile) redirect("/auth/signup");
  if (profile.status === "pending") redirect("/auth/pending");

  const dehydratedState = await prefetchAndDehydrate(async (qc) => {
    qc.setQueryData(queryKeys.profile(user.id), profile);
    await qc.prefetchQuery({
      queryKey: queryKeys.producers(profile.commune_id),
      queryFn: async () => {
        const { data } = await getActiveProducersByCommune(supabase, profile.commune_id);
        return (data ?? []) as Producer[];
      },
    });
  });

  return (
    <HydrationBoundary state={dehydratedState}>
      <ThemeInjector
        theme={profile.communes?.theme}
        customPrimaryColor={profile.communes?.custom_primary_color}
      />
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">Producteurs locaux</h1>
      <div className="mt-4">
        <ProducersClient userId={user.id} />
      </div>
    </HydrationBoundary>
  );
}
