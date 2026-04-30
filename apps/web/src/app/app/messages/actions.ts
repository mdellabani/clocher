"use server";
import { createClient } from "@/lib/supabase/server";
import {
  getOrCreateConversation,
  sendMessage,
  markConversationRead,
  blockUser,
  unblockUser,
  reportConversation,
} from "@pretou/shared";

export async function startConversationAction(args: { postId: string; otherUserId: string }) {
  const supabase = await createClient();
  return await getOrCreateConversation(supabase, args);
}

export async function sendMessageAction(args: { conversationId: string; body: string }) {
  const supabase = await createClient();
  return await sendMessage(supabase, args);
}

export async function markReadAction(conversationId: string) {
  const supabase = await createClient();
  await markConversationRead(supabase, conversationId);
}

export async function blockUserAction(blockedId: string) {
  const supabase = await createClient();
  await blockUser(supabase, blockedId);
}

export async function unblockUserAction(blockedId: string) {
  const supabase = await createClient();
  await unblockUser(supabase, blockedId);
}

export async function reportConversationAction(args: { conversationId: string; reason?: string }) {
  const supabase = await createClient();
  await reportConversation(supabase, args);
}
