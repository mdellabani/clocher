import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ShieldCheck,
  MessageCircle,
  Lightbulb,
} from "lucide-react-native";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { useUnreadCount } from "@/hooks/use-unread-count";
import { FeedbackSheet } from "@/components/feedback-sheet";

export function FeedHeader() {
  const theme = useTheme();
  const { profile, session, isAdmin } = useAuth();
  const router = useRouter();
  const [showFeedback, setShowFeedback] = useState(false);
  const { data: unread } = useUnreadCount(!!session?.user?.id);
  const hasUnread = (unread ?? 0) > 0;

  const communeName = profile?.communes?.name ?? "Ma Commune";
  const codePostal = profile?.communes?.code_postal;
  const motto = profile?.communes?.motto;
  const initials = profile?.display_name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <>
      <LinearGradient
        colors={theme.gradient as unknown as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={[styles.circle, styles.circleTopRight]} />
        <View style={[styles.circle, styles.circleBottomLeft]} />

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.textArea}>
              <Text style={styles.communeName}>{communeName}</Text>
              {codePostal && (
                <Text style={styles.subtitle}>
                  {codePostal} · {theme.region}
                </Text>
              )}
            </View>
            <View style={styles.rightIcons}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => router.push("/messages")}
                activeOpacity={0.8}
                accessibilityLabel="Messages"
              >
                <MessageCircle size={17} color="#FFFFFF" />
                {hasUnread && (
                  <View
                    style={[styles.dot, { backgroundColor: theme.primary }]}
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setShowFeedback(true)}
                activeOpacity={0.8}
                accessibilityLabel="Envoyer un retour"
              >
                <Lightbulb size={17} color="#FFFFFF" />
              </TouchableOpacity>
              {isAdmin && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => router.push("/admin/moderation")}
                  activeOpacity={0.8}
                >
                  <ShieldCheck size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.avatar}
                onPress={() => router.push("/profile")}
                activeOpacity={0.8}
              >
                <Text style={styles.avatarText}>{initials}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {motto && (
            <View style={styles.mottoPill}>
              <Text style={styles.mottoText}>{motto}</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <FeedbackSheet visible={showFeedback} onClose={() => setShowFeedback(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    position: "relative",
    overflow: "hidden",
  },
  content: { zIndex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  textArea: { flex: 1, marginRight: 12 },
  communeName: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 21,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.65)",
  },
  rightIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  dot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  mottoPill: {
    marginTop: 14,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  mottoText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    fontStyle: "italic",
  },
  circle: {
    position: "absolute",
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  circleTopRight: { width: 120, height: 120, top: -30, right: -20 },
  circleBottomLeft: { width: 80, height: 80, bottom: -20, left: -10 },
});
