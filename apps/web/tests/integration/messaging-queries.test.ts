import { describe, it, beforeAll, beforeEach, expect } from "vitest";
import {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markConversationRead,
  blockUser,
  unblockUser,
  getMyBlocks,
  reportConversation,
} from "@pretou/shared";
import { resetData, serviceClient, signInAs, SEED_IDS } from "./_fixtures";

const JEANNE_ID = "00000000-0000-0000-0000-000000000102";
const JEANNE_EMAIL = "jeanne.l@email.fr";

const POST_ID_ENTRAIDE = "22222222-2222-2222-2222-222222220001";
const POST_ID_ANNONCE = "22222222-2222-2222-2222-222222220002";

async function seedQueryFixtures() {
  const svc = serviceClient();
  await svc.from("profiles").upsert([
    { id: JEANNE_ID, commune_id: SEED_IDS.commune, display_name: "Jeanne Larrieu", role: "resident", status: "active" },
  ]);
  await svc.from("posts").upsert([
    {
      id: POST_ID_ENTRAIDE,
      commune_id: SEED_IDS.commune,
      author_id: JEANNE_ID,
      type: "entraide",
      title: "Garder mon chat",
      body: "Body",
      is_hidden: false,
      epci_visible: false,
    },
    {
      id: POST_ID_ANNONCE,
      commune_id: SEED_IDS.commune,
      author_id: SEED_IDS.admin,
      type: "annonce",
      title: "Coupure d'eau",
      body: "Body",
      is_hidden: false,
      epci_visible: false,
    },
  ]);
}

