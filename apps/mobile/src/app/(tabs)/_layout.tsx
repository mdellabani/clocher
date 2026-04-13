import { Tabs } from "expo-router";
import { useColorScheme } from "react-native";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colorScheme === "dark" ? "#fafafa" : "#18181b",
        tabBarInactiveTintColor: colorScheme === "dark" ? "#71717a" : "#a1a1aa",
        tabBarStyle: {
          backgroundColor: colorScheme === "dark" ? "#09090b" : "#ffffff",
        },
        headerStyle: {
          backgroundColor: colorScheme === "dark" ? "#09090b" : "#ffffff",
        },
        headerTintColor: colorScheme === "dark" ? "#fafafa" : "#18181b",
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: "Fil",
          tabBarLabel: "Fil",
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Événements",
          tabBarLabel: "Événements",
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Publier",
          tabBarLabel: "Publier",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarLabel: "Profil",
        }}
      />
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}
