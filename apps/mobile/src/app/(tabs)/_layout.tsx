import { Tabs } from "expo-router";
import { House, CalendarDots, ChatTeardropDots, BellRinging, UserCircle } from "phosphor-react-native";
import { useTheme } from "@/lib/theme-context";

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,
        tabBarLabelStyle: {
          fontFamily: "DMSans_500Medium",
          fontSize: 11,
        },
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#F0E6D8",
        },
        headerStyle: {
          backgroundColor: "#FFFFFF",
        },
        headerTintColor: "#18181b",
        headerTitleStyle: {
          fontFamily: "DMSans_600SemiBold",
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: "Fil",
          tabBarLabel: "Fil",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <House size={size} color={color} weight="fill" />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Événements",
          tabBarLabel: "Événements",
          tabBarIcon: ({ color, size }) => (
            <CalendarDots size={size} color={color} weight="fill" />
          ),
        }}
      />
      <Tabs.Screen
        name="exchanges"
        options={{
          title: "Échanges",
          tabBarLabel: "Échanges",
          tabBarIcon: ({ color, size }) => (
            <ChatTeardropDots size={size} color={color} weight="fill" />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alertes",
          tabBarLabel: "Alertes",
          tabBarIcon: ({ color, size }) => (
            <BellRinging size={size} color={color} weight="fill" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarLabel: "Profil",
          tabBarIcon: ({ color, size }) => (
            <UserCircle size={size} color={color} weight="fill" />
          ),
        }}
      />
      <Tabs.Screen name="create" options={{ href: null, title: "Publier" }} />
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}
