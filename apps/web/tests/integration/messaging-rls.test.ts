import { describe, it, beforeAll, beforeEach, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resetData, serviceClient, signInAs, SEED_IDS } from "./_fixtures";

// IDs from supabase/seed.sql auth users (NOT in tests/_seed.sql profiles).
// We add their profiles in beforeAll via the service client.
const JEANNE_ID = "00000000-0000-0000-0000-000000000102";
const JEANNE_EMAIL = "jeanne.l@email.fr";

const ARTHEZ_COMMUNE_ID = "00000000-0000-0000-0000-000000000011";
const ARTHEZ_EPCI_ID = "00000000-0000-0000-0000-000000000001";
const MARIE_ID = "00000000-0000-0000-0000-000000000201";
const MARIE_EMAIL = "marie.d@email.fr";

const POST_ID_ENTRAIDE = "11111111-1111-1111-1111-111111110001";
const POST_ID_SERVICE = "11111111-1111-1111-1111-111111110002";
const POST_ID_ANNONCE = "11111111-1111-1111-1111-111111110003";
const POST_ID_HIDDEN = "11111111-1111-1111-1111-111111110004";
const POST_ID_ARTHEZ = "11111111-1111-1111-1111-111111110005";

function pair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

async function seedProfilesAndPosts() {
  const svc = serviceClient();

  // Ensure Saint-Médard is linked to the same EPCI as Arthez (the test
  // _seed.sql doesn't set epci_id, which breaks the EPCI-visible posts
  // policy needed for cross-commune conversation tests).
  const r0 = await svc.from("communes").update({ epci_id: ARTHEZ_EPCI_ID }).eq("id", SEED_IDS.commune);
  if (r0.error) throw new Error(`seed commune(stmed epci): ${r0.error.message}`);

  const r1 = await svc.from("profiles").upsert([
    { id: JEANNE_ID, commune_id: SEED_IDS.commune, display_name: "Jeanne Larrieu", role: "resident", status: "active" },
  ]);
  if (r1.error) throw new Error(`seed profiles(jeanne): ${r1.error.message}`);

  const r2 = await svc.from("communes").upsert({
    id: ARTHEZ_COMMUNE_ID,
    epci_id: ARTHEZ_EPCI_ID,
    name: "Arthez-de-Béarn",
    slug: "arthez-de-bearn",
    code_postal: "64370",
    theme: "alpin",
    motto: "Test",
    invite_code: "arthz1",
  });
  if (r2.error) throw new Error(`seed commune(arthez): ${r2.error.message}`);

  const r3 = await svc.from("profiles").upsert([
    { id: MARIE_ID, commune_id: ARTHEZ_COMMUNE_ID, display_name: "Marie Ducasse", role: "resident", status: "active" },
  ]);
  if (r3.error) throw new Error(`seed profiles(marie): ${r3.error.message}`);

  // Posts
  const rPosts = await svc.from("posts").upsert([
    {
      id: POST_ID_ENTRAIDE,
      commune_id: SEED_IDS.commune,
      author_id: JEANNE_ID,
      type: "entraide",
      title: "Garder mon chat",
      body: "Je cherche quelqu'un pour garder mon chat ce week-end.",
      is_hidden: false,
      epci_visible: false,
    },
    {
      id: POST_ID_SERVICE,
      commune_id: SEED_IDS.commune,
      author_id: SEED_IDS.resident,
      type: "service",
      title: "Tonte de pelouse",
      body: "Service de tonte de pelouse, 15€/heure.",
      is_hidden: false,
      epci_visible: false,
    },
    {
      id: POST_ID_ANNONCE,
      commune_id: SEED_IDS.commune,
      author_id: SEED_IDS.admin,
      type: "annonce",
      title: "Coupure d'eau",
      body: "Coupure d'eau prévue mardi de 9h à 12h.",
      is_hidden: false,
      epci_visible: false,
    },
    {
      id: POST_ID_HIDDEN,
      commune_id: SEED_IDS.commune,
      author_id: JEANNE_ID,
      type: "entraide",
      title: "Hidden post",
      body: "Body",
      is_hidden: true,
      epci_visible: false,
    },
    {
      id: POST_ID_ARTHEZ,
      commune_id: ARTHEZ_COMMUNE_ID,
      author_id: MARIE_ID,
      type: "entraide",
      title: "Marie's Arthez post",
      body: "Body",
      is_hidden: false,
      epci_visible: true,
    },
  ]);
  if (rPosts.error) throw new Error(`seed posts: ${rPosts.error.message}`);
}

