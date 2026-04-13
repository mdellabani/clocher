"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@rural-community-platform/shared";

type ProfileWithCommune = Profile & {
  communes: { name: string; slug: string; epci_id: string | null };
};

export function useProfile() {
  const [profile, setProfile] = useState<ProfileWithCommune | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("*, communes(name, slug, epci_id)")
        .eq("id", user.id)
        .single();
      setProfile(data as ProfileWithCommune | null);
      setLoading(false);
    }
    load();
  }, []);

  return { profile, loading, isAdmin: profile?.role === "admin" };
}
