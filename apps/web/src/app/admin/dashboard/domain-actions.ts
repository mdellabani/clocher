"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN ?? "localhost:3000";

async function getAdminContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("commune_id, role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return null;
  return { supabase, communeId: profile.commune_id };
}

export async function setCustomDomainAction(domain: string): Promise<{ error: string | null }> {
  const ctx = await getAdminContext();
  if (!ctx) return { error: "Non autorisé" };

  // Normalize: lowercase, trim, remove trailing dot
  const normalized = domain.toLowerCase().trim().replace(/\.$/, "");
  if (!normalized || normalized.includes(" ")) return { error: "Domaine invalide" };

  const { error } = await ctx.supabase
    .from("communes")
    .update({ custom_domain: normalized, domain_verified: false })
    .eq("id", ctx.communeId);

  if (error) {
    if (error.code === "23505") return { error: "Ce domaine est déjà utilisé par une autre commune" };
    return { error: error.message };
  }

  revalidatePath("/admin/dashboard");
  return { error: null };
}

export async function verifyDomainAction(): Promise<{ verified: boolean; error: string | null }> {
  const ctx = await getAdminContext();
  if (!ctx) return { verified: false, error: "Non autorisé" };

  const { data: commune } = await ctx.supabase
    .from("communes")
    .select("custom_domain")
    .eq("id", ctx.communeId)
    .single();

  if (!commune?.custom_domain) return { verified: false, error: "Aucun domaine configuré" };

  // Check DNS via Google Public DNS API
  try {
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(commune.custom_domain)}&type=CNAME`
    );
    const data = await res.json();

    // Check if any CNAME answer points to our platform
    const targetDomain = `communes.${PLATFORM_DOMAIN}`;
    const hasCname = data.Answer?.some(
      (record: { type: number; data: string }) =>
        record.type === 5 && record.data.replace(/\.$/, "").toLowerCase() === targetDomain
    );

    if (hasCname) {
      await ctx.supabase
        .from("communes")
        .update({ domain_verified: true })
        .eq("id", ctx.communeId);

      revalidatePath("/admin/dashboard");
      return { verified: true, error: null };
    }

    return { verified: false, error: null };
  } catch {
    return { verified: false, error: "Impossible de vérifier le DNS" };
  }
}

export async function removeDomainAction(): Promise<{ error: string | null }> {
  const ctx = await getAdminContext();
  if (!ctx) return { error: "Non autorisé" };

  const { error } = await ctx.supabase
    .from("communes")
    .update({ custom_domain: null, domain_verified: false })
    .eq("id", ctx.communeId);

  if (error) return { error: error.message };
  revalidatePath("/admin/dashboard");
  return { error: null };
}
