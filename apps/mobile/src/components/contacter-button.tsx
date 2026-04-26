import { Pressable, Text, StyleSheet } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { getOrCreateConversation } from "@rural-community-platform/shared";

export function ContacterButton(props: {
  postId: string;
  postType: string;
  authorId: string;
  viewerId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  if (props.postType === "annonce") return null;
  if (props.viewerId === props.authorId) return null;
  return (
    <Pressable
      style={[s.btn, pending && s.btnDisabled]}
      disabled={pending}
      onPress={async () => {
        setPending(true);
        try {
          const { id } = await getOrCreateConversation(supabase, {
            postId: props.postId,
            otherUserId: props.authorId,
          });
          router.push(`/messages/${id}`);
        } finally {
          setPending(false);
        }
      }}
    >
      <Text style={s.txt}>Contacter</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: {
    borderWidth: 1,
    borderColor: "#D35230",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
  },
  btnDisabled: { opacity: 0.5 },
  txt: {
    color: "#BF3328",
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },
});
