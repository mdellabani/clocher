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
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getPendingUsers, approveUser, rejectUser } from "@rural-community-platform/shared";

type PendingUser = {
  id: string;
  display_name: string;
  created_at: string;
};

export default function ModerationScreen() {
  const { profile } = useAuth();
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
      Alert.alert("Approuve", `${name} a ete approuve`);
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
      <View style={styles.center}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={users}
      keyExtractor={(item) => item.id}
      contentContainerStyle={users.length === 0 ? styles.emptyContainer : styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
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
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.approveButton}
              onPress={() => handleApprove(item.id, item.display_name)}
            >
              <Text style={styles.approveText}>Approuver</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleReject(item.id, item.display_name)}
            >
              <Text style={styles.rejectText}>Refuser</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>Aucune inscription en attente</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 8 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  emptyContainer: { flex: 1 },
  loadingText: { fontSize: 16, color: "#71717a" },
  emptyText: { fontSize: 16, color: "#71717a", textAlign: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  userInfo: { marginBottom: 12 },
  userName: { fontSize: 16, fontWeight: "600", color: "#18181b" },
  userDate: { fontSize: 13, color: "#a1a1aa", marginTop: 2 },
  actions: { flexDirection: "row", gap: 8 },
  approveButton: {
    flex: 1,
    backgroundColor: "#16a34a",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  approveText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  rejectButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    backgroundColor: "#fef2f2",
  },
  rejectText: { color: "#dc2626", fontSize: 14, fontWeight: "600" },
});
