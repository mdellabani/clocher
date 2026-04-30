import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import {
  getConversations,
  type InboxConversation,
} from "@pretou/shared";

const TIME_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});

function formatRowTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return TIME_FORMATTER.format(d);
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) return "Hier";
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "2-digit",
  });
}

function getInitial(name: string | undefined): string {
  if (!name) return "?";
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

export function InboxPanel() {
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

  if (rows.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: theme.background }]}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.pinBg }]}>
          <Text style={styles.emptyIconText}>✉</Text>
        </View>
        <Text style={styles.emptyTitle}>Aucun message</Text>
        <Text style={[styles.emptySub, { color: theme.muted }]}>
          Vos conversations apparaîtront ici.{"\n"}Lancez-en une depuis une publication.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(r) => r.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      renderItem={({ item }) => {
        const unread = !!item.unread;
        return (
          <TouchableOpacity
            style={[
              styles.row,
              unread && { backgroundColor: theme.pinBg + "30" },
            ]}
            onPress={() => router.push(`/messages/${item.id}`)}
            activeOpacity={0.6}
          >
            <View
              style={[
                styles.avatar,
                { backgroundColor: theme.pinBg },
                unread && {
                  borderWidth: 2,
                  borderColor: theme.primary,
                },
              ]}
            >
              <Text style={[styles.avatarText, { color: theme.primary }]}>
                {getInitial(item.counterpart.display_name)}
              </Text>
            </View>
            <View style={styles.body}>
              <View style={styles.topRow}>
                <Text
                  style={[styles.name, unread && styles.nameUnread]}
                  numberOfLines={1}
                >
                  {item.counterpart.display_name}
                </Text>
                <Text
                  style={[
                    styles.time,
                    { color: unread ? theme.primary : theme.muted },
                    unread && styles.timeUnread,
                  ]}
                >
                  {formatRowTime(item.last_message_at)}
                </Text>
              </View>
              <Text style={[styles.sub, { color: theme.muted }]} numberOfLines={1}>
                {item.post.title}
              </Text>
              {item.last_message_preview ? (
                <Text
                  style={[styles.preview, unread && styles.previewUnread]}
                  numberOfLines={1}
                >
                  {item.last_message_preview}
                </Text>
              ) : null}
            </View>
            {unread && (
              <View
                style={[styles.unreadDot, { backgroundColor: theme.primary }]}
              />
            )}
          </TouchableOpacity>
        );
      }}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  muted: { fontFamily: "DMSans_400Regular", fontSize: 14 },

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconText: { fontSize: 24 },
  emptyTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    color: "#2a1a14",
  },
  emptySub: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: "DMSans_600SemiBold", fontSize: 16 },
  body: { flex: 1, minWidth: 0 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
    color: "#2a1a14",
    flexShrink: 1,
  },
  nameUnread: { fontFamily: "DMSans_600SemiBold" },
  time: { fontFamily: "DMSans_400Regular", fontSize: 11 },
  timeUnread: { fontFamily: "DMSans_600SemiBold" },
  sub: { fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 },
  preview: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#7a5e4d",
    marginTop: 4,
  },
  previewUnread: { color: "#2a1a14", fontFamily: "DMSans_500Medium" },
  unreadDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 4 },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#f0e0d0",
    marginLeft: 72,
  },
});
