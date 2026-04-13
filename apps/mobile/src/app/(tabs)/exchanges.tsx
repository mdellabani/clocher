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
import { useRouter } from "expo-router";
import { Trash2, CalendarDays, MapPin } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";

type Tab = "posts" | "comments" | "rsvps";

interface MyPost {
  id: string;
  title: string;
  type: string;
  created_at: string;
  comment_count: number;
}

interface MyComment {
  id: string;
  body: string;
  created_at: string;
  post_id: string;
  post_title: string;
  post_type: string;
}

interface MyRsvp {
  status: string;
  post_id: string;
  post_title: string;
  event_date: string | null;
  event_location: string | null;
}

const TABS: { key: Tab; label: string }[] = [
  { key: "posts", label: "Mes publications" },
  { key: "comments", label: "Mes commentaires" },
  { key: "rsvps", label: "Mes inscriptions" },
];

const RSVP_LABELS: Record<string, string> = {
  going: "Participe",
  maybe: "Peut-être",
  not_going: "Ne participe pas",
};

const RSVP_COLORS: Record<string, { bg: string; text: string }> = {
  going: { bg: "#f0fdf4", text: "#15803d" },
  maybe: { bg: "#fffbeb", text: "#b45309" },
  not_going: { bg: "#f3f4f6", text: "#4b5563" },
};

const TYPE_COLORS: Record<string, string> = {
  annonce: "#dc2626",
  evenement: "#2563eb",
  entraide: "#16a34a",
  discussion: "#6b7280",
};

const TYPE_LABELS: Record<string, string> = {
  annonce: "Annonce",
  evenement: "Événement",
  entraide: "Entraide",
  discussion: "Discussion",
};

