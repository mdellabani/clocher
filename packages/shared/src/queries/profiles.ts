import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;

export async function getProfile(client: Client, userId: string) {
  return client.from("profiles").select("*, communes(name, slug, epci_id, theme, motto)").eq("id", userId).single();
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
