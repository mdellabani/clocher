import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? "https://app.example.fr";

const colors = {
  bg: "#FBF7F1",
  surface: "#FFFFFF",
  text: "#2a1a14",
  textMuted: "#5a4030",
  textSubtle: "#7a5e4d",
  primary: "#2a1a14",
  accentStrong: "#BF3328",
  accentMid: "#D35230",
  accentLight: "#E49035",
};

export default function Welcome() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={["#FBF7F1", "#FDF0EB", "#F5DBC8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.blob} />

      <View style={styles.hero}>
        <View style={styles.brand}>
          <LinearGradient
            colors={[colors.accentStrong, colors.accentMid, colors.accentLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.brandMark}
          >
            <Text style={styles.brandMarkText}>◉</Text>
          </LinearGradient>
          <Text style={styles.brandWordmark}>Pretou</Text>
        </View>

        <View style={styles.pill}>
          <Text style={styles.pillText}>🌾 Pour les communes rurales</Text>
        </View>

        <Text style={styles.headlineDark}>Le village dans votre poche.</Text>
        <Text style={styles.headlineAccent}>La mairie en direct.</Text>

        <Text style={styles.sub}>
          Annonces, événements, entraide — une app simple, connectée à votre mairie.
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.primaryBtn} onPress={() => router.push("/auth/signup")}>
          <Text style={styles.primaryBtnText}>J'ai un code d'invitation</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={() => router.push("/auth/login")}>
          <Text style={styles.secondaryBtnText}>Se connecter</Text>
        </Pressable>

        <Pressable
          onPress={() => Linking.openURL(`${WEB_URL}/auth/register-commune`)}
          style={styles.tertiaryLink}
        >
          <Text style={styles.tertiaryLinkText}>Je suis élu(e), inscrire ma commune</Text>
        </Pressable>

        <Text style={styles.micro}>Démarrage immédiat · Sans engagement · Hébergé en France</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  blob: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.accentLight,
    opacity: 0.25,
  },
  hero: { alignItems: "flex-start" },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  brandWordmark: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: colors.text,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: "rgba(228,144,53,0.3)",
  },
  pillText: { fontSize: 11, fontWeight: "600", color: colors.accentStrong },
  headlineDark: {
    marginTop: 24,
    fontSize: 32,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 40,
  },
  headlineAccent: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.accentMid,
    lineHeight: 40,
  },
  sub: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 24,
  },
  actions: { gap: 12 },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accentMid,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryBtnText: { color: colors.accentStrong, fontSize: 16, fontWeight: "600" },
  tertiaryLink: {
    paddingVertical: 8,
    alignItems: "center",
  },
  tertiaryLinkText: {
    fontSize: 13,
    color: colors.textSubtle,
    textDecorationLine: "underline",
  },
  micro: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 11,
    color: colors.textSubtle,
  },
});
