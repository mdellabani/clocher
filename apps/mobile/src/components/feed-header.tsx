import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";

export function FeedHeader() {
  const theme = useTheme();
  const { profile } = useAuth();
  const router = useRouter();

  const communeName = profile?.communes?.name ?? "Ma Commune";
  const codePostal = profile?.communes?.code_postal;
  const motto = profile?.communes?.motto;
  const initials = profile?.display_name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <LinearGradient
      colors={theme.gradient as unknown as [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Decorative circles */}
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
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => router.push("/profile")}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>

        {motto && (
          <View style={styles.mottoPill}>
            <Text style={styles.mottoText}>{motto}</Text>
          </View>
        )}
      </View>
    </LinearGradient>
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
  content: {
    zIndex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  textArea: {
    flex: 1,
    marginRight: 12,
  },
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
  circleTopRight: {
    width: 120,
    height: 120,
    top: -30,
    right: -20,
  },
  circleBottomLeft: {
    width: 80,
    height: 80,
    bottom: -20,
    left: -10,
  },
});
