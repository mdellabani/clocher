import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface TriggerPayload {
  type: "INSERT";
  table: "messages";
  record: {
    id: string;
    conversation_id: string;
    sender_id: string;
    body: string;
    created_at: string;
  };
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const payload = (await req.json()) as TriggerPayload;
  if (payload.table !== "messages" || payload.type !== "INSERT") {
    return new Response("Ignored", { status: 200 });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  const { data: conv, error: convErr } = await sb
    .from("conversations")
    .select("user_a, user_b, user_a_last_read_at, user_b_last_read_at")
    .eq("id", payload.record.conversation_id)
    .single();
  if (convErr || !conv) return new Response("Conversation not found", { status: 200 });

  const recipientId =
    conv.user_a === payload.record.sender_id ? conv.user_b : conv.user_a;
  const recipientLastReadAt =
    conv.user_a === recipientId ? conv.user_a_last_read_at : conv.user_b_last_read_at;

  const sinceTs = recipientLastReadAt ?? "1970-01-01T00:00:00Z";
  const { count: priorUnread } = await sb
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("conversation_id", payload.record.conversation_id)
    .neq("sender_id", recipientId)
    .gt("created_at", sinceTs)
    .neq("id", payload.record.id);

  if ((priorUnread ?? 0) >= 1) {
    return new Response("Coalesced", { status: 200 });
  }

  const { data: tokens } = await sb
    .from("push_tokens")
    .select("token")
    .eq("user_id", recipientId);
  if (!tokens || tokens.length === 0) {
    return new Response("No tokens", { status: 200 });
  }

  const { data: senderProfile } = await sb
    .from("profiles")
    .select("display_name")
    .eq("id", payload.record.sender_id)
    .single();

  const title = senderProfile?.display_name ?? "Nouveau message";
  const body = payload.record.body.trim().slice(0, 100);
  const messages = tokens.map((t: { token: string }) => ({
    to: t.token,
    title,
    body,
    data: {
      conversation_id: payload.record.conversation_id,
      message_id: payload.record.id,
      sender_id: payload.record.sender_id,
      url: `/app/messages/${payload.record.conversation_id}`,
    },
    sound: "default",
    categoryId: "message",
    apnsCollapseId: payload.record.conversation_id,
  }));

  const expoResp = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "accept-encoding": "gzip, deflate",
      "content-type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!expoResp.ok) {
    const txt = await expoResp.text();
    console.error("Expo push failed", expoResp.status, txt);
    return new Response("Expo failure", { status: 502 });
  }

  return new Response(JSON.stringify({ sent: messages.length }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});
