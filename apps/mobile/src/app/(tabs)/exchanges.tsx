import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import {
  getConversations,
  type InboxConversation,
} from "@rural-community-platform/shared";

export default function ExchangesScreen() {
  const { session } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const [rows, setRows] = useState<InboxConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userId = session?.user?.id;

  const load = useCallback(async () => {
    if (!userId) return;
    const { rows } = await getConversations(supabase);
    setRows(rows);
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

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

  if (rows.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.muted, { color: theme.muted }]}>
          Aucun message pour le moment.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push(`/messages/${item.id}`)}
            activeOpacity={0.7}
          >
            {item.unread ? (
              <View style={[styles.dot, { backgroundColor: theme.primary }]} />
            ) : (
              <View style={styles.dotPlaceholder} />
            )}
            <View style={{ flex: 1 }}>
              <View style={styles.headerRow}>
                <Text style={styles.name}>
                  {item.counterpart.display_name}
                </Text>
                <Text style={[styles.time, { color: theme.muted }]}>
                  {new Date(item.last_message_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                  })}
                </Text>
              </View>
              <Text style={[styles.sub, { color: theme.muted }]} numberOfLines={1}>
                à propos de : {item.post.title}
              </Text>
              {item.last_message_preview ? (
                <Text style={styles.preview} numberOfLines={1}>
                  {item.last_message_preview}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: { fontFamily: "DMSans_400Regular", fontSize: 14 },
  row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 12 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
    marginRight: 8,
  },
  dotPlaceholder: { width: 8, marginRight: 8 },
  name: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: "#2a1a14" },
  sub: { fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 },
  preview: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#5a4030",
    marginTop: 4,
  },
  time: { fontFamily: "DMSans_400Regular", fontSize: 11 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: "#f0e0d0" },
});
