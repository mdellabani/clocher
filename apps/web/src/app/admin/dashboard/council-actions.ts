"use server";

import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function uploadCouncilDocumentAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: profile } = await supabase
    .from("profiles").select("commune_id, role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return { error: "Non autorisé" };

  const file = formData.get("file") as File;
  const title = formData.get("title") as string;
  const category = formData.get("category") as string;
  const documentDate = formData.get("document_date") as string;

  if (!file || !title || !category || !documentDate) return { error: "Champs manquants" };

  const path = `${profile.commune_id}/${Date.now()}_${file.name}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("council-documents").upload(path, arrayBuffer, { contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const { error: insertError } = await supabase.from("council_documents").insert({
    commune_id: profile.commune_id,
    title,
    category,
    document_date: documentDate,
    storage_path: path,
  });
  if (insertError) return { error: insertError.message };

  const { data: commune } = await supabase.from("communes").select("slug").eq("id", profile.commune_id).single();
  if (commune) updateTag(`commune:${commune.slug}`);
  return { error: null };
}

export async function deleteCouncilDocumentAction(id: string, storagePath: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: profile } = await supabase
    .from("profiles").select("commune_id").eq("id", user.id).single();
  if (!profile) return { error: "Non autorisé" };

  await supabase.storage.from("council-documents").remove([storagePath]);
  const { error } = await supabase.from("council_documents").delete().eq("id", id);
  if (error) return { error: error.message };

  const { data: commune } = await supabase.from("communes").select("slug").eq("id", profile.commune_id).single();
  if (commune) updateTag(`commune:${commune.slug}`);
  return { error: null };
}
