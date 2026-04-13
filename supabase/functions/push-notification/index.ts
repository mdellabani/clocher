import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const { record } = await req.json();

  if (record.type !== "annonce") {
    return new Response("Not an announcement", { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: profiles } = await supabase
    .from("profiles")
    .select("push_token")
    .eq("commune_id", record.commune_id)
    .eq("status", "active")
    .not("push_token", "is", null);

  if (!profiles || profiles.length === 0) {
    return new Response("No tokens", { status: 200 });
  }

  const tokens = profiles.map((p) => p.push_token).filter(Boolean);

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      tokens.map((token) => ({
        to: token,
        title: "Annonce officielle",
        body: record.title,
        data: { postId: record.id },
      }))
    ),
  });

  const result = await response.json();
  return new Response(JSON.stringify(result), { status: 200 });
});
