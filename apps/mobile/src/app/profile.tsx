import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { ShieldCheck, LogOut, ChevronRight } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { ROLE_LABELS } from "@rural-community-platform/shared";
import type { Role } from "@rural-community-platform/shared";

export default function ProfileScreen() {
  const { profile, isAdmin } = useAuth();
  const theme = useTheme();
  const router = useRouter();

  async function handleLogout() {
    Alert.alert("Déconnexion", "Voulez-vous vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Se déconnecter",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/auth/login");
        },
      },
    ]);
  }

  if (!profile) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.muted }]}>
          Chargement...
        </Text>
      </View>
    );
  }

  const roleLabel = ROLE_LABELS[profile.role as Role] ?? profile.role;
  const communeName = profile.communes?.name ?? "Commune inconnue";
  const initial =
    profile.display_name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: "Mon profil", headerBackTitle: "Retour" }} />
      {/* Profile section */}
      <View style={styles.profileSection}>
        {/* Avatar with theme border */}
        <View
          style={[
            styles.avatarRing,
            { borderColor: theme.primary + "50" },
          ]}
        >
          <View
            style={[styles.avatar, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        </View>

        <Text style={styles.name}>{profile.display_name}</Text>
        <Text style={[styles.commune, { color: theme.muted }]}>
          {communeName}
        </Text>
        <View
          style={[styles.roleBadge, { backgroundColor: theme.pinBg }]}
        >
          <Text style={[styles.roleText, { color: theme.primary }]}>
            {roleLabel}
          </Text>
        </View>
      </View>

      {/* Admin section */}
      {isAdmin && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Administration</Text>
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: "#FFFFFF" }]}
            onPress={() => router.push("/admin/moderation")}
          >
            <View style={[styles.menuIconBox, { backgroundColor: theme.pinBg }]}>
              <ShieldCheck size={16} color={theme.primary} />
            </View>
            <Text style={styles.menuItemText}>
              Modération des inscriptions
            </Text>
            <ChevronRight size={16} color="#a1a1aa" />
          </TouchableOpacity>
        </View>
      )}

      {/* Logout */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LogOut size={16} color="#dc2626" />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontFamily: "DMSans_400Regular", fontSize: 16 },

  profileSection: { alignItems: "center", paddingVertical: 32 },
  avatarRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontFamily: "DMSans_600SemiBold",
    color: "#FFFFFF",
    fontSize: 28,
  },
  name: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 20,
    color: "#18181b",
    marginBottom: 4,
  },
  commune: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    marginBottom: 10,
  },
  roleBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  roleText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
  },

  section: { marginTop: 20 },
  sectionTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
    color: "#a1a1aa",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  menuItemText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
    color: "#18181b",
    flex: 1,
  },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#fef2f2",
  },
  logoutText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
    color: "#dc2626",
  },
});