async function clearMessaging() {
  const svc = serviceClient();
  await svc.from("conversation_reports").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await svc.from("messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await svc.from("conversations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await svc.from("user_blocks").delete().neq("blocker_id", "00000000-0000-0000-0000-000000000000");
}

describe("messaging shared queries", () => {
  beforeAll(async () => {
    await resetData();
    await seedQueryFixtures();
  });

  beforeEach(async () => {
    await clearMessaging();
  });

  describe("getOrCreateConversation", () => {
    it("creates a conversation on first call and reuses it on second", async () => {
      const { supabase } = await signInAs("pierre.m@email.fr");
      const a = await getOrCreateConversation(supabase, { postId: POST_ID_ENTRAIDE, otherUserId: JEANNE_ID });
      expect(a.created).toBe(true);
      const b = await getOrCreateConversation(supabase, { postId: POST_ID_ENTRAIDE, otherUserId: JEANNE_ID });
      expect(b.created).toBe(false);
      expect(b.id).toBe(a.id);
    });

    it("rejects opening a conversation on an annonce", async () => {
      const { supabase } = await signInAs("pierre.m@email.fr");
      await expect(
        getOrCreateConversation(supabase, { postId: POST_ID_ANNONCE, otherUserId: SEED_IDS.admin }),
      ).rejects.toThrow();
    });

    it("rejects messaging yourself", async () => {
      const { supabase } = await signInAs("pierre.m@email.fr");
      await expect(
        getOrCreateConversation(supabase, { postId: POST_ID_ENTRAIDE, otherUserId: SEED_IDS.resident }),
      ).rejects.toThrow();
    });

    it("rejects when blocked by counterpart", async () => {
      await serviceClient().from("user_blocks").insert({ blocker_id: JEANNE_ID, blocked_id: SEED_IDS.resident });
      const { supabase } = await signInAs("pierre.m@email.fr");
      await expect(
        getOrCreateConversation(supabase, { postId: POST_ID_ENTRAIDE, otherUserId: JEANNE_ID }),
      ).rejects.toThrow();
    });
  });

  describe("sendMessage", () => {
    it("inserts a message and trigger updates conversation last_message_*", async () => {
      const { supabase } = await signInAs("pierre.m@email.fr");
      const conv = await getOrCreateConversation(supabase, { postId: POST_ID_ENTRAIDE, otherUserId: JEANNE_ID });
      await sendMessage(supabase, { conversationId: conv.id, body: "Bonjour Jeanne" });
      const { data } = await serviceClient().from("conversations").select().eq("id", conv.id).single();
      expect(data!.last_message_preview).toBe("Bonjour Jeanne");
      expect(data!.last_message_sender_id).toBe(SEED_IDS.resident);
    });

    it("rejects empty body via Zod (before hitting DB)", async () => {
      const { supabase } = await signInAs("pierre.m@email.fr");
      const conv = await getOrCreateConversation(supabase, { postId: POST_ID_ENTRAIDE, otherUserId: JEANNE_ID });
      await expect(sendMessage(supabase, { conversationId: conv.id, body: "   " })).rejects.toThrow();
    });

    it("rejects when blocked", async () => {
      const { supabase } = await signInAs("pierre.m@email.fr");
      const conv = await getOrCreateConversation(supabase, { postId: POST_ID_ENTRAIDE, otherUserId: JEANNE_ID });
      await serviceClient().from("user_blocks").insert({ blocker_id: JEANNE_ID, blocked_id: SEED_IDS.resident });
      await expect(sendMessage(supabase, { conversationId: conv.id, body: "Hey" })).rejects.toThrow();
    });
  });

  describe("getMessages", () => {
    it("returns chronological order", async () => {
      const { supabase } = await signInAs("pierre.m@email.fr");
      const conv = await getOrCreateConversation(supabase, { postId: POST_ID_ENTRAIDE, otherUserId: JEANNE_ID });
      await sendMessage(supabase, { conversationId: conv.id, body: "first" });
      await sendMessage(supabase, { conversationId: conv.id, body: "second" });
      const { messages } = await getMessages(supabase, conv.id);
      expect(messages.map((m) => m.body)).toEqual(["first", "second"]);
    });
  });

  describe("getConversations", () => {
    it("returns my inbox with counterpart info and unread flag", async () => {
      const pierre = await signInAs("pierre.m@email.fr");
      const conv = await getOrCreateConversation(pierre.supabase, { postId: POST_ID_ENTRAIDE, otherUserId: JEANNE_ID });
      // Jeanne sends → pierre is unread
      const jeanne = await signInAs(JEANNE_EMAIL);
      await sendMessage(jeanne.supabase, { conversationId: conv.id, body: "Hi Pierre" });

      const { rows } = await getConversations(pierre.supabase);
      expect(rows).toHaveLength(1);
      expect(rows[0].counterpart.id).toBe(JEANNE_ID);
      expect(rows[0].counterpart.display_name).toBe("Jeanne Larrieu");
      expect(rows[0].post.id).toBe(POST_ID_ENTRAIDE);
      expect(rows[0].unread).toBe(true);
    });

    it("unread becomes false after markConversationRead", async () => {
      const pierre = await signInAs("pierre.m@email.fr");
      const conv = await getOrCreateConversation(pierre.supabase, { postId: POST_ID_ENTRAIDE, otherUserId: JEANNE_ID });
      const jeanne = await signInAs(JEANNE_EMAIL);
      await sendMessage(jeanne.supabase, { conversationId: conv.id, body: "Hi Pierre" });

      await markConversationRead(pierre.supabase, conv.id);
      const { rows } = await getConversations(pierre.supabase);
      expect(rows[0].unread).toBe(false);
    });
  });

  describe("blockUser / unblockUser / getMyBlocks", () => {
    it("blockUser inserts, getMyBlocks reads, unblockUser removes", async () => {
      const { supabase } = await signInAs("pierre.m@email.fr");
      await blockUser(supabase, JEANNE_ID);
      const blocks = await getMyBlocks(supabase);
      expect(blocks.map((b) => b.blocked_id)).toContain(JEANNE_ID);
      await unblockUser(supabase, JEANNE_ID);
      const after = await getMyBlocks(supabase);
      expect(after).toHaveLength(0);
    });
  });

  describe("reportConversation", () => {
    it("participant can report, non-participant cannot", async () => {
      const pierre = await signInAs("pierre.m@email.fr");
      const conv = await getOrCreateConversation(pierre.supabase, { postId: POST_ID_ENTRAIDE, otherUserId: JEANNE_ID });
      await reportConversation(pierre.supabase, { conversationId: conv.id, reason: "spam" });
      const { data } = await serviceClient().from("conversation_reports").select().eq("conversation_id", conv.id);
      expect(data).toHaveLength(1);

      const sophie = await signInAs("moderateur@saintmedard64.fr");
      await expect(
        reportConversation(sophie.supabase, { conversationId: conv.id, reason: "spam2" }),
      ).rejects.toThrow();
    });
  });
});
