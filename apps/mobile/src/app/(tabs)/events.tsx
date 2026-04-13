import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getPostsByType } from "@rural-community-platform/shared";
import type { Post } from "@rural-community-platform/shared";

export default function EventsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    if (!profile?.commune_id) return;
    const { data } = await getPostsByType(supabase, profile.commune_id, "evenement");
    if (data) {
      // Filter to upcoming events (event_date >= today or no event_date)
      const now = new Date().toISOString();
      const upcoming = (data as Post[]).filter(
        (e) => !e.event_date || e.event_date >= now
      );
      setEvents(upcoming);
    }
  }, [profile?.commune_id]);

  useEffect(() => {
    loadEvents().then(() => setLoading(false));
  }, [loadEvents]);

  async function onRefresh() {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "Date a definir";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
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
      data={events}
      keyExtractor={(item) => item.id}
      contentContainerStyle={events.length === 0 ? styles.emptyContainer : styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push(`/post/${item.id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.dateBadge}>
            <Text style={styles.dateText}>{formatDate(item.event_date)}</Text>
          </View>
          <Text style={styles.title}>{item.title}</Text>
          {item.event_location && (
            <Text style={styles.location}>{item.event_location}</Text>
          )}
          <Text style={styles.body} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.author}>
            {item.profiles?.display_name ?? "Anonyme"}
          </Text>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>Aucun evenement a venir.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: 8 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  emptyContainer: { flex: 1 },
  loadingText: { fontSize: 16, color: "#71717a" },
  emptyText: { fontSize: 16, color: "#71717a", textAlign: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  dateBadge: {
    backgroundColor: "#eff6ff",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  dateText: { color: "#2563eb", fontSize: 13, fontWeight: "600" },
  title: { fontSize: 17, fontWeight: "bold", color: "#18181b", marginBottom: 4 },
  location: { fontSize: 14, color: "#2563eb", marginBottom: 4 },
  body: { fontSize: 14, color: "#52525b", lineHeight: 20, marginBottom: 8 },
  author: { fontSize: 12, color: "#a1a1aa" },
});
