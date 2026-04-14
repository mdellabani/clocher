"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPostSchema, createPoll } from "@rural-community-platform/shared";
import type { CreatePollInput } from "@rural-community-platform/shared";

export async function createPostAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifie" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("commune_id, role, status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "active")
    return { error: "Compte non approuve" };

  const raw = {
    title: formData.get("title") as string,
    body: formData.get("body") as string,
    type: formData.get("type") as string,
    event_date: formData.get("event_date") ? new Date(formData.get("event_date") as string).toISOString() : null,
    event_location: (formData.get("event_location") as string) || null,
    epci_visible: formData.get("epci_visible") === "true",
  };

  const parsed = createPostSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  if (parsed.data.type === "annonce" && profile.role !== "admin") {
    return {
      error:
        "Seuls les administrateurs peuvent publier des annonces officielles",
    };
  }

  let expiresAt: string | null = null;
  if (parsed.data.type === "service") {
    expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      ...parsed.data,
      commune_id: profile.commune_id,
      author_id: user.id,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error || !post) return { error: "Erreur lors de la publication" };

  // Create poll if provided
  const pollDataStr = formData.get("poll_data") as string | null;
  if (pollDataStr) {
    const pollData: CreatePollInput = JSON.parse(pollDataStr);
    const { error: pollError } = await createPoll(supabase, post.id, pollData);
    if (pollError) {
      // Post was created but poll failed — still return success
      // (post is visible, poll creation failed)
      console.error("Poll creation error:", pollError);
    }
  }

  revalidatePath("/app/feed");
  return { error: null };
}
