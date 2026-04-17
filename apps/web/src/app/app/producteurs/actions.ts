"use server";

import { createClient } from "@/lib/supabase/server";
import type { CreateProducerInput } from "@rural-community-platform/shared";

export async function createProducerAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("commune_id, status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "active") {
    return { error: "Compte non approuvé" };
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const categoriesStr = formData.get("categories") as string;
  const categories = JSON.parse(categoriesStr || "[]");
  const pickup_location = (formData.get("pickup_location") as string) || null;
  const delivers = formData.get("delivers") === "on";
  const contact_phone = (formData.get("contact_phone") as string) || null;
  const contact_email = (formData.get("contact_email") as string) || null;
  const schedule = (formData.get("schedule") as string) || null;

  if (!name || !description || categories.length === 0) {
    return { error: "Nom, description et au moins une catégorie sont requis" };
  }

  const input: CreateProducerInput = {
    name,
    description,
    categories,
    pickup_location,
    delivers,
    contact_phone,
    contact_email,
    schedule,
  };

  const { error } = await supabase.from("producers").insert({
    ...input,
    commune_id: profile.commune_id,
    created_by: user.id,
    status: "pending",
  });

  if (error) {
    console.error("Producer creation error:", error);
    return { error: "Erreur lors de la création" };
  }

  return { error: null };
}
