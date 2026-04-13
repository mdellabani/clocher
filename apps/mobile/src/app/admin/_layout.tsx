import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack>
      <Stack.Screen name="moderation" options={{ title: "Moderation" }} />
    </Stack>
  );
}
