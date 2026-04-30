import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { getCommuneBySlug } from "@pretou/shared";

// Next 16 forbids accessing dynamic data sources (cookies()) inside
// unstable_cache. Public commune routes don't need auth — use the anon
// client that skips cookies entirely.

export async function getCommuneBySlugCached(slug: string) {
  const inner = unstable_cache(
    async () => {
      const supabase = createPublicClient();
      const { data } = await getCommuneBySlug(supabase, slug);
      return data;
    },
    ["commune-by-slug", slug],
    { tags: [`commune:${slug}`], revalidate: 3600 },
  );
  return inner();
}

export async function getHomepageSectionsBySlugCached(slug: string) {
  const inner = unstable_cache(
    async () => {
      const supabase = createPublicClient();
      const { data: commune } = await getCommuneBySlug(supabase, slug);
      if (!commune) return [];
      const { data } = await supabase
        .from("page_sections")
        .select("id, section_type, content")
        .eq("commune_id", commune.id)
        .eq("page", "homepage")
        .eq("visible", true)
        .order("sort_order", { ascending: true });
      return data ?? [];
    },
    ["homepage-sections-by-slug", slug],
    { tags: [`commune:${slug}`], revalidate: 3600 },
  );
  return inner();
}
