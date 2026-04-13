import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import type { Post, PostType } from "@rural-community-platform/shared";
import { POST_TYPE_LABELS, POST_TYPE_COLORS } from "@rural-community-platform/shared";

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const router = useRouter();
  const typeColor = POST_TYPE_COLORS[post.type as PostType] ?? "#6b7280";
  const typeLabel = POST_TYPE_LABELS[post.type as PostType] ?? post.type;
  const commentCount = post.comments?.[0]?.count ?? 0;
  const authorName = post.profiles?.display_name ?? "Anonyme";
  const createdDate = new Date(post.created_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/post/${post.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
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
      <Text style={styles.body} numberOfLines={3}>
        {post.body}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.meta}>{authorName}</Text>
        <Text style={styles.metaSep}> - </Text>
        <Text style={styles.meta}>{createdDate}</Text>
        {commentCount > 0 && (
          <Text style={styles.comments}>
            {commentCount} commentaire{commentCount > 1 ? "s" : ""}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  pinnedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#fbbf24",
  },
  pinnedText: {
    color: "#78350f",
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#18181b",
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    color: "#52525b",
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
  },
  meta: {
    fontSize: 12,
    color: "#a1a1aa",
  },
  metaSep: {
    fontSize: 12,
    color: "#a1a1aa",
  },
  comments: {
    fontSize: 12,
    color: "#71717a",
    marginLeft: "auto",
  },
});
