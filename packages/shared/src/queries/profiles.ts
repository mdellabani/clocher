import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;

export async function getProfile(client: Client, userId: string) {
  return client.from("profiles").select("*, communes(name, slug, epci_id, theme, motto, custom_primary_color)").eq("id", userId).single();
}

export async function createProfile(client: Client, userId: string, communeId: string, displayName: string) {
  return client
    .from("profiles")
    .insert({ id: userId, commune_id: communeId, display_name: displayName })
    .select()
    .single();
}

export async function updateProfile(client: Client, userId: string, data: { display_name?: string; avatar_url?: string | null }) {
  return client.from("profiles").update(data).eq("id", userId).select().single();
}

export async function getMyPosts(client: Client, userId: string) {
  return client
    .from("posts")
    .select("id, title, type, created_at, is_pinned, comments(count)")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });
}

export async function getMyComments(client: Client, userId: string) {
  return client
    .from("comments")
    .select("id, body, created_at, posts!post_id(id, title, type)")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });
}

export async function getMyRsvps(client: Client, userId: string) {
  return client
    .from("rsvps")
    .select("status, posts!post_id(id, title, type, event_date, event_location)")
    .eq("user_id", userId);
}