export default function ExchangesScreen() {
  const { session } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("posts");
  const [myPosts, setMyPosts] = useState<MyPost[]>([]);
  const [myComments, setMyComments] = useState<MyComment[]>([]);
  const [myRsvps, setMyRsvps] = useState<MyRsvp[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const userId = session?.user?.id;

  const loadData = useCallback(async () => {
    if (!userId) return;

    // Load based on active tab to avoid unnecessary queries
    if (activeTab === "posts") {
      const { data } = await supabase
        .from("posts")
        .select("id, title, type, created_at, comments(count)")
        .eq("author_id", userId)
        .order("created_at", { ascending: false });
      setMyPosts(
        (data ?? []).map((p) => ({
          id: p.id,
          title: p.title,
          type: p.type,
          created_at: p.created_at,
          comment_count: Array.isArray(p.comments) ? (p.comments[0]?.count ?? 0) : 0,
        }))
      );
    } else if (activeTab === "comments") {
      const { data } = await supabase
        .from("comments")
        .select("id, body, created_at, posts!post_id(id, title, type)")
        .eq("author_id", userId)
        .order("created_at", { ascending: false });
      setMyComments(
        (data ?? []).map((c) => {
          const post = Array.isArray(c.posts) ? c.posts[0] : c.posts;
          return {
            id: c.id,
            body: c.body,
            created_at: c.created_at,
            post_id: post?.id ?? "",
            post_title: post?.title ?? "Publication supprimée",
            post_type: post?.type ?? "discussion",
          };
        })
      );
    } else if (activeTab === "rsvps") {
      const { data } = await supabase
        .from("rsvps")
        .select("status, posts!post_id(id, title, type, event_date, event_location)")
        .eq("user_id", userId);
      setMyRsvps(
        (data ?? []).map((r) => {
          const post = Array.isArray(r.posts) ? r.posts[0] : r.posts;
          return {
            status: r.status,
            post_id: post?.id ?? "",
            post_title: post?.title ?? "Événement supprimé",
            event_date: post?.event_date ?? null,
            event_location: post?.event_location ?? null,
          };
        })
      );
    }
  }, [userId, activeTab]);

  useEffect(() => {
    setLoading(true);
    loadData().then(() => setLoading(false));
  }, [loadData]);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleDeletePost(postId: string) {
    Alert.alert(
      "Supprimer",
      "Supprimer cette publication ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            await supabase.from("posts").delete().eq("id", postId);
            setMyPosts((prev) => prev.filter((p) => p.id !== postId));
          },
        },
      ]
    );
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const renderPostItem = ({ item }: { item: MyPost }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/post/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[item.type] ?? "#6b7280" }]}>
          <Text style={styles.typeBadgeText}>{TYPE_LABELS[item.type] ?? item.type}</Text>
        </View>
      </View>
      <View style={styles.cardMeta}>
        <Text style={[styles.metaText, { color: theme.muted }]}>{formatDate(item.created_at)}</Text>
        {item.comment_count > 0 && (
          <Text style={[styles.metaText, { color: theme.muted }]}>
            · {item.comment_count} commentaire{item.comment_count > 1 ? "s" : ""}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeletePost(item.id)}
        activeOpacity={0.7}
      >
        <Trash2 size={13} color="#dc2626" />
        <Text style={styles.deleteText}>Supprimer</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderCommentItem = ({ item }: { item: MyComment }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/post/${item.post_id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { fontSize: 14 }]} numberOfLines={1}>
          {item.post_title}
        </Text>
        <View style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[item.post_type] ?? "#6b7280" }]}>
          <Text style={styles.typeBadgeText}>{TYPE_LABELS[item.post_type] ?? item.post_type}</Text>
        </View>
      </View>
      <Text style={styles.commentBody} numberOfLines={2}>
        &laquo; {item.body} &raquo;
      </Text>
      <Text style={[styles.metaText, { color: theme.muted, marginTop: 6 }]}>
        {formatDate(item.created_at)}
      </Text>
    </TouchableOpacity>
  );

  const renderRsvpItem = ({ item }: { item: MyRsvp }) => {
    const colors = RSVP_COLORS[item.status] ?? RSVP_COLORS.not_going;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/post/${item.post_id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { fontSize: 14, flex: 1 }]} numberOfLines={2}>
            {item.post_title}
          </Text>
          <View style={[styles.rsvpBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.rsvpBadgeText, { color: colors.text }]}>
              {RSVP_LABELS[item.status] ?? item.status}
            </Text>
          </View>
        </View>
        {(item.event_date || item.event_location) && (
          <View style={styles.eventDetails}>
            {item.event_date && (
              <View style={styles.eventDetailRow}>
                <CalendarDays size={12} color={theme.muted} />
                <Text style={[styles.metaText, { color: theme.muted }]}>
                  {new Date(item.event_date).toLocaleDateString("fr-FR", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </Text>
              </View>
            )}
            {item.event_location && (
              <View style={styles.eventDetailRow}>
                <MapPin size={12} color={theme.muted} />
                <Text style={[styles.metaText, { color: theme.muted }]}>
                  {item.event_location}
                </Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const emptyMessages: Record<Tab, string> = {
    posts: "Vous n'avez pas encore publié.",
    comments: "Vous n'avez pas encore commenté.",
    rsvps: "Aucune inscription à un événement.",
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: theme.muted }]}>
        {emptyMessages[activeTab]}
      </Text>
    </View>
  );

  const currentData = activeTab === "posts" ? myPosts : activeTab === "comments" ? myComments : myRsvps;
  const currentRenderItem =
    activeTab === "posts"
      ? renderPostItem
      : activeTab === "comments"
        ? renderCommentItem
        : renderRsvpItem;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Tab pills */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[
              styles.tabPill,
              activeTab === tab.key
                ? { backgroundColor: theme.primary }
                : { backgroundColor: "#FFFFFF" },
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabPillText,
                activeTab === tab.key
                  ? { color: "#FFFFFF" }
                  : { color: theme.muted },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <Text style={[styles.loadingText, { color: theme.muted }]}>Chargement...</Text>
        </View>
      ) : (
        <FlatList
          data={currentData as any[]}
          keyExtractor={(item) => item.id ?? item.post_id ?? Math.random().toString()}
          renderItem={currentRenderItem as any}
          contentContainerStyle={currentData.length === 0 ? styles.emptyList : styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={renderEmpty}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  tabPillText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  emptyList: {
    flex: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f0e8da",
    shadowColor: "#8a7850",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
    color: "#2E2118",
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 10,
    color: "#FFFFFF",
  },
  cardMeta: {
    flexDirection: "row",
    gap: 4,
    marginTop: 6,
  },
  metaText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: 10,
    backgroundColor: "#fef2f2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: "#dc2626",
  },
  commentBody: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#907B64",
    lineHeight: 20,
    marginTop: 8,
  },
  rsvpBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  rsvpBadgeText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
  },
  eventDetails: {
    marginTop: 8,
    gap: 4,
  },
  eventDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 16,
    textAlign: "center",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 16,
  },
});
