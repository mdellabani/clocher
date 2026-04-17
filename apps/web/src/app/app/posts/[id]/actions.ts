"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createComment,
  deleteComment,
  deletePost,
  setRsvp,
  removeRsvp,
  createCommentSchema,
} from "@rural-community-platform/shared";
import type { RsvpStatus } from "@rural-community-platform/shared";
import { redirect } from "next/navigation";

export async function addCommentAction(postId: string, body: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };
  const parsed = createCommentSchema.safeParse({ body });
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { error } = await createComment(
    supabase,
    postId,
    user.id,
    parsed.data.body
  );
  if (error) return { error: "Erreur lors de l'ajout du commentaire" };
  return { error: null };
}

export async function deleteCommentAction(
  commentId: string,
  _postId: string
) {
  const supabase = await createClient();
  const { error } = await deleteComment(supabase, commentId);
  if (error) return { error: "Erreur lors de la suppression" };
  return { error: null };
}

export async function setRsvpAction(
  postId: string,
  status: "going" | "maybe" | "not_going"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };
  const { error } = await setRsvp(supabase, postId, user.id, status as RsvpStatus);
  if (error) return { error: "Erreur lors de l'enregistrement" };
  return { error: null };
}

export async function deletePostAction(postId: string) {
  const supabase = await createClient();
  const { error } = await deletePost(supabase, postId);
  if (error) return { error: "Erreur lors de la suppression" };
  redirect("/app/feed");
}

export async function removeRsvpAction(postId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };
  const { error } = await removeRsvp(supabase, postId, user.id);
  if (error) return { error: "Erreur" };
  return { error: null };
}
