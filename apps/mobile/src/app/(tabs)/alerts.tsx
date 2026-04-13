import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/lib/theme-context";

export default function AlertsScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={styles.text}>Alertes — Bientôt disponible</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  text: {
    fontFamily: "DMSans_500Medium",
    fontSize: 16,
    color: "#71717a",
    textAlign: "center",
  },
});
