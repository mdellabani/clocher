import { Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import { blockUser } from "@rural-community-platform/shared";

export function confirmBlockUser(blockedId: string, onDone?: () => void) {
  Alert.alert(
    "Bloquer cet utilisateur ?",
    "Vous ne verrez plus ses publications ni ses messages.",
    [
      { text: "Annuler", style: "cancel" },
      {
        text: "Bloquer",
        style: "destructive",
        onPress: async () => {
          try {
            await blockUser(supabase, blockedId);
            onDone?.();
          } catch (e) {
            Alert.alert("Erreur", (e as Error).message);
          }
        },
      },
    ],
  );
}
