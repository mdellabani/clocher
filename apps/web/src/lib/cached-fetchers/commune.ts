import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCommuneBySlug } from "@rural-community-platform/shared";

export async function getCommuneBySlugCached(slug: string) {
  const inner = unstable_cache(
    async () => {
      const supabase = await createClient();
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
      const supabase = await createClient();
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
