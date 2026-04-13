import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { ThemeProvider } from "./theme-context";
import type { Session } from "@supabase/supabase-js";
import type { Profile } from "@rural-community-platform/shared";

type ProfileWithCommune = Profile & {
  communes: {
    name: string;
    slug: string;
    epci_id: string | null;
    theme: string | null;
    motto: string | null;
    code_postal: string | null;
  };
};

type AuthState = {
  session: Session | null;
  profile: ProfileWithCommune | null;
  loading: boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthState>({
  session: null,
  profile: null,
  loading: true,
  isAdmin: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileWithCommune | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*, communes(name, slug, epci_id, theme, motto, code_postal)")
      .eq("id", userId)
      .single();
    setProfile(data as ProfileWithCommune | null);
    setLoading(false);
  }

  return (
    <ThemeProvider theme={profile?.communes?.theme ?? null}>
      <AuthContext.Provider
        value={{
          session,
          profile,
          loading,
          isAdmin: profile?.role === "admin",
        }}
      >
        {children}
      </AuthContext.Provider>
    </ThemeProvider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
