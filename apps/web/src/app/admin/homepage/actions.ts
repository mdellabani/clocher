"use server";

import { updateTag, refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function getAdminContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("commune_id, role, communes(slug)").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return null;
  return { supabase, communeId: profile.commune_id, slug: (profile.communes as any)?.slug };
}

export async function updateSectionAction(id: string, data: {
  visible?: boolean;
  sort_order?: number;
  content?: Record<string, unknown>;
}) {
  const ctx = await getAdminContext();
  if (!ctx) return { error: "Non autorisé" };

  const { error } = await ctx.supabase
    .from("page_sections")
    .update(data)
    .eq("id", id)
    .eq("commune_id", ctx.communeId);

  if (error) return { error: error.message };
  if (ctx.slug) {
    updateTag(`commune:${ctx.slug}`);
    refresh();
  }
  return { error: null };
}

export async function addSectionAction(sectionType: string, sortOrder: number) {
  const ctx = await getAdminContext();
  if (!ctx) return { error: "Non autorisé", id: null };

  const { data, error } = await ctx.supabase
    .from("page_sections")
    .insert({
      commune_id: ctx.communeId,
      page: "homepage",
      section_type: sectionType,
      sort_order: sortOrder,
      visible: true,
      content: {},
    })
    .select("id")
    .single();

  if (error) return { error: error.message, id: null };
  if (ctx.slug) {
    updateTag(`commune:${ctx.slug}`);
    refresh();
  }
  return { error: null, id: data.id };
}

export async function deleteSectionAction(id: string) {
  const ctx = await getAdminContext();
  if (!ctx) return { error: "Non autorisé" };

  const { error } = await ctx.supabase
    .from("page_sections")
    .delete()
    .eq("id", id)
    .eq("commune_id", ctx.communeId);

  if (error) return { error: error.message };
  if (ctx.slug) {
    updateTag(`commune:${ctx.slug}`);
    refresh();
  }
  return { error: null };
}

export async function reorderSectionsAction(orderedIds: string[]) {
  const ctx = await getAdminContext();
  if (!ctx) return { error: "Non autorisé" };

  for (let i = 0; i < orderedIds.length; i++) {
    await ctx.supabase
      .from("page_sections")
      .update({ sort_order: i })
      .eq("id", orderedIds[i])
      .eq("commune_id", ctx.communeId);
  }

  if (ctx.slug) {
    updateTag(`commune:${ctx.slug}`);
    refresh();
  }
  return { error: null };
}

export async function uploadSectionImageAction(formData: FormData): Promise<string | null> {
  const ctx = await getAdminContext();
  if (!ctx) return null;

  const file = formData.get("file") as File;
  if (!file || file.size === 0) return null;

  const ext = file.name.split(".").pop() ?? "webp";
  const path = `${ctx.communeId}/${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await ctx.supabase.storage
    .from("website-images")
    .upload(path, arrayBuffer, { contentType: file.type });

  return error ? null : path;
}

export async function seedDefaultSectionsAction() {
  const ctx = await getAdminContext();
  if (!ctx) return { error: "Non autorisé" };

  const { count } = await ctx.supabase
    .from("page_sections")
    .select("id", { count: "exact", head: true })
    .eq("commune_id", ctx.communeId)
    .eq("page", "homepage");

  if ((count ?? 0) > 0) return { error: null };

  const defaults = [
    { section_type: "hero", sort_order: 0, content: {} },
    { section_type: "news", sort_order: 1, content: {} },
    { section_type: "events", sort_order: 2, content: {} },
    { section_type: "services", sort_order: 3, content: {} },
  ];

  for (const section of defaults) {
    await ctx.supabase.from("page_sections").insert({
      commune_id: ctx.communeId,
      page: "homepage",
      ...section,
    });
  }

  if (ctx.slug) {
    updateTag(`commune:${ctx.slug}`);
    refresh();
  }
  return { error: null };
}
