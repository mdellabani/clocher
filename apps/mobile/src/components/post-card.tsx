import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Image } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Megaphone, Calendar, HeartHandshake, MessageSquare, Pin, CalendarDays, Wrench, Flag } from "lucide-react-native";
import { useTheme } from "@/lib/theme-context";
import { POST_TYPE_COLORS, CARD } from "@/constants/colors";
import { ReportDialog } from "@/components/report-dialog";
import type { Post, PostType } from "@pretou/shared";
import { POST_TYPE_LABELS } from "@pretou/shared";

function getImageUrl(storagePath: string): string {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
  return `${supabaseUrl}/storage/v1/object/public/post-images/${storagePath}`;
}

const TYPE_ICONS: Record<string, typeof Megaphone> = {
  annonce: Megaphone,
  evenement: Calendar,
  entraide: HeartHandshake,
  discussion: MessageSquare,
  service: Wrench,
};

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const router = useRouter();
  const theme = useTheme();
  const [showReport, setShowReport] = useState(false);
  const typeColor = POST_TYPE_COLORS[post.type as keyof typeof POST_TYPE_COLORS] ?? "#6b7280";
  const typeLabel = POST_TYPE_LABELS[post.type as PostType] ?? post.type;
  const TypeIcon = TYPE_ICONS[post.type] ?? MessageSquare;
  const authorName = post.profiles?.display_name ?? "Anonyme";
  const createdDate = new Date(post.created_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/post/${post.id}`)}
      activeOpacity={0.7}
    >
      {/* Pinned gradient bar */}
      {post.is_pinned && (
        <LinearGradient
          colors={theme.gradient as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.pinnedBar}
        />
      )}

      <View style={styles.container}>
        {/* Thumbnail */}
        {post.post_images && post.post_images.length > 0 && (
          <Image
            source={{ uri: getImageUrl(post.post_images[0].storage_path) }}
            style={styles.thumbnail}
          />
        )}

        <View style={styles.inner}>
          {/* Header: badge + pinned label */}
          <View style={styles.header}>
            <View style={[styles.badge, { backgroundColor: typeColor + "18" }]}>
              <TypeIcon size={12} color={typeColor} />
              <Text style={[styles.badgeText, { color: typeColor }]}>{typeLabel}</Text>
            </View>
            {post.is_pinned && (
              <View style={styles.pinnedLabel}>
                <Pin size={11} color={theme.primary} />
                <Text style={[styles.pinnedText, { color: theme.primary }]}>Épinglé</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={styles.title} numberOfLines={2}>{post.title}</Text>

          {/* Excerpt */}
          <Text style={styles.body} numberOfLines={2}>{post.body}</Text>

          {/* Event info */}
          {post.type === "evenement" && post.event_date && (
            <View style={styles.eventBox}>
              <CalendarDays size={13} color={theme.primary} />
              <Text style={[styles.eventText, { color: theme.primary }]}>
                {new Date(post.event_date).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                })}
                {post.event_location ? ` · ${post.event_location}` : ""}
              </Text>
            </View>
          )}

          {/* Expiry badge for service posts */}
          {post.expires_at && (
            <View style={styles.expiryBox}>
              <Text style={styles.expiryText}>
                {(() => {
                  const days = Math.ceil((new Date(post.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  if (days <= 0) return "Expiré";
                  if (days === 1) return "Expire aujourd'hui";
                  return `Expire dans ${days}j`;
                })()}
              </Text>
            </View>
          )}

          {/* Meta */}
          <View style={styles.footer}>
            <Text style={styles.meta}>
              {post.communes?.name && (
                <Text style={[styles.communeLabel, { color: theme.primary }]}>
                  {post.communes.name} · </Text>
              )}
              {authorName} · {createdDate}
            </Text>
            <View style={styles.metaRight}>
              <TouchableOpacity
                onPress={() => setShowReport(true)}
                style={styles.reportButton}
              >
                <Flag size={12} color={theme.muted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
      <ReportDialog
        postId={post.id}
        visible={showReport}
        onClose={() => setShowReport(false)}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD.background,
    borderRadius: CARD.borderRadius,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    overflow: "hidden",
  },
  pinnedBar: {
    height: 2.5,
  },
  container: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    resizeMode: "cover",
  },
  inner: {
    flex: 1,
    minWidth: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
  },
  pinnedLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginLeft: "auto",
  },
  pinnedText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
  },
  title: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: "#18181b",
    marginBottom: 4,
  },
  body: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#71717a",
    lineHeight: 19,
    marginBottom: 10,
  },
  eventBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FDF0EB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  eventText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  meta: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#a1a1aa",
    flex: 1,
  },
  communeLabel: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
  },
  metaRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  reportButton: {
    padding: 4,
  },
  expiryBox: {
    backgroundColor: "#fffbeb",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  expiryText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: "#b45309",
  },
});
