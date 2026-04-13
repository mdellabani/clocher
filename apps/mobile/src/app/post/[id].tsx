import { useCallback, useEffect, useState } from "react";
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
import { Stack, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Megaphone,
  Calendar,
  HeartHandshake,
  MessageSquare,
  MapPin,
  CalendarDays,
  Pin,
  Trash2,
  Send,
  CheckCircle,
  HelpCircle,
  XCircle,
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import {
  getPostById,
  getComments,
  createComment,
  deleteComment,
  getRsvpCounts,
  setRsvp,
  removeRsvp,
  POST_TYPE_LABELS,
  POST_TYPE_COLORS,
} from "@rural-community-platform/shared";
import type { PostType, RsvpStatus } from "@rural-community-platform/shared";

type PostDetail = {
  id: string;
  title: string;
  body: string;
  type: string;
  is_pinned: boolean;
  event_date: string | null;
  event_location: string | null;
  created_at: string;
  author_id: string;
  profiles: { display_name: string; avatar_url: string | null };
  post_images: { id: string; storage_path: string }[];
};

type Comment = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  profiles: { display_name: string; avatar_url: string | null };
};

const RSVP_LABELS: Record<string, string> = {
  going: "J'y vais",
  maybe: "Peut-être",
  not_going: "Pas dispo",
};

const RSVP_ICONS = {
  going: CheckCircle,
  maybe: HelpCircle,
  not_going: XCircle,
};

