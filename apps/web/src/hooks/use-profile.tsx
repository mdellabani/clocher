"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SUPER_ADMIN_EMAILS } from "@/lib/super-admin";
import type { Profile } from "@pretou/shared";

type ProfileWithCommune = Profile & {
  communes: {
    name: string;
    slug: string;
    epci_id: string | null;
    code_postal: string | null;
    theme: string;
    motto: string | null;
    custom_primary_color: string | null;
  };
};

type ProfileState = {
  profile: ProfileWithCommune | null;
  userEmail: string | null;
  loading: boolean;
  isAdmin: boolean;
  isModerator: boolean;
};

const ProfileContext = createContext<ProfileState>({
  profile: null,
  userEmail: null,
  loading: true,
  isAdmin: false,
  isModerator: false,
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<ProfileWithCommune | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        setUserEmail(null);
        setLoading(false);
        return;
      }
      setUserEmail(user.email ?? null);
      const { data, error } = await supabase
        .from("profiles")
        .select("*, communes(name, slug, epci_id, code_postal, theme, motto, custom_primary_color)")
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        console.error("[useProfile] failed to load profile:", error);
      }
      setProfile(data as ProfileWithCommune | null);
      setLoading(false);
    }

    load();

    // Re-fetch on sign-in / sign-out so the navbar (and anything else
    // reading useProfile) reflects the current auth state without
    // needing a full page reload.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        load();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Redirect side-effects for authed routes. Middleware already redirects
  // unauthed users to /auth/login, so here we only handle the "signed in
  // but profile row missing or pending" cases that page.tsx used to cover.
  useEffect(() => {
    if (loading) return;
    if (!pathname) return;
    const inAuthedTree = pathname.startsWith("/app/") || pathname.startsWith("/admin/");
    if (!inAuthedTree) return;
    if (!userEmail) return;

    if (!profile) {
      if (SUPER_ADMIN_EMAILS.includes(userEmail)) {
        router.replace("/super-admin");
      } else {
        router.replace("/auth/signup");
      }
      return;
    }

    if (profile.status === "pending") {
      router.replace("/auth/pending");
    }
  }, [loading, profile, userEmail, pathname, router]);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        userEmail,
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
