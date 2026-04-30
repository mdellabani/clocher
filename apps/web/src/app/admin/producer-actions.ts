"use server";

import { createClient } from "@/lib/supabase/server";
import { approveProducer, rejectProducer } from "@pretou/shared";

export async function approveProducerAction(
  producerId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await approveProducer(supabase, producerId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function rejectProducerAction(
  producerId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await rejectProducer(supabase, producerId);
  if (error) return { error: error.message };
  return { error: null };
}
