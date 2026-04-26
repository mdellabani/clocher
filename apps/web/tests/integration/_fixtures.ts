import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!ANON_KEY) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY missing in test env");
if (!SERVICE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing in test env");

const SEED_SQL = readFileSync(resolve(__dirname, "_seed.sql"), "utf8");

// CASCADE auto-clears child rows (rsvps→posts, messages→conversations, etc.).
// epci is intentionally excluded — it's reference data seeded by
// supabase/seed.sql and FK'd from communes; truncating it would
// cascade-delete every commune.
const TABLES_TO_TRUNCATE = [
  "audit_log",
  "reports",
  "conversation_reports",
  "messages",
  "conversations",
  "user_blocks",
  "poll_votes",
  "poll_options",
  "polls",
  "post_images",
  "rsvps",
  "posts",
  "page_sections",
  "council_documents",
  "producers",
  "word_filters",
  "push_tokens",
  "profiles",
  "communes",
];

export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function signInAs(email: string, password = "demo1234") {
  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`signInAs(${email}) failed: ${error?.message}`);
  return { supabase, user: data.user };
}

export async function resetData() {
  const svc = serviceClient();
  const truncate = `TRUNCATE ${TABLES_TO_TRUNCATE.map((t) => `"public"."${t}"`).join(", ")} CASCADE;`;
  const { error: tErr } = await svc.rpc("exec_sql", { sql: truncate });
  if (tErr) throw new Error(`Truncate failed: ${tErr.message}`);
  const { error: sErr } = await svc.rpc("exec_sql", { sql: SEED_SQL });
  if (sErr) throw new Error(`Seed failed: ${sErr.message}`);
}

export async function getCommune(id: string) {
  const { data } = await serviceClient().from("communes").select("*").eq("id", id).single();
  return data;
}

export async function getProfile(id: string) {
  const { data } = await serviceClient().from("profiles").select("*").eq("id", id).single();
  return data;
}

export async function getPost(id: string) {
  const { data } = await serviceClient().from("posts").select("*").eq("id", id).single();
  return data;
}

export const SEED_IDS = {
  commune: "00000000-0000-0000-0000-000000000010",
  admin: "00000000-0000-0000-0000-000000000100",
  moderator: "00000000-0000-0000-0000-000000000103",
  resident: "00000000-0000-0000-0000-000000000101",
} as const;

export const SEED_EMAILS = {
  admin: "secretaire@saintmedard64.fr",
  moderator: "moderateur@saintmedard64.fr",
  resident: "pierre.m@email.fr",
} as const;
