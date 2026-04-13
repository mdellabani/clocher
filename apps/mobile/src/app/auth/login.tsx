import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Mail, Lock } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme-context";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const router = useRouter();

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert("Erreur", "Email ou mot de passe incorrect");
      return;
    }

    router.replace("/(tabs)/feed");
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Gradient top section */}
        <LinearGradient
          colors={theme.gradient as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroDecCircle1} />
          <View style={styles.heroDecCircle2} />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Connexion</Text>
            <Text style={styles.heroSubtitle}>
              Connectez-vous à votre commune
            </Text>
          </View>
        </LinearGradient>

        {/* Form card */}
        <View style={[styles.form, { backgroundColor: theme.background }]}>
          {/* Email field */}
          <View style={styles.inputGroup}>
            <View style={styles.inputIcon}>
              <Mail size={16} color={theme.muted} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#a1a1aa"
            />
          </View>

          {/* Password field */}
          <View style={styles.inputGroup}>
            <View style={styles.inputIcon}>
              <Lock size={16} color={theme.muted} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#a1a1aa"
            />
          </View>

          {/* Submit button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={theme.gradient as unknown as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>
                {loading ? "Connexion..." : "Se connecter"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Signup link */}
          <TouchableOpacity
            style={styles.linkContainer}
            onPress={() => router.push("/auth/signup")}
          >
            <Text style={styles.link}>
              Pas encore de compte ?{" "}
              <Text style={[styles.linkBold, { color: theme.primary }]}>
                S&apos;inscrire
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  hero: {
    paddingTop: 80,
    paddingBottom: 48,
    paddingHorizontal: 28,
    position: "relative",
    overflow: "hidden",
  },
  heroDecCircle1: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    top: -40,
    right: -30,
  },
  heroDecCircle2: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    bottom: -20,
    left: -20,
  },
  heroContent: { zIndex: 1 },
  heroTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 30,
    color: "#FFFFFF",
    marginBottom: 6,
  },
  heroSubtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
  },

  form: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    padding: 28,
    paddingTop: 32,
  },

  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: "#18181b",
  },

  button: {
    borderRadius: 12,
    marginTop: 8,
    overflow: "hidden",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonGradient: {
    padding: 15,
    alignItems: "center",
  },
  buttonText: {
    fontFamily: "DMSans_600SemiBold",
    color: "#FFFFFF",
    fontSize: 15,
  },

  linkContainer: { marginTop: 20, alignSelf: "center" },
  link: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#71717a",
  },
  linkBold: {
    fontFamily: "DMSans_600SemiBold",
  },
});
