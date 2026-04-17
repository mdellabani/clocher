import { HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getProfile,
  getCommune,
  queryKeys,
} from "@rural-community-platform/shared";
import { prefetchAndDehydrate } from "@/lib/query/prefetch";
import { ThemeInjector } from "@/components/theme-injector";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile) redirect("/auth/signup");
  if (profile.status === "pending") redirect("/auth/pending");

  const dehydratedState = await prefetchAndDehydrate(async (qc) => {
    qc.setQueryData(queryKeys.profile(user.id), profile);
    await qc.prefetchQuery({
      queryKey: queryKeys.commune(profile.commune_id),
      queryFn: async () => {
        const { data } = await getCommune(supabase, profile.commune_id);
        return data;
      },
    });
  });

  return (
    <HydrationBoundary state={dehydratedState}>
      <ThemeInjector
        theme={profile.communes?.theme}
        customPrimaryColor={profile.communes?.custom_primary_color}
      />
      <SettingsClient userId={user.id} userEmail={user.email ?? ""} />
    </HydrationBoundary>
  );
}