const TYPE_ICONS: Record<string, typeof Megaphone> = {
  annonce: Megaphone,
  evenement: Calendar,
  entraide: HeartHandshake,
  discussion: MessageSquare,
};

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, isAdmin } = useAuth();
  const theme = useTheme();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [rsvpCounts, setRsvpCounts] = useState({ going: 0, maybe: 0, not_going: 0 });
  const [userRsvp, setUserRsvp] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadPost = useCallback(async () => {
    if (!id) return;
    const { data } = await getPostById(supabase, id);
    if (data) setPost(data as unknown as PostDetail);
  }, [id]);

  const loadComments = useCallback(async () => {
    if (!id) return;
    const { data } = await getComments(supabase, id);
    if (data) setComments(data as unknown as Comment[]);
  }, [id]);

  const loadRsvps = useCallback(async () => {
    if (!id) return;
    const counts = await getRsvpCounts(supabase, id);
    setRsvpCounts(counts);

    if (profile) {
      const { data } = await supabase
        .from("rsvps")
        .select("status")
        .eq("post_id", id)
        .eq("user_id", profile.id)
        .maybeSingle();
      setUserRsvp(data?.status ?? null);
    }
  }, [id, profile]);

  useEffect(() => {
    Promise.all([loadPost(), loadComments(), loadRsvps()]).then(() =>
      setLoading(false)
    );
  }, [loadPost, loadComments, loadRsvps]);

  async function handleRsvp(status: RsvpStatus) {
    if (!profile || !id) return;

    if (userRsvp === status) {
      await removeRsvp(supabase, id, profile.id);
      setUserRsvp(null);
    } else {
      await setRsvp(supabase, id, profile.id, status);
      setUserRsvp(status);
    }
    loadRsvps();
  }

  async function handleAddComment() {
    if (!profile || !id || !commentText.trim()) return;

    setSubmitting(true);
    const { data, error } = await createComment(
      supabase,
      id,
      profile.id,
      commentText.trim()
    );

    if (error) {
      Alert.alert("Erreur", "Impossible d'ajouter le commentaire");
    } else if (data) {
      setComments((prev) => [...prev, data as unknown as Comment]);
      setCommentText("");
    }
    setSubmitting(false);
  }

  async function handleDeleteComment(commentId: string) {
    Alert.alert("Supprimer", "Supprimer ce commentaire ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          await deleteComment(supabase, commentId);
          setComments((prev) => prev.filter((c) => c.id !== commentId));
        },
      },
    ]);
  }

  function getImageUrl(storagePath: string) {
    const { data } = supabase.storage
      .from("post-images")
      .getPublicUrl(storagePath);
    return data.publicUrl;
  }

  if (loading || !post) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.muted }]}>
          Chargement...
        </Text>
      </View>
    );
  }

  const typeColor =
    POST_TYPE_COLORS[post.type as PostType] ?? "#6b7280";
  const typeLabel = POST_TYPE_LABELS[post.type as PostType] ?? post.type;
  const TypeIcon = TYPE_ICONS[post.type] ?? MessageSquare;
  const isEvent = post.type === "evenement";
  const createdDate = new Date(post.created_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const authorInitial =
    post.profiles.display_name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: "Publication", headerBackTitle: "Retour" }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* Type badge row */}
        <View style={styles.headerRow}>
          <View style={[styles.badge, { backgroundColor: typeColor + "18" }]}>
            <TypeIcon size={12} color={typeColor} />
            <Text style={[styles.badgeText, { color: typeColor }]}>
              {typeLabel}
            </Text>
          </View>
          {post.is_pinned && (
            <View style={[styles.pinnedBadge, { backgroundColor: theme.pinBg }]}>
              <Pin size={11} color={theme.primary} />
              <Text style={[styles.pinnedText, { color: theme.primary }]}>
                Épinglé
              </Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title}>{post.title}</Text>

        {/* Author row */}
        <View style={styles.authorRow}>
          <View style={[styles.authorAvatar, { backgroundColor: typeColor + "28" }]}>
            <Text style={[styles.authorInitial, { color: typeColor }]}>
              {authorInitial}
            </Text>
          </View>
          <View>
            <Text style={styles.authorName}>
              {post.profiles.display_name}
            </Text>
            <Text style={styles.metaDate}>{createdDate}</Text>
          </View>
        </View>

        {/* Event info */}
        {isEvent && (
          <View style={[styles.eventBox, { backgroundColor: theme.pinBg }]}>
            {post.event_date && (
              <View style={styles.eventRow}>
                <CalendarDays size={14} color={theme.primary} />
                <Text style={[styles.eventInfo, { color: theme.primary }]}>
                  {new Date(post.event_date).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
              </View>
            )}
            {post.event_location && (
              <View style={styles.eventRow}>
                <MapPin size={14} color={theme.primary} />
                <Text style={[styles.eventInfo, { color: theme.primary }]}>
                  {post.event_location}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Body */}
        <Text style={styles.body}>{post.body}</Text>

        {/* Images */}
        {post.post_images.length > 0 && (
          <View style={styles.imageSection}>
            {post.post_images.map((img) => (
              <Image
                key={img.id}
                source={{ uri: getImageUrl(img.storage_path) }}
                style={styles.postImage}
                resizeMode="cover"
              />
            ))}
          </View>
        )}

        {/* RSVP buttons (event only) */}
        {isEvent && (
          <View style={styles.rsvpSection}>
            <Text style={styles.sectionTitle}>Participez-vous ?</Text>
            <View style={styles.rsvpRow}>
              {(["going", "maybe", "not_going"] as RsvpStatus[]).map(
                (status) => {
                  const isActive = userRsvp === status;
                  const RsvpIcon = RSVP_ICONS[status];
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.rsvpButton,
                        isActive && {
                          backgroundColor: theme.primary,
                          borderColor: theme.primary,
                        },
                      ]}
                      onPress={() => handleRsvp(status)}
                    >
                      <RsvpIcon
                        size={16}
                        color={isActive ? "#FFFFFF" : theme.muted}
                      />
                      <Text
                        style={[
                          styles.rsvpButtonText,
                          isActive && styles.rsvpButtonTextActive,
                        ]}
                      >
                        {RSVP_LABELS[status]}
                      </Text>
                      <Text
                        style={[
                          styles.rsvpCount,
                          isActive && styles.rsvpCountActive,
                        ]}
                      >
                        {rsvpCounts[status]}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </View>
          </View>
        )}

        {/* Comments */}
        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>
            Commentaires ({comments.length})
          </Text>
          {comments.map((comment) => {
            const commentInitial =
              comment.profiles.display_name?.charAt(0)?.toUpperCase() ?? "?";
            return (
              <View key={comment.id} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <View
                    style={[
                      styles.commentAvatar,
                      { backgroundColor: theme.pinBg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.commentAvatarText,
                        { color: theme.primary },
                      ]}
                    >
                      {commentInitial}
                    </Text>
                  </View>
                  <View style={styles.commentMeta}>
                    <Text style={styles.commentAuthor}>
                      {comment.profiles.display_name}
                    </Text>
                    <Text style={styles.commentDate}>
                      {new Date(comment.created_at).toLocaleDateString(
                        "fr-FR",
                        { day: "numeric", month: "short" }
                      )}
                    </Text>
                  </View>
                  {(comment.author_id === profile?.id || isAdmin) && (
                    <TouchableOpacity
                      onPress={() => handleDeleteComment(comment.id)}
                      style={styles.deleteButton}
                    >
                      <Trash2 size={14} color="#dc2626" />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.commentBody}>{comment.body}</Text>
              </View>
            );
          })}
          {comments.length === 0 && (
            <Text style={styles.noComments}>
              Aucun commentaire pour le moment.
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Comment input bar */}
      <View style={styles.commentInputBar}>
        <TextInput
          style={styles.commentInput}
          placeholder="Écrire un commentaire..."
          value={commentText}
          onChangeText={setCommentText}
          multiline
          placeholderTextColor="#a1a1aa"
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: theme.primary },
            (submitting || !commentText.trim()) && styles.sendButtonDisabled,
          ]}
          onPress={handleAddComment}
          disabled={submitting || !commentText.trim()}
        >
          <Send size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontFamily: "DMSans_400Regular", fontSize: 16 },

  headerRow: { flexDirection: "row", gap: 8, marginBottom: 12, alignItems: "center" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontFamily: "DMSans_600SemiBold", fontSize: 11 },
  pinnedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pinnedText: { fontFamily: "DMSans_500Medium", fontSize: 11 },

  title: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 22,
    color: "#18181b",
    marginBottom: 12,
    lineHeight: 30,
  },

  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  authorInitial: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  authorName: { fontFamily: "DMSans_600SemiBold", fontSize: 13, color: "#18181b" },
  metaDate: { fontFamily: "DMSans_400Regular", fontSize: 12, color: "#a1a1aa" },

  eventBox: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  eventRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eventInfo: { fontFamily: "DMSans_500Medium", fontSize: 13 },

  body: {
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: "#3f3f46",
    lineHeight: 24,
    marginBottom: 16,
  },

  imageSection: { gap: 12, marginBottom: 16 },
  postImage: { width: "100%", height: 220, borderRadius: 10 },

  rsvpSection: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
    color: "#18181b",
    marginBottom: 10,
  },
  rsvpRow: { flexDirection: "row", gap: 8 },
  rsvpButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
  },
  rsvpButtonText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: "#52525b",
  },
  rsvpButtonTextActive: { color: "#FFFFFF", fontFamily: "DMSans_600SemiBold" },
  rsvpCount: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    color: "#18181b",
  },
  rsvpCountActive: { color: "#FFFFFF" },

  commentsSection: { marginTop: 8 },
  commentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  commentAvatarText: { fontFamily: "DMSans_600SemiBold", fontSize: 12 },
  commentMeta: { flex: 1 },
  commentAuthor: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
    color: "#18181b",
  },
  commentDate: { fontFamily: "DMSans_400Regular", fontSize: 11, color: "#a1a1aa" },
  deleteButton: { padding: 4 },
  commentBody: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#3f3f46",
    lineHeight: 20,
  },
  noComments: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#a1a1aa",
    paddingVertical: 8,
    textAlign: "center",
  },

  commentInputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0E6D8",
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 10,
    padding: 10,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    maxHeight: 80,
    backgroundColor: "#fafafa",
    color: "#18181b",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: { opacity: 0.4 },
});
