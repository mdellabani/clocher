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
import { useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
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
  maybe: "Peut-etre",
  not_going: "Pas dispo",
};

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, isAdmin } = useAuth();
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

    // Get current user's RSVP
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
      <View style={styles.center}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const typeColor = POST_TYPE_COLORS[post.type as PostType] ?? "#6b7280";
  const typeLabel = POST_TYPE_LABELS[post.type as PostType] ?? post.type;
  const isEvent = post.type === "evenement";
  const createdDate = new Date(post.created_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <View style={styles.wrapper}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={[styles.badge, { backgroundColor: typeColor }]}>
            <Text style={styles.badgeText}>{typeLabel}</Text>
          </View>
          {post.is_pinned && (
            <View style={styles.pinnedBadge}>
              <Text style={styles.pinnedText}>Epingle</Text>
            </View>
          )}
        </View>

        <Text style={styles.title}>{post.title}</Text>
        <Text style={styles.meta}>
          {post.profiles.display_name} - {createdDate}
        </Text>

        {/* Event info */}
        {isEvent && (
          <View style={styles.eventBox}>
            {post.event_date && (
              <Text style={styles.eventInfo}>
                Date :{" "}
                {new Date(post.event_date).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            )}
            {post.event_location && (
              <Text style={styles.eventInfo}>Lieu : {post.event_location}</Text>
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
              {(["going", "maybe", "not_going"] as RsvpStatus[]).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.rsvpButton,
                    userRsvp === status && styles.rsvpButtonActive,
                  ]}
                  onPress={() => handleRsvp(status)}
                >
                  <Text
                    style={[
                      styles.rsvpButtonText,
                      userRsvp === status && styles.rsvpButtonTextActive,
                    ]}
                  >
                    {RSVP_LABELS[status]}
                  </Text>
                  <Text
                    style={[
                      styles.rsvpCount,
                      userRsvp === status && styles.rsvpCountActive,
                    ]}
                  >
                    {rsvpCounts[status]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Comments */}
        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>
            Commentaires ({comments.length})
          </Text>
          {comments.map((comment) => (
            <View key={comment.id} style={styles.commentCard}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentAuthor}>
                  {comment.profiles.display_name}
                </Text>
                <Text style={styles.commentDate}>
                  {new Date(comment.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                  })}
                </Text>
                {(comment.author_id === profile?.id || isAdmin) && (
                  <TouchableOpacity
                    onPress={() => handleDeleteComment(comment.id)}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteText}>Supprimer</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.commentBody}>{comment.body}</Text>
            </View>
          ))}
          {comments.length === 0 && (
            <Text style={styles.noComments}>Aucun commentaire pour le moment.</Text>
          )}
        </View>
      </ScrollView>

      {/* Comment input */}
      <View style={styles.commentInputBar}>
        <TextInput
          style={styles.commentInput}
          placeholder="Ecrire un commentaire..."
          value={commentText}
          onChangeText={setCommentText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, submitting && styles.sendButtonDisabled]}
          onPress={handleAddComment}
          disabled={submitting || !commentText.trim()}
        >
          <Text style={styles.sendButtonText}>Envoyer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 16, color: "#71717a" },
  headerRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  pinnedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#fbbf24",
  },
  pinnedText: { color: "#78350f", fontSize: 12, fontWeight: "600" },
  title: { fontSize: 22, fontWeight: "bold", color: "#18181b", marginBottom: 4 },
  meta: { fontSize: 13, color: "#a1a1aa", marginBottom: 16 },
  eventBox: {
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 4,
  },
  eventInfo: { fontSize: 14, color: "#1e40af", fontWeight: "500" },
  body: { fontSize: 16, color: "#3f3f46", lineHeight: 24, marginBottom: 16 },
  imageSection: { gap: 12, marginBottom: 16 },
  postImage: { width: "100%", height: 220, borderRadius: 8 },
  rsvpSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#18181b", marginBottom: 10 },
  rsvpRow: { flexDirection: "row", gap: 8 },
  rsvpButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  rsvpButtonActive: { backgroundColor: "#18181b", borderColor: "#18181b" },
  rsvpButtonText: { fontSize: 13, color: "#52525b", fontWeight: "500" },
  rsvpButtonTextActive: { color: "#fff" },
  rsvpCount: { fontSize: 16, fontWeight: "bold", color: "#18181b", marginTop: 2 },
  rsvpCountActive: { color: "#fff" },
  commentsSection: { marginTop: 8 },
  commentCard: {
    borderBottomWidth: 1,
    borderBottomColor: "#f4f4f5",
    paddingVertical: 10,
  },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  commentAuthor: { fontSize: 13, fontWeight: "600", color: "#18181b" },
  commentDate: { fontSize: 12, color: "#a1a1aa" },
  deleteButton: { marginLeft: "auto" },
  deleteText: { fontSize: 12, color: "#dc2626" },
  commentBody: { fontSize: 14, color: "#3f3f46", lineHeight: 20 },
  noComments: { fontSize: 14, color: "#a1a1aa", paddingVertical: 8 },
  commentInputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#e4e4e7",
    backgroundColor: "#fff",
    gap: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    maxHeight: 80,
    backgroundColor: "#fafafa",
  },
  sendButton: {
    backgroundColor: "#18181b",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
