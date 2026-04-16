"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SUPER_ADMIN_EMAILS } from "@/lib/super-admin";

async function requireSuperAdmin() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user || !SUPER_ADMIN_EMAILS.includes(user.email ?? "")) {
    throw new Error("Unauthorized");
  }
  return { supabase: createServiceClient(), user };
}

export async function getAllCommunesWithAdmins() {
  const { supabase } = await requireSuperAdmin();

  // Single query: all admin profiles with their commune
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, created_at, status, commune_id, communes!commune_id(id, name, slug, code_postal, created_at)")
    .eq("role", "admin")
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function approveCommuneAction(profileId: string) {
  const { supabase } = await requireSuperAdmin();

  const { error } = await supabase
    .from("profiles")
    .update({ status: "active" })
    .eq("id", profileId)
    .eq("role", "admin")
    .eq("status", "pending");

  if (error) return { error: error.message };
  return { success: true };
}

export async function revokeCommuneAction(profileId: string) {
  const { supabase } = await requireSuperAdmin();

  const { error } = await supabase
    .from("profiles")
    .update({ status: "rejected" })
    .eq("id", profileId)
    .eq("role", "admin")
    .eq("status", "active");

  if (error) return { error: error.message };
  return { success: true };
}

export async function rejectCommuneAction(profileId: string, communeId: string) {
  const { supabase } = await requireSuperAdmin();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ status: "rejected" })
    .eq("id", profileId);

  if (profileError) return { error: profileError.message };

  await supabase.from("communes").delete().eq("id", communeId);

  return { success: true };
}
