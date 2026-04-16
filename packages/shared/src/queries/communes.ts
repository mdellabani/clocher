import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;

export async function getCommune(client: Client, communeId: string) {
  return client.from("communes").select("*").eq("id", communeId).single();
}

export async function getCommuneBySlug(client: Client, slug: string) {
  return client.from("communes").select("*").eq("slug", slug).single();
}

export async function getCommunesByEpci(client: Client, epciId: string) {
  return client.from("communes").select("id, name, slug").eq("epci_id", epciId);
}

export async function getAllCommunes(client: Client) {
  return client.from("communes").select("id, name, slug, code_postal").order("name");
}

export async function getCommuneByInviteCode(client: Client, inviteCode: string) {
  return client.from("communes").select("id, name, slug").eq("invite_code", inviteCode).single();
}

export async function createCommune(client: Client, data: {
  name: string;
  slug: string;
  code_postal: string;
}) {
  return client
    .from("communes")
    .insert({ name: data.name, slug: data.slug, code_postal: data.code_postal })
    .select("id, name, slug, invite_code")
    .single();
}

export async function getCommuneByDomain(client: Client, domain: string) {
  return client
    .from("communes")
    .select("id, slug, custom_domain, domain_verified")
    .eq("custom_domain", domain)
    .eq("domain_verified", true)
    .single();
}
