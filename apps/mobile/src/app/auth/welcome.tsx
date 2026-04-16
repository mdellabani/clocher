import { View, Text, StyleSheet, Pressable, Linking, ScrollView } from "react-native";
import { useRouter } from "expo-router";

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? "https://app.example.fr";

export default function Welcome() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.brand}>Ma Commune</Text>
        <Text style={styles.headline}>
          L'application qui rapproche votre commune et ses habitants
        </Text>
        <View style={styles.bullets}>
          <Text style={styles.bullet}>· Annonces de la mairie</Text>
          <Text style={styles.bullet}>· Agenda du village</Text>
          <Text style={styles.bullet}>· Entraide entre voisins</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push("/auth/signup")}
        >
          <Text style={styles.primaryButtonText}>J'ai un code d'invitation</Text>
        </Pressable>

        <Pressable onPress={() => router.push("/auth/login")} style={styles.secondaryLink}>
          <Text style={styles.secondaryLinkText}>Se connecter</Text>
        </Pressable>

        <Pressable
          onPress={() => Linking.openURL(`${WEB_URL}/auth/register-commune`)}
          style={styles.tertiaryLink}
        >
          <Text style={styles.tertiaryLinkText}>Je suis élu(e), inscrire ma commune</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#faf6ee",
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: "space-between",
  },
  hero: { alignItems: "center" },
  brand: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 2,
    color: "#7a6d56",
    textTransform: "uppercase",
  },
  headline: {
    marginTop: 24,
    fontSize: 28,
    fontWeight: "700",
    color: "#2a2418",
    textAlign: "center",
    lineHeight: 36,
  },
  bullets: { marginTop: 32, gap: 8 },
  bullet: { fontSize: 16, color: "#5a4d36" },
  actions: { marginTop: 48, gap: 16 },
  primaryButton: {
    backgroundColor: "#2a2418",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryLink: { paddingVertical: 12, alignItems: "center" },
  secondaryLinkText: { color: "#2a2418", fontSize: 15, fontWeight: "500" },
  tertiaryLink: { paddingVertical: 8, alignItems: "center" },
  tertiaryLinkText: { color: "#7a6d56", fontSize: 13, textDecorationLine: "underline" },
});
