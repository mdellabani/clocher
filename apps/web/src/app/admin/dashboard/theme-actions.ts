"use server";

import { revalidatePath } from "next/cache";
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
  revalidatePath("/", "layout");
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
  revalidatePath("/", "layout");
  return { error: null };
}
