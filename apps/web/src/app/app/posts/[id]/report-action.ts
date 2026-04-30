"use server";

import { createClient } from "@/lib/supabase/server";
import type { ReportCategory } from "@pretou/shared";

export async function reportPostAction(
  postId: string,
  category: ReportCategory,
  reason: string | null
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifié" };
  }

  const { data: existing } = await supabase
    .from("reports")
    .select("id")
    .eq("post_id", postId)
    .eq("reporter_id", user.id)
    .maybeSingle();

  if (existing) {
    return { error: "Vous avez déjà signalé cette publication" };
  }

  const { error } = await supabase
    .from("reports")
    .insert({ post_id: postId, reporter_id: user.id, category, reason });

  if (error) {
    return { error: "Erreur lors du signalement" };
  }

  return { error: null };
}
