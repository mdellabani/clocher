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
import { LinearGradient } from "expo-linear-gradient";
import { Plus } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { PostCard } from "@/components/post-card";
import { FeedHeader } from "@/components/feed-header";
import { QuickActions } from "@/components/quick-actions";
import { getPosts, getEpciPosts } from "@rural-community-platform/shared";
import type { Post } from "@rural-community-platform/shared";

export default function FeedScreen() {
  const { profile } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"commune" | "epci">("commune");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    if (!profile?.commune_id) return;

    const { data } =
      scope === "epci" && profile.communes?.epci_id
        ? await getEpciPosts(supabase, profile.communes.epci_id)
        : await getPosts(supabase, profile.commune_id);

    if (data) setPosts(data as Post[]);
  }, [profile?.commune_id, profile?.communes?.epci_id, scope]);

  useEffect(() => {
    loadPosts().then(() => setLoading(false));
  }, [loadPosts]);

  // Realtime subscription
  useEffect(() => {
    if (!profile?.commune_id) return;

    const channel = supabase
      .channel("posts-feed")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
          filter: `commune_id=eq.${profile.commune_id}`,
        },
        () => {
          loadPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.commune_id, loadPosts]);

  async function onRefresh() {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  }

  const filteredPosts = typeFilter
    ? posts.filter((p) => p.type === typeFilter)
    : posts;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.background }]}>
      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        contentContainerStyle={
          filteredPosts.length === 0 ? styles.emptyContainer : styles.list
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <>
            <FeedHeader />
            <QuickActions activeFilter={typeFilter} onFilter={setTypeFilter} />
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                onPress={() => setScope("commune")}
                style={[
                  styles.toggleButton,
                  scope === "commune" && { backgroundColor: theme.primary },
                ]}
              >
                <Text
                  style={[
                    styles.toggleText,
                    scope === "commune" && styles.toggleTextActive,
                  ]}
                >
                  Ma commune
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setScope("epci")}
                style={[
                  styles.toggleButton,
                  scope === "epci" && { backgroundColor: theme.primary },
                ]}
              >
                <Text
                  style={[
                    styles.toggleText,
                    scope === "epci" && styles.toggleTextActive,
                  ]}
                >
                  Intercommunalité
                </Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              Aucune publication pour le moment.
            </Text>
            <Text style={styles.emptySubtext}>
              Soyez le premier a publier dans votre commune !
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => router.push("/(tabs)/create")}
      >
        <LinearGradient
          colors={theme.gradient as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.fabGradient}
        >
          <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.fabText}>Publier</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  list: { paddingBottom: 80 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyContainer: { flex: 1 },
  loadingText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
    color: "#71717a",
  },
  emptyText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 16,
    color: "#71717a",
    textAlign: "center",
  },
  emptySubtext: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#a1a1aa",
    textAlign: "center",
    marginTop: 4,
  },
  toggleContainer: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f4f4f5",
  },
  toggleText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#71717a",
  },
  toggleTextActive: {
    color: "#ffffff",
    fontFamily: "DMSans_600SemiBold",
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  fabGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  fabText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
});
