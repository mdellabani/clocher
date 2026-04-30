"use server";

import { createClient } from "@/lib/supabase/server";
import {
  deletePost,
  setRsvp,
  removeRsvp,
} from "@pretou/shared";
import type { RsvpStatus } from "@pretou/shared";
import { redirect } from "next/navigation";

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
