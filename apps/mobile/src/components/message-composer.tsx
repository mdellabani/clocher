import { useEffect, useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { sendMessage } from "@pretou/shared";

export function MessageComposer({
  conversationId,
  onSent,
}: {
  conversationId: string;
  onSent?: () => void | Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const trimmed = body.trim();
  const disabled = !trimmed || pending;

  // The bottom safe-area inset accounts for the gesture bar — but the gesture
  // bar disappears when the keyboard opens, so adding it then leaves the
  // composer hanging below the keyboard edge.
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardOpen(true),
    );
    const hideSub = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardOpen(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

  const paddingBottom = 12 + (keyboardOpen ? 0 : insets.bottom);

  return (
    <View style={[s.bar, { paddingBottom }]}>
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
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
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
