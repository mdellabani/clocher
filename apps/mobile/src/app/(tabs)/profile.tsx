import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { ROLE_LABELS } from "@rural-community-platform/shared";
import type { Role } from "@rural-community-platform/shared";

export default function ProfileScreen() {
  const { profile, isAdmin } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    Alert.alert("Deconnexion", "Voulez-vous vous deconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Se deconnecter",
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
      <View style={styles.center}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const roleLabel = ROLE_LABELS[profile.role as Role] ?? profile.role;
  const communeName = profile.communes?.name ?? "Commune inconnue";

  return (
    <View style={styles.container}>
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile.display_name?.charAt(0)?.toUpperCase() ?? "?"}
          </Text>
        </View>
        <Text style={styles.name}>{profile.display_name}</Text>
        <Text style={styles.commune}>{communeName}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{roleLabel}</Text>
        </View>
      </View>

      {isAdmin && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Administration</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/admin/moderation")}
          >
            <Text style={styles.menuItemText}>Moderation des inscriptions</Text>
            <Text style={styles.menuItemArrow}>&gt;</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Se deconnecter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 16, color: "#71717a" },
  profileSection: { alignItems: "center", paddingVertical: 32 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#18181b",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "bold" },
  name: { fontSize: 22, fontWeight: "bold", color: "#18181b", marginBottom: 4 },
  commune: { fontSize: 15, color: "#71717a", marginBottom: 8 },
  roleBadge: {
    backgroundColor: "#f4f4f5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  roleText: { fontSize: 13, color: "#52525b", fontWeight: "500" },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#18181b", marginBottom: 12 },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 8,
  },
  menuItemText: { fontSize: 15, color: "#18181b" },
  menuItemArrow: { fontSize: 16, color: "#a1a1aa" },
  logoutButton: {
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    backgroundColor: "#fef2f2",
  },
  logoutText: { fontSize: 15, color: "#dc2626", fontWeight: "600" },
});
