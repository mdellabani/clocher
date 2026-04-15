"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function getAdminProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("commune_id, role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return null;
  return { supabase, profile };
}

export async function updateCommuneInfoAction(data: {
  address: string | null;
  phone: string | null;
  email: string | null;
  opening_hours: Record<string, string>;
}) {
  const ctx = await getAdminProfile();
  if (!ctx) return { error: "Non autorisé" };
  const { error } = await ctx.supabase.from("communes")
    .update(data).eq("id", ctx.profile.commune_id);
  if (error) return { error: error.message };
  revalidatePath("/admin/dashboard");
  return { error: null };
}

export async function updateAssociationsAction(associations: Array<{
  name: string;
  description?: string;
  contact?: string;
  schedule?: string;
}>) {
  const ctx = await getAdminProfile();
  if (!ctx) return { error: "Non autorisé" };
  const { error } = await ctx.supabase.from("communes")
    .update({ associations }).eq("id", ctx.profile.commune_id);
  if (error) return { error: error.message };
  revalidatePath("/admin/dashboard");
  return { error: null };
}
