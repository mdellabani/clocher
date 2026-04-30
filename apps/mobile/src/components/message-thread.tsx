import { StyleSheet, Text, View } from "react-native";
import type { MessageRow } from "@pretou/shared";

export function MessageThread({
  messages,
  myUserId,
}: {
  messages: MessageRow[];
  myUserId?: string;
}) {
  if (messages.length === 0) {
    return (
      <Text style={styles.empty}>
        Pas encore de message. Écrivez le premier.
      </Text>
    );
  }
  return (
    <View style={styles.list}>
      {messages.map((m) => {
        const mine = !!myUserId && m.sender_id === myUserId;
        return (
          <View
            key={m.id}
            style={[
              styles.bubble,
              mine ? styles.bubbleMine : styles.bubbleTheirs,
            ]}
          >
            <Text
              style={mine ? styles.textMine : styles.textTheirs}
              selectable
            >
              {m.body}
            </Text>
            <Text style={mine ? styles.timeMine : styles.timeTheirs}>
              {new Date(m.created_at).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  bubble: {
    maxWidth: "85%",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  bubbleMine: { alignSelf: "flex-end", backgroundColor: "#2a1a14" },
  bubbleTheirs: { alignSelf: "flex-start", backgroundColor: "#F5DBC8" },
  textMine: {
    color: "#FFFFFF",
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  textTheirs: {
    color: "#2a1a14",
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  timeMine: {
    color: "#d6c5b8",
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  timeTheirs: {
    color: "#7a5e4d",
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    marginTop: 4,
  },
  empty: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#7a5e4d",
    paddingVertical: 24,
    textAlign: "center",
  },
});
