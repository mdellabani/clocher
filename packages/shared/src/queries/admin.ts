import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;

export async function getPendingUsers(client: Client, communeId: string) {
  return client
    .from("profiles")
    .select("id, display_name, created_at")
    .eq("commune_id", communeId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
}

export async function approveUser(client: Client, userId: string) {
  return client.from("profiles").update({ status: "active" }).eq("id", userId);
}

export async function rejectUser(client: Client, userId: string) {
  return client.from("profiles").update({ status: "rejected" }).eq("id", userId);
}

export async function promoteToAdmin(client: Client, userId: string) {
  return client.from("profiles").update({ role: "admin" }).eq("id", userId);
}

export async function demoteToResident(client: Client, userId: string) {
  return client.from("profiles").update({ role: "resident" }).eq("id", userId);
}

export async function promoteToModerator(client: Client, userId: string) {
  return client.from("profiles").update({ role: "moderator" }).eq("id", userId);
}

export async function getCommuneMembers(client: Client, communeId: string) {
  return client
    .from("profiles")
    .select("id, display_name, role, status, created_at")
    .eq("commune_id", communeId)
    .order("created_at", { ascending: false });
}

export async function getCouncilDocsByCommune(client: Client, communeId: string) {
  return client
    .from("council_documents")
    .select("id, title, category, document_date, storage_path")
    .eq("commune_id", communeId)
    .order("document_date", { ascending: false });
}

export async function getPostsThisWeekCount(client: Client, communeId: string): Promise<number> {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const { count } = await client
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("commune_id", communeId)
    .gte("created_at", oneWeekAgo.toISOString());
  return count ?? 0;
}
