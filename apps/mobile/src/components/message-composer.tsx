import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { sendMessage } from "@rural-community-platform/shared";

export function MessageComposer({
  conversationId,
  onSent,
}: {
  conversationId: string;
  onSent?: () => void | Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const trimmed = body.trim();
  const disabled = !trimmed || pending;

  async function send() {
    if (disabled) return;
    setPending(true);
    try {
      await sendMessage(supabase, { conversationId, body: trimmed });
      setBody("");
      await onSent?.();
    } finally {
      setPending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={s.bar}>
        <TextInput
          style={s.input}
          value={body}
          onChangeText={setBody}
          placeholder="Votre message…"
          placeholderTextColor="#a1a1aa"
          maxLength={4000}
          multiline
        />
        <Pressable
          onPress={send}
          disabled={disabled}
          style={[s.btn, disabled && s.btnDisabled]}
        >
          <Text style={s.btnText}>Envoyer</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderColor: "#f0e0d0",
    backgroundColor: "#ffffff",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#f0e0d0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxHeight: 100,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#2a1a14",
  },
  btn: {
    backgroundColor: "#2a1a14",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: {
    color: "#FFFFFF",
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },
});
