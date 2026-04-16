"use server";

import { createServiceClient } from "@/lib/supabase/service";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function registerCommuneAction(data: {
  commune_name: string;
  code_postal: string;
  email: string;
  password: string;
  display_name: string;
  role_description?: string;
}) {
  // Use service role client to bypass RLS (no user is logged in during registration)
  const supabase = createServiceClient();

  // Generate slug from name + code postal for uniqueness
  const baseSlug = slugify(data.commune_name);
  const slug = `${baseSlug}-${data.code_postal.slice(0, 2)}`;

  // Check if slug already exists
  const { data: existing } = await supabase
    .from("communes")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    return { error: "Cette commune est déjà enregistrée" };
  }

  // Create the commune
  const { data: commune, error: communeError } = await supabase
    .from("communes")
    .insert({
      name: data.commune_name,
      slug,
      code_postal: data.code_postal,
    })
    .select("id, name, slug, invite_code")
    .single();

  if (communeError) {
    return { error: "Impossible de créer la commune. Réessayez." };
  }

  // Create the auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    // Rollback: delete the commune we just created
    await supabase.from("communes").delete().eq("id", commune.id);
    return { error: authError?.message ?? "Impossible de créer le compte" };
  }

  // Create the admin profile (pending until super-admin approves)
  const { error: profileError } = await supabase.from("profiles").insert({
    id: authData.user.id,
    commune_id: commune.id,
    display_name: data.display_name,
    role: "admin",
    status: "pending",
  });

  if (profileError) {
    return { error: "Commune créée mais erreur lors de la création du profil. Contactez le support." };
  }

  return {
    success: true,
    commune: {
      name: commune.name,
      slug: commune.slug,
      invite_code: commune.invite_code,
    },
  };
}
