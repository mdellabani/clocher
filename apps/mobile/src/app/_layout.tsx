import { Stack, useSegments, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/hooks/use-notifications";
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from "@expo-google-fonts/dm-sans";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  useNotifications();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "auth";

    if (!session && !inAuthGroup) {
      router.replace("/auth/welcome");
    } else if (session && inAuthGroup && profile?.status === "active") {
      router.replace("/(tabs)/feed");
    }
  }, [session, profile, loading, segments]);

  if (loading) return null;

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate>
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: "#ffffff",
              },
              headerTintColor: "#18181b",
              headerTitleStyle: {
                fontFamily: "DMSans_600SemiBold",
              },
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
              animation: "slide_from_right",
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth/welcome" options={{ headerShown: false }} />
            <Stack.Screen name="auth/login" options={{ title: "Connexion", headerShown: false }} />
            <Stack.Screen name="auth/signup" options={{ title: "Inscription", headerShown: false }} />
            <Stack.Screen name="post/[id]" options={{ title: "Publication" }} />
            <Stack.Screen name="admin" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </AuthGate>
      </AuthProvider>
    </QueryClientProvider>
  );
}
