import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Plus, Leaf, SlidersHorizontal } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { PostCard } from "@/components/post-card";
import { FeedHeader } from "@/components/feed-header";
import { FeedFilterSheet } from "@/components/feed-filter-sheet";
import { getPosts, getEpciPosts, getPostsPaginated, getPinnedPosts, getCommunesByEpci, POST_TYPE_LABELS, getProducers } from "@pretou/shared";
import type { Post, PostType } from "@pretou/shared";

type DateFilter = "" | "today" | "week" | "month";

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
  const [producerCount, setProducerCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"commune" | "epci">("commune");
  // Multi-select type filter (empty set = all)
  const [activeTypes, setActiveTypes] = useState<Set<PostType>>(new Set());
  const [dateFilter, setDateFilter] = useState<DateFilter>("");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  // Commune filtering (EPCI only)
  const [epciCommunes, setEpciCommunes] = useState<{ id: string; name: string }[]>([]);
  const [selectedCommunes, setSelectedCommunes] = useState<Set<string>>(new Set());
  // Pagination
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadPosts = useCallback(async () => {
    if (!profile?.commune_id) return;

    if (scope === "epci" && profile.communes?.epci_id) {
      // Load EPCI commune list for filter
      if (epciCommunes.length === 0) {
        const { data: ec } = await getCommunesByEpci(supabase, profile.communes.epci_id);
        if (ec) setEpciCommunes(ec.map((c) => ({ id: c.id, name: c.name })));
      }
      // EPCI scope: all posts chronologically, no pinning
      const { data } = await getEpciPosts(
        supabase,
        profile.communes.epci_id,
        selectedCommunes.size > 0 ? Array.from(selectedCommunes) : undefined
      );
      setPosts(((data ?? []) as Post[]).map((p) => ({ ...p, is_pinned: false })));
      setHasMore(false);
    } else {
      // Commune scope: pinned + paginated
      const { data: pinnedData } = await getPinnedPosts(supabase, profile.commune_id);
      const { data: paginatedData } = await getPostsPaginated(supabase, profile.commune_id, null, 20);

      if (paginatedData) {
        const allPosts = [...(pinnedData ?? []), ...(paginatedData as Post[])];
        setPosts(allPosts);
        setCursor(paginatedData.length > 0 ? paginatedData[paginatedData.length - 1].created_at : null);
        setHasMore(paginatedData.length >= 20);
      }
    }

    // Load producer count
    const { data: producers } = await getProducers(supabase);
    if (producers) setProducerCount(producers.length);
  }, [profile?.commune_id, profile?.communes?.epci_id, scope, selectedCommunes]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursor || !profile?.commune_id || scope === "epci") return;
    setLoadingMore(true);
    const { data } = await getPostsPaginated(supabase, profile.commune_id, cursor, 20);
    if (data) {
      setPosts((prev) => [...prev, ...(data as Post[])]);
      setHasMore(data.length >= 20);
      setCursor(data.length > 0 ? data[data.length - 1].created_at : null);
    }
    setLoadingMore(false);
  }, [loadingMore, hasMore, cursor, profile?.commune_id, scope]);

  useEffect(() => {
    loadPosts().then(() => setLoading(false));
  }, [loadPosts]);

  // Keep the latest loadPosts in a ref so the realtime effect can call it
  // without re-subscribing every time loadPosts' identity changes (filters,
  // cursor, scope). Re-subscribing under fast-refresh / strict-mode races
  // with cleanup and triggers Realtime's "callbacks after subscribe()" error.
  const loadPostsRef = useRef(loadPosts);
  useEffect(() => {
    loadPostsRef.current = loadPosts;
  }, [loadPosts]);

  // Realtime subscription
  useEffect(() => {
    const communeId = profile?.commune_id;
    if (!communeId) return;

    // Unique channel name per commune + mount, so a stale channel left over
    // from a previous mount can never collide with this one.
    const channelName = `posts-feed:${communeId}:${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
          filter: `commune_id=eq.${communeId}`,
        },
        () => {
          loadPostsRef.current();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.commune_id]);

  async function onRefresh() {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  }

  function toggleType(type: PostType) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function toggleCommune(communeId: string) {
    setSelectedCommunes((prev) => {
      const next = new Set(prev);
      if (next.has(communeId)) next.delete(communeId);
      else next.add(communeId);
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
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={{ padding: 16 }} /> : null
        }
        ListHeaderComponent={
          <>
            <FeedHeader />

            {/* Producers banner */}
            <TouchableOpacity
              style={[styles.producerBanner, { backgroundColor: "#ecfdf5", borderColor: "#bbf7d0" }]}
              onPress={() => router.push("/producteurs")}
              activeOpacity={0.7}
            >
              <View style={styles.producerBannerContent}>
                <View style={styles.producerBannerLeft}>
                  <View style={styles.producerBannerIcon}>
                    <Leaf size={16} color="#16a34a" />
                  </View>
                  <View>
                    <Text style={styles.producerBannerTitle}>Producteurs locaux</Text>
                    <Text style={styles.producerBannerSubtitle}>
                      {producerCount} producteur{producerCount !== 1 ? "s" : ""} · Circuit court
                    </Text>
                  </View>
                </View>
                <Text style={styles.producerBannerArrow}>→</Text>
              </View>
            </TouchableOpacity>

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

            {/* Filter button */}
            <View style={styles.filterRow}>
              {(() => {
                const filterCount = activeTypes.size + (dateFilter ? 1 : 0) + selectedCommunes.size;
                const hasFilters = filterCount > 0;
                return (
                  <TouchableOpacity
                    style={[styles.filterButton, hasFilters && { borderColor: theme.primary }]}
                    onPress={() => setFilterSheetOpen(true)}
                    activeOpacity={0.7}
                  >
                    <SlidersHorizontal size={14} color={hasFilters ? theme.primary : "#71717a"} />
                    <Text style={[styles.filterButtonText, hasFilters && { color: theme.primary }]}>
                      Filtres{hasFilters ? ` (${filterCount})` : ""}
                    </Text>
                  </TouchableOpacity>
                );
              })()}
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

      <FeedFilterSheet
        visible={filterSheetOpen}
        activeTypes={activeTypes}
        dateFilter={dateFilter}
        onToggleType={toggleType}
        onClearTypes={() => setActiveTypes(new Set())}
        onSetDate={setDateFilter}
        onClose={() => setFilterSheetOpen(false)}
        communes={scope === "epci" ? epciCommunes : undefined}
        selectedCommunes={selectedCommunes}
        onToggleCommune={toggleCommune}
        onClearCommunes={() => setSelectedCommunes(new Set())}
      />
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
  filterRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e8dfd0",
    backgroundColor: "#FFFFFF",
  },
  filterButtonText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#71717a",
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
  producerBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  producerBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  producerBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  producerBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
  },
  producerBannerTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: "#16a34a",
  },
  producerBannerSubtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#4ade80",
    marginTop: 2,
  },
  producerBannerArrow: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    color: "#16a34a",
  },
});
