import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { Check, X, UserCheck } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { getPendingUsers, approveUser, rejectUser } from "@rural-community-platform/shared";

type PendingUser = {
  id: string;
  display_name: string;
  created_at: string;
};

export default function ModerationScreen() {
  const { profile } = useAuth();
  const theme = useTheme();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    if (!profile?.commune_id) return;
    const { data } = await getPendingUsers(supabase, profile.commune_id);
    if (data) setUsers(data as PendingUser[]);
  }, [profile?.commune_id]);

  useEffect(() => {
    loadUsers().then(() => setLoading(false));
  }, [loadUsers]);

  async function onRefresh() {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  }

  async function handleApprove(userId: string, name: string) {
    const { error } = await approveUser(supabase, userId);
    if (error) {
      Alert.alert("Erreur", "Impossible d'approuver l'utilisateur");
    } else {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      Alert.alert("Approuvé", `${name} a été approuvé`);
    }
  }

  async function handleReject(userId: string, name: string) {
    Alert.alert("Refuser", `Refuser l'inscription de ${name} ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Refuser",
        style: "destructive",
        onPress: async () => {
          const { error } = await rejectUser(supabase, userId);
          if (error) {
            Alert.alert("Erreur", "Impossible de refuser l'utilisateur");
          } else {
            setUsers((prev) => prev.filter((u) => u.id !== userId));
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.muted }]}>
          Chargement...
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Modération", headerBackTitle: "Retour" }} />
      <FlatList
        style={{ backgroundColor: theme.background }}
      data={users}
      keyExtractor={(item) => item.id}
      contentContainerStyle={
        users.length === 0 ? styles.emptyContainer : styles.list
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      renderItem={({ item }) => {
        const initial = item.display_name?.charAt(0)?.toUpperCase() ?? "?";
        return (
          <View style={styles.card}>
            <View style={styles.cardInner}>
              {/* User avatar + info */}
              <View
                style={[
                  styles.userAvatar,
                  { backgroundColor: theme.pinBg },
                ]}
              >
                <UserCheck size={18} color={theme.primary} />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.display_name}</Text>
                <Text style={styles.userDate}>
                  Inscrit le{" "}
                  {new Date(item.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.approveButton, { backgroundColor: theme.primary }]}
                onPress={() => handleApprove(item.id, item.display_name)}
                activeOpacity={0.8}
              >
                <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.approveText}>Approuver</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => handleReject(item.id, item.display_name)}
                activeOpacity={0.8}
              >
                <X size={16} color="#dc2626" strokeWidth={2.5} />
                <Text style={styles.rejectText}>Refuser</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: theme.muted }]}>
            Aucune inscription en attente
          </Text>
        </View>
      }
    />
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyContainer: { flex: 1 },
  loadingText: { fontFamily: "DMSans_400Regular", fontSize: 16 },
  emptyText: { fontFamily: "DMSans_500Medium", fontSize: 16, textAlign: "center" },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: { flex: 1 },
  userName: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
    color: "#18181b",
  },
  userDate: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#a1a1aa",
    marginTop: 2,
  },
  actions: { flexDirection: "row", gap: 8 },
  approveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    padding: 10,
  },
  approveText: {
    fontFamily: "DMSans_600SemiBold",
    color: "#FFFFFF",
    fontSize: 14,
  },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fef2f2",
  },
  rejectText: {
    fontFamily: "DMSans_600SemiBold",
    color: "#dc2626",
    fontSize: 14,
  },
});
