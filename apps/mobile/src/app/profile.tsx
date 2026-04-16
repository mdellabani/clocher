import { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { LogOut, Camera } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "@/lib/supabase";
import { unregisterPushToken } from "@/lib/notifications";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { ROLE_LABELS } from "@rural-community-platform/shared";
import type { Role } from "@rural-community-platform/shared";

export default function ProfileScreen() {
  const { profile, isAdmin } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);

  async function handleSaveName() {
    if (!profile || !displayName.trim()) return;
    setSaving(true);
    setSaveStatus("idle");
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("id", profile.id);
    setSaving(false);
    setSaveStatus(error ? "error" : "success");
    if (error) {
      Alert.alert("Erreur", "Impossible de mettre à jour le nom d'affichage");
    }
  }

  async function handleLogout() {
    Alert.alert("Déconnexion", "Voulez-vous vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Se déconnecter",
        style: "destructive",
        onPress: async () => {
          await unregisterPushToken();
          await supabase.auth.signOut();
          router.replace("/auth/welcome");
        },
      },
    ]);
  }

  async function handleAvatarUpload() {
    if (!profile) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission refusée", "Nous avons besoin d'accéder à vos photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset.uri) return;

    setUploadingAvatar(true);
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 400, height: 400 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.WEBP }
      );

      const file = await fetch(manipulated.uri);
      const blob = await file.blob();
      const arrayBuffer = await blob.arrayBuffer();

      const ext = "webp";
      const storagePath = `avatars/${profile.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(storagePath, arrayBuffer, { contentType: "image/webp" });

      if (uploadError) {
        Alert.alert("Erreur", "Impossible d'uploader l'avatar");
        setUploadingAvatar(false);
        return;
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${storagePath}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);

      if (updateError) {
        Alert.alert("Erreur", "Impossible de mettre à jour l'avatar");
        setUploadingAvatar(false);
        return;
      }

      setAvatarUrl(publicUrl);
      setUploadingAvatar(false);
      Alert.alert("Succès", "Avatar mis à jour");
    } catch (error) {
      Alert.alert("Erreur", "Une erreur est survenue");
      setUploadingAvatar(false);
    }
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
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.container}
    >
      <Stack.Screen options={{ title: "Mon profil", headerBackTitle: "Retour" }} />
      {/* Profile section */}
      <View style={styles.profileSection}>
        {/* Avatar with theme border — tap to change */}
        <TouchableOpacity
          onPress={handleAvatarUpload}
          disabled={uploadingAvatar}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.avatarRing,
              { borderColor: theme.primary + "50" },
            ]}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <View
                style={[styles.avatar, { backgroundColor: theme.primary }]}
              >
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            )}
          </View>
          <View style={styles.changePhotoRow}>
            <Camera size={13} color={theme.primary} />
            <Text style={[styles.changePhotoText, { color: theme.primary }]}>
              {uploadingAvatar ? "Envoi..." : "Changer la photo"}
            </Text>
          </View>
        </TouchableOpacity>

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

      {/* Edit name section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Modifier mon profil</Text>
        <View style={styles.editCard}>
          <Text style={styles.inputLabel}>Nom d'affichage</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.primary + "40" }]}
            value={displayName}
            onChangeText={(v) => {
              setDisplayName(v);
              setSaveStatus("idle");
            }}
            placeholder="Votre prénom ou nom"
            placeholderTextColor="#a1a1aa"
          />
          {saveStatus === "success" && (
            <Text style={styles.successText}>Nom mis à jour avec succès</Text>
          )}
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: theme.primary },
              saving && styles.saveButtonDisabled,
            ]}
            onPress={handleSaveName}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout */}
      <View style={[styles.section, { marginBottom: 40 }]}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LogOut size={16} color="#dc2626" />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
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
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  changePhotoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 8,
  },
  changePhotoText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
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

  editCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 10,
  },
  inputLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#52525b",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: "#18181b",
    backgroundColor: "#fafafa",
  },
  successText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#16a34a",
  },
  saveButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
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
