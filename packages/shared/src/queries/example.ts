import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.js";

export async function getExample(client: SupabaseClient<Database>) {
  return client.from("example").select("*").order("created_at", { ascending: false });
}
