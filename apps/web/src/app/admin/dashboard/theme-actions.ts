"use server";

import { unstable_cache } from "next/cache";
import { updateTag, refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateThemeAction(theme: string, customPrimaryColor: string | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: profile } = await supabase
    .from("profiles").select("commune_id, role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return { error: "Non autorisé" };

  const { error } = await supabase.from("communes")
    .update({ theme, custom_primary_color: customPrimaryColor })
    .eq("id", profile.commune_id);

  if (error) return { error: error.message };

  const { data: commune } = await supabase.from("communes")
    .select("slug").eq("id", profile.commune_id).single();
  if (commune) {
    updateTag(`commune:${commune.slug}`);
    refresh();
  }

  return { error: null };
}

export async function uploadLogoAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: profile } = await supabase
    .from("profiles").select("commune_id, role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return { error: "Non autorisé" };

  const file = formData.get("logo") as File;
  if (!file || file.size === 0) return { error: "Aucun fichier" };

  const ext = file.name.split(".").pop() ?? "png";
  const path = `logos/${profile.commune_id}/logo.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("avatars").upload(path, arrayBuffer, { contentType: file.type, upsert: true });

  if (uploadError) return { error: uploadError.message };

  const logoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}?t=${Date.now()}`;

  const { error: updateError } = await supabase.from("communes")
    .update({ logo_url: logoUrl }).eq("id", profile.commune_id);

  if (updateError) return { error: updateError.message };

  const { data: commune } = await supabase.from("communes")
    .select("slug").eq("id", profile.commune_id).single();
  if (commune) {
    updateTag(`commune:${commune.slug}`);
    refresh();
  }

  return { error: null };
}

export async function removeLogoAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: profile } = await supabase
    .from("profiles").select("commune_id, role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return { error: "Non autorisé" };

  // Best-effort storage cleanup. We list whatever's under logos/<commune_id>/
  // and remove it — the URL stored in DB has a cache-busting query string,
  // so deriving the file name from it is brittle.
  const { data: files } = await supabase.storage
    .from("avatars").list(`logos/${profile.commune_id}`);
  if (files && files.length > 0) {
    const paths = files.map((f) => `logos/${profile.commune_id}/${f.name}`);
    await supabase.storage.from("avatars").remove(paths);
  }

  const { error } = await supabase.from("communes")
    .update({ logo_url: null }).eq("id", profile.commune_id);

  if (error) return { error: error.message };

  const { data: commune } = await supabase.from("communes")
    .select("slug").eq("id", profile.commune_id).single();
  if (commune) {
    updateTag(`commune:${commune.slug}`);
    refresh();
  }

  return { error: null };
}
