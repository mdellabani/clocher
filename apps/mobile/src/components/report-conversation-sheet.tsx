import { Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import { reportConversation } from "@rural-community-platform/shared";

async function submit(conversationId: string, reason: string | undefined, onDone?: () => void) {
  try {
    await reportConversation(supabase, {
      conversationId,
      reason: reason?.trim() || undefined,
    });
    onDone?.();
    Alert.alert("Merci", "La conversation a été signalée.");
  } catch (e) {
    Alert.alert("Erreur", (e as Error).message);
  }
}

export function confirmReportConversation(
  conversationId: string,
  onDone?: () => void,
) {
  // iOS supports Alert.prompt with a text input. Android does not — fall
  // back to a plain confirmation.
  if (typeof Alert.prompt === "function") {
    Alert.prompt(
      "Signaler la conversation",
      "Motif (facultatif)",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Signaler",
          style: "destructive",
          onPress: (reason?: string) => submit(conversationId, reason, onDone),
        },
      ],
      "plain-text",
    );
    return;
  }
  Alert.alert(
    "Signaler la conversation ?",
    "Le motif est facultatif et peut être ajouté plus tard.",
    [
      { text: "Annuler", style: "cancel" },
      {
        text: "Signaler",
        style: "destructive",
        onPress: () => submit(conversationId, undefined, onDone),
      },
    ],
  );
}
