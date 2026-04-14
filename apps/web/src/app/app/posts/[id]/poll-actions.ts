"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function voteAction(optionId: string, pollId: string, allowMultiple: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  if (!allowMultiple) {
    // Remove existing votes on this poll for this user
    const { data: options } = await supabase
      .from("poll_options")
      .select("id")
      .eq("poll_id", pollId);

    if (options && options.length > 0) {
      await supabase
        .from("poll_votes")
        .delete()
        .in(
          "poll_option_id",
          options.map((o) => o.id)
        )
        .eq("user_id", user.id);
    }
  }

  const { error } = await supabase
    .from("poll_votes")
    .upsert({ poll_option_id: optionId, user_id: user.id });

  if (error) return { error: "Erreur lors du vote" };

  revalidatePath("/app/posts");
  return { error: null };
}

export async function removeVoteAction(optionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase
    .from("poll_votes")
    .delete()
    .eq("poll_option_id", optionId)
    .eq("user_id", user.id);

  if (error) return { error: "Erreur lors du suppression du vote" };

  revalidatePath("/app/posts");
  return { error: null };
}
