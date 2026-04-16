"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@rural-community-platform/shared";

type ProfileWithCommune = Profile & {
  communes: {
    name: string;
    slug: string;
    epci_id: string | null;
    code_postal: string | null;
    theme: string;
    motto: string | null;
  };
};

type ProfileState = {
  profile: ProfileWithCommune | null;
  loading: boolean;
  isAdmin: boolean;
  isModerator: boolean;
};

const ProfileContext = createContext<ProfileState>({
  profile: null,
  loading: true,
  isAdmin: false,
  isModerator: false,
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
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
        .select("*, communes(name, slug, epci_id, code_postal, theme, motto)")
        .eq("id", user.id)
        .single();
      setProfile(data as ProfileWithCommune | null);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        loading,
        isAdmin: profile?.role === "admin",
        isModerator: profile?.role === "moderator" || profile?.role === "admin",
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
