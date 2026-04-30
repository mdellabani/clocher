import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { supabase } from "./supabase";
import { ThemeProvider } from "./theme-context";
import type { Session } from "@supabase/supabase-js";
import type { Profile } from "@pretou/shared";

type ProfileWithCommune = Profile & {
  communes: {
    name: string;
    slug: string;
    epci_id: string | null;
    theme: string | null;
    custom_primary_color: string | null;
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
  const appState = useRef<AppStateStatus>(AppState.currentState);

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

    const appStateSub = AppState.addEventListener("change", (next) => {
      const wasBackground = appState.current.match(/inactive|background/);
      appState.current = next;
      if (wasBackground && next === "active") {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) loadProfile(session.user.id);
        });
      }
    });

    return () => {
      subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*, communes(name, slug, epci_id, theme, custom_primary_color, motto, code_postal)")
      .eq("id", userId)
      .single();
    setProfile(data as ProfileWithCommune | null);
    setLoading(false);
  }

  return (
    <ThemeProvider
      theme={profile?.communes?.theme ?? null}
      customPrimaryColor={profile?.communes?.custom_primary_color ?? null}
    >
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
