"use server";

import { createClient } from "@/lib/supabase/server";
import { createPostSchema, createPoll } from "@pretou/shared";
import type { CreatePollInput } from "@pretou/shared";

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

  // Rate limiting (residents only)
  if (profile.role === "resident") {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: dailyCount } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", user.id)
      .gte("created_at", oneDayAgo);

    if ((dailyCount ?? 0) >= 5) {
      return { error: "Vous avez atteint la limite de publications pour aujourd'hui (5 maximum)", warning: undefined };
    }

    if (parsed.data.type === "service") {
      const { count: serviceCount } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("author_id", user.id)
        .eq("type", "service")
        .gte("created_at", oneDayAgo);

      if ((serviceCount ?? 0) >= 2) {
        return { error: "Vous avez atteint la limite d'annonces de service pour aujourd'hui (2 maximum)", warning: undefined };
      }
    }
  }

  // Word filter check
  const { data: bannedWords } = await supabase.from("word_filters").select("word");
  if (bannedWords && bannedWords.length > 0) {
    const text = `${parsed.data.title} ${parsed.data.body}`;
    const matchedWord = bannedWords.find((w) => {
      const escaped = w.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "i");
      return regex.test(text);
    });

    if (matchedWord) {
      // Insert post as hidden
      const { data: post, error } = await supabase
        .from("posts")
        .insert({
          ...parsed.data,
          commune_id: profile.commune_id,
          author_id: user.id,
          expires_at: expiresAt,
          is_hidden: true,
        })
        .select()
        .single();

      if (error || !post) return { error: "Erreur lors de la publication", warning: undefined };

      // Auto-report with system category
      await supabase.from("reports").insert({
        post_id: post.id,
        reporter_id: user.id,
        category: "autre",
        reason: `Mot filtré automatiquement : ${matchedWord.word}`,
      });

      // Audit log
      await supabase.from("audit_log").insert({
        commune_id: profile.commune_id,
        actor_id: null,
        action: "post_hidden",
        target_type: "post",
        target_id: post.id,
        reason: `Filtre automatique : ${matchedWord.word}`,
      });

      // Still create poll if provided
      const pollDataStr = formData.get("poll_data") as string | null;
      if (pollDataStr) {
        const pollData: CreatePollInput = JSON.parse(pollDataStr);
        await createPoll(supabase, post.id, pollData);
      }

      // Handle image upload
      const imageFile = formData.get("image") as File | null;
      if (imageFile && imageFile.size > 0) {
        const ext = imageFile.name.split(".").pop() ?? "webp";
        const storagePath = `posts/${post.id}/${Date.now()}.${ext}`;
        const arrayBuffer = await imageFile.arrayBuffer();
        const { error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(storagePath, arrayBuffer, { contentType: imageFile.type });
        if (!uploadError) {
          await supabase.from("post_images").insert({ post_id: post.id, storage_path: storagePath });
        }
      }

      return { error: null, warning: "Votre publication est en cours de vérification." };
    }
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

  if (error || !post) return { error: "Erreur lors de la publication", warning: undefined };

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

  // Handle image upload
  const imageFile = formData.get("image") as File | null;
  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split(".").pop() ?? "webp";
    const storagePath = `posts/${post.id}/${Date.now()}.${ext}`;
    const arrayBuffer = await imageFile.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(storagePath, arrayBuffer, { contentType: imageFile.type });
    if (!uploadError) {
      await supabase.from("post_images").insert({ post_id: post.id, storage_path: storagePath });
    }
  }

  return { error: null, warning: undefined };
}
