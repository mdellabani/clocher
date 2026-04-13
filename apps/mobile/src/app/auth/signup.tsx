import { useEffect, useState } from "react";
import {
  Alert,
  ActivityIndicator,
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
import { User, Mail, Lock, MapPin, Check } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme-context";
import { signupSchema } from "@rural-community-platform/shared";

type CommuneItem = {
  id: string;
  name: string;
  slug: string;
  code_postal: string | null;
};

export default function SignupScreen() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [communes, setCommunes] = useState<CommuneItem[]>([]);
  const [selectedCommuneId, setSelectedCommuneId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [communesLoading, setCommunesLoading] = useState(true);
  const theme = useTheme();
  const router = useRouter();

  useEffect(() => {
    loadCommunes();
  }, []);

  async function loadCommunes() {
    const { data, error } = await supabase
      .from("communes")
      .select("id, name, slug, code_postal")
      .order("name");
    if (error) {
      Alert.alert("Erreur", "Impossible de charger les communes");
    } else {
      setCommunes(data ?? []);
    }
    setCommunesLoading(false);
  }

  async function handleSignup() {
    const parsed = signupSchema.safeParse({
      email,
      password,
      display_name: displayName,
      commune_id: selectedCommuneId,
    });

    if (!parsed.success) {
      const firstError =
        parsed.error.errors[0]?.message ?? "Données invalides";
      Alert.alert("Erreur", firstError);
      return;
    }

    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (authError) {
      setLoading(false);
      Alert.alert("Erreur", authError.message);
      return;
    }

    if (authData.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          display_name: parsed.data.display_name,
          commune_id: parsed.data.commune_id,
          role: "resident",
          status: "pending",
        });

      if (profileError) {
        setLoading(false);
        Alert.alert("Erreur", "Impossible de créer le profil");
        return;
      }
    }

    setLoading(false);
    Alert.alert(
      "Inscription réussie",
      "Votre compte a été créé. Un administrateur doit valider votre inscription avant que vous puissiez vous connecter.",
      [{ text: "OK", onPress: () => router.replace("/auth/login") }]
    );
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
            <Text style={styles.heroTitle}>Inscription</Text>
            <Text style={styles.heroSubtitle}>Rejoignez votre commune</Text>
          </View>
        </LinearGradient>

        {/* Form card */}
        <View style={[styles.form, { backgroundColor: theme.background }]}>
          {/* Display name */}
          <View style={styles.inputGroup}>
            <View style={styles.inputIcon}>
              <User size={16} color={theme.muted} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Votre nom"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              placeholderTextColor="#a1a1aa"
            />
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <View style={styles.inputIcon}>
              <Mail size={16} color={theme.muted} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="votre@email.fr"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#a1a1aa"
            />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <View style={styles.inputIcon}>
              <Lock size={16} color={theme.muted} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="8 caractères minimum"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#a1a1aa"
            />
          </View>

          {/* Commune selection */}
          <View style={styles.communeSection}>
            <View style={styles.communeSectionHeader}>
              <MapPin size={14} color={theme.primary} />
              <Text style={[styles.communeLabel, { color: theme.primary }]}>
                Votre commune
              </Text>
            </View>

            {communesLoading ? (
              <ActivityIndicator
                style={styles.communeLoader}
                color={theme.primary}
              />
            ) : (
              <View style={styles.communeList}>
                {communes.map((commune) => {
                  const isSelected = selectedCommuneId === commune.id;
                  return (
                    <TouchableOpacity
                      key={commune.id}
                      style={[
                        styles.communeItem,
                        isSelected && {
                          borderColor: theme.primary,
                          backgroundColor: theme.pinBg,
                        },
                      ]}
                      onPress={() => setSelectedCommuneId(commune.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.communeItemLeft}>
                        <Text
                          style={[
                            styles.communeName,
                            isSelected && {
                              color: theme.primary,
                              fontFamily: "DMSans_600SemiBold",
                            },
                          ]}
                        >
                          {commune.name}
                        </Text>
                        {commune.code_postal && (
                          <Text
                            style={[
                              styles.communeCode,
                              isSelected && { color: theme.primary + "99" },
                            ]}
                          >
                            {commune.code_postal}
                          </Text>
                        )}
                      </View>
                      {isSelected && (
                        <Check
                          size={16}
                          color={theme.primary}
                          strokeWidth={2.5}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Submit button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
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
                {loading ? "Inscription..." : "S'inscrire"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Login link */}
          <TouchableOpacity
            style={styles.linkContainer}
            onPress={() => router.push("/auth/login")}
          >
            <Text style={styles.link}>
              Déjà un compte ?{" "}
              <Text style={[styles.linkBold, { color: theme.primary }]}>
                Se connecter
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
    paddingTop: 72,
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

  communeSection: { marginTop: 4, marginBottom: 8 },
  communeSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  communeLabel: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },
  communeLoader: { marginVertical: 16 },
  communeList: { gap: 8 },
  communeItem: {
    borderWidth: 1.5,
    borderColor: "#e4e4e7",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  communeItemLeft: { flex: 1 },
  communeName: {
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
    color: "#18181b",
  },
  communeCode: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#a1a1aa",
    marginTop: 2,
  },

  button: {
    borderRadius: 12,
    marginTop: 20,
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

  linkContainer: { marginTop: 20, alignSelf: "center", marginBottom: 16 },
  link: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#71717a",
  },
  linkBold: {
    fontFamily: "DMSans_600SemiBold",
  },
});
