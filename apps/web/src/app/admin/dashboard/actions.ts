"use server";


import { createClient } from "@/lib/supabase/server";
import {
  approveUser,
  rejectUser,
  togglePinPost,
  deletePost,
  promoteToModerator,
  demoteToResident,
} from "@pretou/shared";

export async function approveUserAction(
  userId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await approveUser(supabase, userId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function rejectUserAction(
  userId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await rejectUser(supabase, userId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function togglePinAction(
  postId: string,
  isPinned: boolean,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await togglePinPost(supabase, postId, isPinned);
  if (error) return { error: error.message };
  return { error: null };
}

export async function deletePostAction(
  postId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await deletePost(supabase, postId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function promoteModerator(
  userId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await promoteToModerator(supabase, userId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function demoteModerator(
  userId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await demoteToResident(supabase, userId);
  if (error) return { error: error.message };
  return { error: null };
}
