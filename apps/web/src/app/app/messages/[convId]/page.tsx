import { createClient } from "@/lib/supabase/server";
import { ThreadClient } from "./thread-client";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ convId: string }>;
}) {
  const { convId } = await params;
  const supabase = await createClient();

  const { data: me } = await supabase.auth.getUser();
  if (!me.user) {
    return <p className="px-4 py-8 text-sm">Vous devez être connecté.</p>;
  }

  const { data: conv } = await supabase
    .from("conversations")
    .select(
      `
      id, post_id, user_a, user_b,
      post:posts(id, title, type),
      ua:profiles!conversations_user_a_fkey(id, display_name, commune:communes(id, name, slug)),
      ub:profiles!conversations_user_b_fkey(id, display_name, commune:communes(id, name, slug))
    `,
    )
    .eq("id", convId)
    .single();

  if (!conv) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-[#5a4030]">Conversation introuvable.</p>
      </main>
    );
  }

  const ua = conv.ua as unknown as {
    id: string;
    display_name: string;
    commune: { id: string; name: string; slug: string } | null;
  };
  const ub = conv.ub as unknown as {
    id: string;
    display_name: string;
    commune: { id: string; name: string; slug: string } | null;
  };
  const post = conv.post as unknown as {
    id: string;
    title: string;
    type: string;
  };

  const counterpart = conv.user_a === me.user.id ? ub : ua;
  const myCommune = conv.user_a === me.user.id ? ua.commune : ub.commune;
  const isCrossCommune =
    !!counterpart.commune &&
    !!myCommune &&
    counterpart.commune.id !== myCommune.id;

  return (
    <ThreadClient
      conversationId={conv.id}
      myUserId={me.user.id}
      counterpart={{
        id: counterpart.id,
        display_name: counterpart.display_name,
        commune: counterpart.commune,
      }}
      post={post}
      isCrossCommune={isCrossCommune}
    />
  );
}
