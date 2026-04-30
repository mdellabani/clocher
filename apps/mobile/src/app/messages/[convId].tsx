import { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MoreHorizontal } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { MessageThread } from "@/components/message-thread";
import { MessageComposer } from "@/components/message-composer";
import { CrossCommuneBanner } from "@/components/cross-commune-banner";
import { confirmBlockUser } from "@/components/block-user-sheet";
import { confirmReportConversation } from "@/components/report-conversation-sheet";
import {
  getMessages,
  markConversationRead,
  type MessageRow,
} from "@pretou/shared";
import { ActionSheetIOS, Platform, Alert } from "react-native";

type Meta = {
  counterpartId: string;
  counterpartName: string;
  postTitle: string;
  crossCommune?: string;
};

export default function ThreadScreen() {
  const { convId } = useLocalSearchParams<{ convId: string }>();
  const { profile } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();
  // Stack header default ≈ 56dp on Android, 44dp on iOS, plus the status-bar
  // inset on top.
  const headerHeight = (Platform.OS === "ios" ? 44 : 56) + insets.top;

  const reload = useCallback(async () => {
    if (!convId) return;
    const { messages } = await getMessages(supabase, convId);
    setMessages(messages);
  }, [convId]);

  // Live updates: when the other participant sends a message, refetch the
  // thread. Unique channel name per conversation + mount avoids the realtime
  // reuse race that bit the feed screen.
  useEffect(() => {
    if (!convId) return;
    const channelName = `conversation:${convId}:${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${convId}`,
        },
        () => {
          void reload();
          void markConversationRead(supabase, convId).catch(() => {});
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [convId, reload]);

  useEffect(() => {
    if (!convId) return;
    let cancelled = false;
    (async () => {
      try {
        await markConversationRead(supabase, convId);
      } catch {
        // ignore — markRead is best-effort
      }
      const { data: me } = await supabase.auth.getUser();
      const { data: conv } = await supabase
        .from("conversations")
        .select(
          `
          user_a, user_b,
          post:posts(id, title),
          ua:profiles!conversations_user_a_fkey(id, display_name, commune:communes(id, name)),
          ub:profiles!conversations_user_b_fkey(id, display_name, commune:communes(id, name))
        `,
        )
        .eq("id", convId)
        .single();
      const { messages } = await getMessages(supabase, convId);
      if (cancelled) return;
      setMessages(messages);
      if (conv && me.user) {
        const ua = conv.ua as unknown as {
          id: string;
          display_name: string;
          commune: { id: string; name: string } | null;
        };
        const ub = conv.ub as unknown as {
          id: string;
          display_name: string;
          commune: { id: string; name: string } | null;
        };
        const post = conv.post as unknown as { id: string; title: string };
        const counterpart = conv.user_a === me.user.id ? ub : ua;
        const myCommune = conv.user_a === me.user.id ? ua.commune : ub.commune;
        const cross =
          counterpart.commune &&
          myCommune &&
          counterpart.commune.id !== myCommune.id
            ? counterpart.commune.name
            : undefined;
        setMeta({
          counterpartId: counterpart.id,
          counterpartName: counterpart.display_name,
          postTitle: post?.title ?? "",
          crossCommune: cross,
        });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [convId]);

  function openMenu() {
    if (!meta) return;
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Annuler", "Signaler", "Bloquer"],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 1)
            confirmReportConversation(convId!, () => {});
          if (idx === 2)
            confirmBlockUser(meta.counterpartId, () => router.back());
        },
      );
    } else {
      Alert.alert(meta.counterpartName, undefined, [
        { text: "Annuler", style: "cancel" },
        {
          text: "Signaler",
          onPress: () => confirmReportConversation(convId!, () => {}),
        },
        {
          text: "Bloquer",
          style: "destructive",
          onPress: () => confirmBlockUser(meta.counterpartId, () => router.back()),
        },
      ]);
    }
  }

  if (!convId) return null;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior="padding"
      keyboardVerticalOffset={headerHeight}
    >
      <Stack.Screen
        options={{
          title: meta?.counterpartName ?? "Conversation",
          headerBackTitle: "Retour",
          headerRight: () =>
            meta ? (
              <TouchableOpacity onPress={openMenu} style={styles.menuBtn}>
                <MoreHorizontal size={20} color="#2a1a14" />
              </TouchableOpacity>
            ) : null,
        }}
      />
      {meta?.postTitle ? (
        <View style={styles.subHeader}>
          <Text style={[styles.subText, { color: theme.muted }]} numberOfLines={1}>
            à propos de : {meta.postTitle}
          </Text>
        </View>
      ) : null}
      {meta?.crossCommune ? (
        <CrossCommuneBanner communeName={meta.crossCommune} />
      ) : null}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}>
        {loading ? (
          <Text style={styles.muted}>Chargement…</Text>
        ) : (
          <MessageThread messages={messages} myUserId={profile?.id} />
        )}
      </ScrollView>
      <MessageComposer conversationId={convId} onSent={reload} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  subHeader: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#f0e0d0",
    backgroundColor: "#FFFFFF",
  },
  subText: { fontFamily: "DMSans_400Regular", fontSize: 12 },
  scroll: { padding: 12, gap: 8 },
  muted: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#7a5e4d",
    textAlign: "center",
    paddingVertical: 24,
  },
  menuBtn: { padding: 6 },
});
