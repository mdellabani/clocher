"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { approveProducer, rejectProducer } from "@rural-community-platform/shared";

export async function approveProducerAction(
  producerId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await approveProducer(supabase, producerId);
  if (error) return { error: error.message };
  revalidatePath("/admin/dashboard");
  return { error: null };
}

export async function rejectProducerAction(
  producerId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await rejectProducer(supabase, producerId);
  if (error) return { error: error.message };
  revalidatePath("/admin/dashboard");
  return { error: null };
}
