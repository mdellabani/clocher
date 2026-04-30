import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { getMyPosts, getMyRsvps, type PostType } from "@pretou/shared";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { MyPostsPanel } from "@/components/my-posts-panel";
import { MyRsvpsPanel } from "@/components/my-rsvps-panel";

type Tab = "posts" | "rsvps";

type PostRow = {
  id: string;
  title: string;
  type: PostType;
  created_at: string;
  is_pinned: boolean;
};
type RsvpRow = {
  status: string;
  posts:
    | {
        id: string;
        title: string;
        type: PostType;
        event_date: string | null;
        event_location: string | null;
      }
    | null;
};

export default function MonEspaceScreen() {
  const { profile } = useAuth();
  const theme = useTheme();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [rsvps, setRsvps] = useState<RsvpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("posts");

  const userId = profile?.id;

  const load = useCallback(async () => {
    if (!userId) return;
    const [postsRes, rsvpsRes] = await Promise.all([
      getMyPosts(supabase, userId),
      getMyRsvps(supabase, userId),
    ]);
    setPosts((postsRes.data ?? []) as PostRow[]);
    setRsvps((rsvpsRes.data ?? []) as RsvpRow[]);
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.muted, { color: theme.muted }]}>Chargement…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.tabsWrap}>
        <View style={styles.tabs}>
          <TabButton
            active={tab === "posts"}
            onPress={() => setTab("posts")}
            label="Mes publications"
            primary={theme.primary}
          />
          <TabButton
            active={tab === "rsvps"}
            onPress={() => setTab("rsvps")}
            label="Mes participations"
            primary={theme.primary}
          />
        </View>
      </View>

      {tab === "posts" ? (
        <MyPostsPanel rows={posts} />
      ) : (
        <MyRsvpsPanel rows={rsvps} />
      )}
    </ScrollView>
  );
}

function TabButton({
  active,
  onPress,
  label,
  primary,
}: {
  active: boolean;
  onPress: () => void;
  label: string;
  primary: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={[
        styles.tab,
        active && { backgroundColor: primary },
      ]}
    >
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  muted: { fontFamily: "DMSans_400Regular", fontSize: 14 },
  tabsWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  tabs: {
    flexDirection: "row",
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: "#f0e0d0",
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tabLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#7a5e4d",
  },
  tabLabelActive: {
    color: "#FFFFFF",
    fontFamily: "DMSans_600SemiBold",
  },
});
