import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
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
import { getPosts, getEpciPosts, POST_TYPE_LABELS } from "@rural-community-platform/shared";
import type { Post, PostType } from "@rural-community-platform/shared";

// --- Filter options ---

const TYPE_OPTIONS: { value: PostType; label: string }[] = [
  { value: "annonce", label: POST_TYPE_LABELS.annonce },
  { value: "evenement", label: POST_TYPE_LABELS.evenement },
  { value: "entraide", label: POST_TYPE_LABELS.entraide },
  { value: "discussion", label: POST_TYPE_LABELS.discussion },
];

type DateFilter = "" | "today" | "week" | "month";

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: "", label: "Toutes" },
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois" },
];

function isWithinDate(dateFilter: DateFilter, createdAt: string): boolean {
  if (!dateFilter) return true;
  const now = new Date();
  const postDate = new Date(createdAt);
  if (dateFilter === "today") {
    return (
      postDate.getFullYear() === now.getFullYear() &&
      postDate.getMonth() === now.getMonth() &&
      postDate.getDate() === now.getDate()
    );
  }
  if (dateFilter === "week") {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return postDate >= startOfWeek;
  }
  if (dateFilter === "month") {
    return (
      postDate.getFullYear() === now.getFullYear() &&
      postDate.getMonth() === now.getMonth()
    );
  }
  return true;
}

export default function FeedScreen() {
  const { profile } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"commune" | "epci">("commune");
  // Multi-select type filter (empty set = all)
  const [activeTypes, setActiveTypes] = useState<Set<PostType>>(new Set());
  const [dateFilter, setDateFilter] = useState<DateFilter>("");

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

  function toggleType(type: PostType) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const typeMatch =
        activeTypes.size === 0 || activeTypes.has(p.type as PostType);
      const dateMatch = isWithinDate(dateFilter, p.created_at);
      return typeMatch && dateMatch;
    });
  }, [posts, activeTypes, dateFilter]);

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

            {/* Scope toggle */}
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

            {/* Filter pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillsRow}
            >
              {/* "Tout" clears type selection */}
              <TouchableOpacity
                style={[
                  styles.pill,
                  activeTypes.size === 0 && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() => setActiveTypes(new Set())}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pillText,
                    activeTypes.size === 0 && styles.pillTextActive,
                  ]}
                >
                  Tout
                </Text>
              </TouchableOpacity>

              {TYPE_OPTIONS.map((opt) => {
                const isActive = activeTypes.has(opt.value);
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.pill,
                      isActive && {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ]}
                    onPress={() => toggleType(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        isActive && styles.pillTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <View style={styles.pillSeparator} />

              {DATE_OPTIONS.map((opt) => {
                const isActive = dateFilter === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.pill,
                      isActive && {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ]}
                    onPress={() => setDateFilter(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        isActive && styles.pillTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
    paddingTop: 10,
    paddingBottom: 10,
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
  pillsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e8dfd0",
    backgroundColor: "#FFFFFF",
  },
  pillText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: "#71717a",
  },
  pillTextActive: {
    fontFamily: "DMSans_600SemiBold",
    color: "#FFFFFF",
  },
  pillSeparator: {
    width: 1,
    height: 20,
    backgroundColor: "#e8dfd0",
    marginHorizontal: 4,
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