async function clearMessagingTables() {
  const svc = serviceClient();
  await svc.from("conversation_reports").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await svc.from("messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await svc.from("conversations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await svc.from("user_blocks").delete().neq("blocker_id", "00000000-0000-0000-0000-000000000000");
}

async function seedConv(postId: string, userA: string, userB: string): Promise<string> {
  const [a, b] = pair(userA, userB);
  const { data, error } = await serviceClient()
    .from("conversations")
    .insert({ post_id: postId, user_a: a, user_b: b })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

describe("messaging RLS", () => {
  beforeAll(async () => {
    await resetData();
    await seedProfilesAndPosts();
  });

  beforeEach(async () => {
    await clearMessagingTables();
  });

  // ============================================================
  // conversations SELECT — 7 cases (super-admin variant skipped:
  // no is_super_admin() SQL function — service-role bypasses RLS)
  // ============================================================
  describe("conversations SELECT", () => {
    it("1. participant user_a sees the conversation", async () => {
      const convId = await seedConv(POST_ID_ENTRAIDE, SEED_IDS.resident, JEANNE_ID);
      const { supabase } = await signInAs("pierre.m@email.fr");
      const { data, error } = await supabase.from("conversations").select().eq("id", convId);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it("2. participant user_b sees the conversation", async () => {
      const convId = await seedConv(POST_ID_ENTRAIDE, SEED_IDS.resident, JEANNE_ID);
      const { supabase } = await signInAs(JEANNE_EMAIL);
      const { data } = await supabase.from("conversations").select().eq("id", convId);
      expect(data).toHaveLength(1);
    });

    it("3. non-participant sees zero rows", async () => {
      const convId = await seedConv(POST_ID_ENTRAIDE, SEED_IDS.resident, JEANNE_ID);
      const { supabase } = await signInAs("moderateur@saintmedard64.fr");
      const { data } = await supabase.from("conversations").select().eq("id", convId);
      expect(data).toEqual([]);
    });

    it("4. blocked-by-counterpart sees zero rows", async () => {
      const convId = await seedConv(POST_ID_ENTRAIDE, SEED_IDS.resident, JEANNE_ID);
      // Jeanne blocks Pierre
      await serviceClient().from("user_blocks").insert({ blocker_id: JEANNE_ID, blocked_id: SEED_IDS.resident });
      const { supabase } = await signInAs("pierre.m@email.fr");
      const { data } = await supabase.from("conversations").select().eq("id", convId);
      expect(data).toEqual([]);
    });

    it("5. blocker sees zero rows (symmetric block)", async () => {
      const convId = await seedConv(POST_ID_ENTRAIDE, SEED_IDS.resident, JEANNE_ID);
      // Pierre blocks Jeanne
      await serviceClient().from("user_blocks").insert({ blocker_id: SEED_IDS.resident, blocked_id: JEANNE_ID });
      const { supabase } = await signInAs(JEANNE_EMAIL);
      const { data } = await supabase.from("conversations").select().eq("id", convId);
      expect(data).toEqual([]);
    });

    it("6. cross-commune (same EPCI) participants both see the conversation", async () => {
      const convId = await seedConv(POST_ID_ARTHEZ, SEED_IDS.resident, MARIE_ID);
      const pierre = await signInAs("pierre.m@email.fr");
      const marie = await signInAs(MARIE_EMAIL);
      const a = await pierre.supabase.from("conversations").select().eq("id", convId);
      const b = await marie.supabase.from("conversations").select().eq("id", convId);
      expect(a.data).toHaveLength(1);
      expect(b.data).toHaveLength(1);
    });

    it("7. unauthenticated client sees zero rows", async () => {
      await seedConv(POST_ID_ENTRAIDE, SEED_IDS.resident, JEANNE_ID);
      const anon = await import("@supabase/supabase-js").then((m) =>
        m.createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
      );
      const { data } = await anon.from("conversations").select();
      expect(data).toEqual([]);
    });
  });

  // ============================================================
  // conversations INSERT — 8 cases (different-EPCI variant skipped)
  // ============================================================
  describe("conversations INSERT", () => {
    it("1. participant can start conversation on a non-annonce post", async () => {
      const { supabase } = await signInAs("pierre.m@email.fr");
      const [a, b] = pair(SEED_IDS.resident, JEANNE_ID);
      const { data, error } = await supabase
        .from("conversations")
        .insert({ post_id: POST_ID_ENTRAIDE, user_a: a, user_b: b })
        .select();
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it("2. cannot insert when neither user_a nor user_b is the caller", async () => {
      const { supabase } = await signInAs("pierre.m@email.fr");
      const [a, b] = pair(JEANNE_ID, SEED_IDS.moderator);
      const { error } = await supabase
        .from("conversations")
        .insert({ post_id: POST_ID_ENTRAIDE, user_a: a, user_b: b });
      expect(error).not.toBeNull();
    });

    it("3. cannot start conversation on an annonce", async () => {
      const { supabase } = await signInAs("pierre.m@email.fr");
      const [a, b] = pair(SEED_IDS.resident, JEANNE_ID);
      const { error } = await supabase
        .from("conversations")
        .insert({ post_id: POST_ID_ANNONCE, user_a: a, user_b: b });
      expect(error).not.toBeNull();
    });

    it("4. cannot start conversation on a hidden post", async () => {
      const { supabase } = await signInAs("pierre.m@email.fr");
      const [a, b] = pair(SEED_IDS.resident, JEANNE_ID);
      const { error } = await supabase
        .from("conversations")
        .insert({ post_id: POST_ID_HIDDEN, user_a: a, user_b: b });
      expect(error).not.toBeNull();
    });

    it("5. cannot start conversation with self on own post", async () => {
      const { supabase } = await signInAs(JEANNE_EMAIL);
      // Jeanne tries to make a conversation with herself on her own post — CHECK violation.
      const { error } = await supabase
        .from("conversations")
        .insert({ post_id: POST_ID_ENTRAIDE, user_a: JEANNE_ID, user_b: JEANNE_ID });
      expect(error).not.toBeNull();
    });

    it("6. cannot start conversation when blocker has blocked", async () => {
      // Jeanne blocked Pierre. Pierre tries to start conv anyway.
      await serviceClient().from("user_blocks").insert({ blocker_id: JEANNE_ID, blocked_id: SEED_IDS.resident });
      const { supabase } = await signInAs("pierre.m@email.fr");
      const [a, b] = pair(SEED_IDS.resident, JEANNE_ID);
      const { error } = await supabase
        .from("conversations")
        .insert({ post_id: POST_ID_ENTRAIDE, user_a: a, user_b: b });
      expect(error).not.toBeNull();
    });

    it("7. can start conversation cross-commune within same EPCI", async () => {
      const { supabase } = await signInAs("pierre.m@email.fr");
      const [a, b] = pair(SEED_IDS.resident, MARIE_ID);
      const { data, error } = await supabase
        .from("conversations")
        .insert({ post_id: POST_ID_ARTHEZ, user_a: a, user_b: b })
        .select();
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it("8. unauthenticated cannot insert anything", async () => {
      const anon = await import("@supabase/supabase-js").then((m) =>
        m.createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
      );
      const [a, b] = pair(SEED_IDS.resident, JEANNE_ID);
      const { error } = await anon
        .from("conversations")
        .insert({ post_id: POST_ID_ENTRAIDE, user_a: a, user_b: b });
      expect(error).not.toBeNull();
    });
  });

  // ============================================================
  // messages SELECT — 5 cases (super-admin variant skipped)
  // ============================================================
  describe("messages SELECT", () => {
    async function seedConvAndMessages(): Promise<string> {
      const convId = await seedConv(POST_ID_ENTRAIDE, SEED_IDS.resident, JEANNE_ID);
      await serviceClient().from("messages").insert([
        { conversation_id: convId, sender_id: SEED_IDS.resident, body: "Bonjour" },
        { conversation_id: convId, sender_id: JEANNE_ID, body: "Salut" },
      ]);
      return convId;
    }

    it("1. participant user_a sees all messages", async () => {
      const convId = await seedConvAndMessages();
      const { supabase } = await signInAs("pierre.m@email.fr");
      const { data } = await supabase.from("messages").select().eq("conversation_id", convId);
      expect(data).toHaveLength(2);
    });

    it("2. participant user_b sees all messages", async () => {
      const convId = await seedConvAndMessages();
      const { supabase } = await signInAs(JEANNE_EMAIL);
      const { data } = await supabase.from("messages").select().eq("conversation_id", convId);
      expect(data).toHaveLength(2);
    });

    it("3. non-participant sees zero rows", async () => {
      const convId = await seedConvAndMessages();
      const { supabase } = await signInAs("moderateur@saintmedard64.fr");
      const { data } = await supabase.from("messages").select().eq("conversation_id", convId);
      expect(data).toEqual([]);
    });

    it("4. participant blocked by counterpart sees zero rows", async () => {
      const convId = await seedConvAndMessages();
      await serviceClient().from("user_blocks").insert({ blocker_id: JEANNE_ID, blocked_id: SEED_IDS.resident });
      const { supabase } = await signInAs("pierre.m@email.fr");
      const { data } = await supabase.from("messages").select().eq("conversation_id", convId);
      expect(data).toEqual([]);
    });

    it("5. unauthenticated sees zero rows", async () => {
      await seedConvAndMessages();
      const anon = await import("@supabase/supabase-js").then((m) =>
        m.createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
      );
      const { data } = await anon.from("messages").select();
      expect(data).toEqual([]);
    });
  });

  // ============================================================
  // messages INSERT — 6 cases
  // ============================================================
  describe("messages INSERT", () => {
    it("1. participant inserts message as themselves", async () => {
      const convId = await seedConv(POST_ID_ENTRAIDE, SEED_IDS.resident, JEANNE_ID);
      const { supabase } = await signInAs("pierre.m@email.fr");
      const { error } = await supabase
        .from("messages")
        .insert({ conversation_id: convId, sender_id: SEED_IDS.resident, body: "Coucou" });
      expect(error).toBeNull();
    });

    it("2. cannot impersonate another sender", async () => {
      const convId = await seedConv(POST_ID_ENTRAIDE, SEED_IDS.resident, JEANNE_ID);
      const { supabase } = await signInAs("pierre.m@email.fr");
      const { error } = await supabase
        .from("messages")
        .insert({ conversation_id: convId, sender_id: JEANNE_ID, body: "I am Jeanne" });
      expect(error).not.toBeNull();
    });

    it("3. non-participant cannot send into conversation", async () => {
      const convId = await seedConv(POST_ID_ENTRAIDE, SEED_IDS.resident, JEANNE_ID);
      const { supabase, user } = await signInAs("moderateur@saintmedard64.fr");
      const { error } = await supabase
        .from("messages")
        .insert({ conversation_id: convId, sender_id: user.id, body: "Hello" });
      expect(error).not.toBeNull();
    });

    it("4. blocked party cannot send", async () => {
      const convId = await seedConv(POST_ID_ENTRAIDE, SEED_IDS.resident, JEANNE_ID);
      await serviceClient().from("user_blocks").insert({ blocker_id: JEANNE_ID, blocked_id: SEED_IDS.resident });
      const { supabase } = await signInAs("pierre.m@email.fr");
      const { error } = await supabase
        .from("messages")
        .insert({ conversation_id: convId, sender_id: SEED_IDS.resident, body: "Still trying" });
      expect(error).not.toBeNull();
    });

    it("5. empty body is rejected by CHECK", async () => {
      const convId = await seedConv(POST_ID_ENTRAIDE, SEED_IDS.resident, JEANNE_ID);
      const { supabase } = await signInAs("pierre.m@email.fr");
      const { error } = await supabase
        .from("messages")
        .insert({ conversation_id: convId, sender_id: SEED_IDS.resident, body: "   " });
      expect(error).not.toBeNull();
    });

    it("6. body over 4000 chars is rejected by CHECK", async () => {
      const convId = await seedConv(POST_ID_ENTRAIDE, SEED_IDS.resident, JEANNE_ID);
      const { supabase } = await signInAs("pierre.m@email.fr");
      const { error } = await supabase
        .from("messages")
        .insert({ conversation_id: convId, sender_id: SEED_IDS.resident, body: "x".repeat(5000) });
      expect(error).not.toBeNull();
    });
  });

  // ============================================================
  // user_blocks — 5 cases
  // ============================================================
  describe("user_blocks", () => {
    it("1. user can insert their own block", async () => {
      const { supabase } = await signInAs("pierre.m@email.fr");
      const { error } = await supabase
        .from("user_blocks")
        .insert({ blocker_id: SEED_IDS.resident, blocked_id: JEANNE_ID });
      expect(error).toBeNull();
    });

    it("2. cannot impersonate another blocker", async () => {
      const { supabase } = await signInAs("pierre.m@email.fr");
      const { error } = await supabase
        .from("user_blocks")
        .insert({ blocker_id: JEANNE_ID, blocked_id: SEED_IDS.resident });
      expect(error).not.toBeNull();
    });

    it("3. cannot block yourself (CHECK)", async () => {
      const { supabase } = await signInAs("pierre.m@email.fr");
      const { error } = await supabase
        .from("user_blocks")
        .insert({ blocker_id: SEED_IDS.resident, blocked_id: SEED_IDS.resident });
      expect(error).not.toBeNull();
    });

    it("4. user only sees their own blocks", async () => {
      await serviceClient().from("user_blocks").insert([
        { blocker_id: SEED_IDS.resident, blocked_id: JEANNE_ID },
        { blocker_id: JEANNE_ID, blocked_id: SEED_IDS.resident },
        { blocker_id: SEED_IDS.moderator, blocked_id: JEANNE_ID },
      ]);
      const { supabase } = await signInAs("pierre.m@email.fr");
      const { data } = await supabase.from("user_blocks").select();
      expect(data).toHaveLength(1);
      expect(data?.[0].blocker_id).toBe(SEED_IDS.resident);
    });

    it("5. user can delete their own block (unblock)", async () => {
      await serviceClient().from("user_blocks").insert({ blocker_id: SEED_IDS.resident, blocked_id: JEANNE_ID });
      const { supabase } = await signInAs("pierre.m@email.fr");
      const { error } = await supabase
        .from("user_blocks")
        .delete()
        .match({ blocker_id: SEED_IDS.resident, blocked_id: JEANNE_ID });
      expect(error).toBeNull();
      // Verify it's gone
      const after = await serviceClient().from("user_blocks").select().eq("blocker_id", SEED_IDS.resident);
      expect(after.data).toEqual([]);
    });
  });

  // ============================================================
  // conversation_reports — 3 cases
  // (super-admin select-all and update cases skipped: no is_super_admin policy)
  // ============================================================
  describe("conversation_reports", () => {
    it("1. participant can report their conversation", async () => {
      const convId = await seedConv(POST_ID_ENTRAIDE, SEED_IDS.resident, JEANNE_ID);
      const { supabase } = await signInAs("pierre.m@email.fr");
      const { error } = await supabase
        .from("conversation_reports")
        .insert({ conversation_id: convId, reporter_id: SEED_IDS.resident, reason: "spam" });
      expect(error).toBeNull();
    });

    it("2. non-participant cannot report a conversation", async () => {
      const convId = await seedConv(POST_ID_ENTRAIDE, SEED_IDS.resident, JEANNE_ID);
      const { supabase, user } = await signInAs("moderateur@saintmedard64.fr");
      const { error } = await supabase
        .from("conversation_reports")
        .insert({ conversation_id: convId, reporter_id: user.id, reason: "spam" });
      expect(error).not.toBeNull();
    });

    it("3. cannot impersonate another reporter", async () => {
      const convId = await seedConv(POST_ID_ENTRAIDE, SEED_IDS.resident, JEANNE_ID);
      const { supabase } = await signInAs("pierre.m@email.fr");
      const { error } = await supabase
        .from("conversation_reports")
        .insert({ conversation_id: convId, reporter_id: JEANNE_ID, reason: "spam" });
      expect(error).not.toBeNull();
    });
  });

  // ============================================================
  // posts SELECT — block-extension
  // ============================================================
  describe("posts SELECT block-extension", () => {
    it("1. blocked author's posts disappear from the blocker's feed", async () => {
      await serviceClient().from("user_blocks").insert({ blocker_id: SEED_IDS.resident, blocked_id: JEANNE_ID });
      const { supabase } = await signInAs("pierre.m@email.fr");
      const { data } = await supabase.from("posts").select().eq("author_id", JEANNE_ID);
      expect(data).toEqual([]);
    });

    it("2. unblocking restores the posts", async () => {
      await serviceClient().from("user_blocks").insert({ blocker_id: SEED_IDS.resident, blocked_id: JEANNE_ID });
      const blockedClient = (await signInAs("pierre.m@email.fr")).supabase;
      await blockedClient
        .from("user_blocks")
        .delete()
        .match({ blocker_id: SEED_IDS.resident, blocked_id: JEANNE_ID });
      const { data } = await blockedClient.from("posts").select().eq("author_id", JEANNE_ID);
      expect((data ?? []).length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // Helpers + RPC — 5 cases
  // ============================================================
  describe("helpers + mark_conversation_read", () => {
    it("1. are_users_blocked is true after a block", async () => {
      await serviceClient().from("user_blocks").insert({ blocker_id: JEANNE_ID, blocked_id: SEED_IDS.resident });
      const { data } = await serviceClient().rpc("are_users_blocked", { a: SEED_IDS.resident, b: JEANNE_ID });
      expect(data).toBe(true);
    });

    it("2. are_users_blocked is false after unblock", async () => {
      const { data } = await serviceClient().rpc("are_users_blocked", { a: SEED_IDS.resident, b: JEANNE_ID });
      expect(data).toBe(false);
    });

    it("3. mark_conversation_read updates only the caller's last_read_at", async () => {
      const convId = await seedConv(POST_ID_ENTRAIDE, SEED_IDS.resident, JEANNE_ID);
      const { supabase } = await signInAs("pierre.m@email.fr");
      const { error } = await supabase.rpc("mark_conversation_read", { conv_id: convId });
      expect(error).toBeNull();
      const { data } = await serviceClient().from("conversations").select().eq("id", convId).single();
      // Pierre is whichever side has the smaller UUID
      if (data!.user_a === SEED_IDS.resident) {
        expect(data!.user_a_last_read_at).not.toBeNull();
        expect(data!.user_b_last_read_at).toBeNull();
      } else {
        expect(data!.user_b_last_read_at).not.toBeNull();
        expect(data!.user_a_last_read_at).toBeNull();
      }
    });

    it("4. mark_conversation_read on a foreign conversation is a no-op", async () => {
      const convId = await seedConv(POST_ID_ENTRAIDE, SEED_IDS.resident, JEANNE_ID);
      const before = (await serviceClient().from("conversations").select().eq("id", convId).single()).data!;
      const { supabase } = await signInAs("moderateur@saintmedard64.fr");
      const { error } = await supabase.rpc("mark_conversation_read", { conv_id: convId });
      // RPC succeeds (no error) but the WHERE filters the row out.
      expect(error).toBeNull();
      const after = (await serviceClient().from("conversations").select().eq("id", convId).single()).data!;
      expect(after.user_a_last_read_at).toBe(before.user_a_last_read_at);
      expect(after.user_b_last_read_at).toBe(before.user_b_last_read_at);
    });

    it("5. direct UPDATE of last_read_at is rejected (no UPDATE policy on conversations)", async () => {
      const convId = await seedConv(POST_ID_ENTRAIDE, SEED_IDS.resident, JEANNE_ID);
      const { supabase } = await signInAs("pierre.m@email.fr");
      const { data } = await supabase
        .from("conversations")
        .update({ user_a_last_read_at: new Date().toISOString() })
        .eq("id", convId)
        .select();
      // No UPDATE policy → silent zero rows affected.
      expect(data).toEqual([]);
    });
  });
});
