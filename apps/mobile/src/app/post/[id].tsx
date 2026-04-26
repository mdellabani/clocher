import { useCallback, useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  Megaphone,
  Calendar,
  HeartHandshake,
  MessageSquare,
  MapPin,
  CalendarDays,
  Pin,
  CheckCircle,
  HelpCircle,
  XCircle,
  Flag,
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { PollDisplay } from "@/components/poll-display";
import { ReportDialog } from "@/components/report-dialog";
import { ContacterButton } from "@/components/contacter-button";
import { AnnonceContactBlock } from "@/components/annonce-contact-block";
import {
  getPostById,
  getRsvpCounts,
  setRsvp,
  removeRsvp,
  getPollByPostId,
  POST_TYPE_LABELS,
  POST_TYPE_COLORS,
} from "@rural-community-platform/shared";
import type { PostType, RsvpStatus, Poll } from "@rural-community-platform/shared";

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
  communes?: {
    name: string | null;
    phone: string | null;
    email: string | null;
    opening_hours: Record<string, string> | null;
  } | null;
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
  const { profile } = useAuth();
  const theme = useTheme();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [poll, setPoll] = useState<Poll | null>(null);
  const [rsvpCounts, setRsvpCounts] = useState({ going: 0, maybe: 0, not_going: 0 });
  const [userRsvp, setUserRsvp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);

  const loadPost = useCallback(async () => {
    if (!id) return;
    const { data } = await getPostById(supabase, id);
    if (data) setPost(data as unknown as PostDetail);
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

  const loadPoll = useCallback(async () => {
    if (!id) return;
    const { data } = await getPollByPostId(supabase, id);
    if (data) setPoll(data as unknown as Poll);
  }, [id]);

  useEffect(() => {
    Promise.all([loadPost(), loadRsvps(), loadPoll()]).then(() =>
      setLoading(false),
    );
  }, [loadPost, loadRsvps, loadPoll]);

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

        {/* Body + Report button */}
        <View style={styles.bodySection}>
          <Text style={styles.body}>{post.body}</Text>
          <TouchableOpacity
            onPress={() => setShowReport(true)}
            style={styles.reportButtonDetail}
          >
            <Flag size={14} color="#ef4444" />
            <Text style={styles.reportButtonText}>Signaler</Text>
          </TouchableOpacity>
        </View>

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

        {/* Poll */}
        {poll && profile && (
          <PollDisplay
            poll={poll}
            userId={profile.id}
            onVoteChange={loadPoll}
          />
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

        {/* Contact / messaging */}
        <View style={styles.contactSection}>
          {post.type === "annonce" ? (
            <AnnonceContactBlock
              phone={post.communes?.phone ?? null}
              email={post.communes?.email ?? null}
              openingHours={post.communes?.opening_hours ?? null}
            />
          ) : profile ? (
            <ContacterButton
              postId={post.id}
              postType={post.type}
              authorId={post.author_id}
              viewerId={profile.id}
            />
          ) : null}
        </View>
      </ScrollView>

      {id && (
        <ReportDialog
          postId={id}
          visible={showReport}
          onClose={() => setShowReport(false)}
        />
      )}
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

  bodySection: {
    marginBottom: 16,
  },
  body: {
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: "#3f3f46",
    lineHeight: 24,
    marginBottom: 10,
  },
  reportButtonDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    alignSelf: "flex-start",
  },
  reportButtonText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: "#ef4444",
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

  contactSection: { marginTop: 16, marginBottom: 8 },
});
