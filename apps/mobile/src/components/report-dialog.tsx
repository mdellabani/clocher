import { useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { X } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { REPORT_CATEGORIES } from "@pretou/shared";
import type { ReportCategory } from "@pretou/shared";

interface ReportDialogProps {
  postId: string;
  visible: boolean;
  onClose: () => void;
}

export function ReportDialog({ postId, visible, onClose }: ReportDialogProps) {
  const { session } = useAuth();
  const theme = useTheme();
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!category) {
      Alert.alert("Erreur", "Veuillez sélectionner une catégorie");
      return;
    }

    if (category === "autre" && !reason.trim()) {
      Alert.alert("Erreur", "Veuillez spécifier la raison pour 'Autre'");
      return;
    }

    if (!session?.user) {
      Alert.alert("Erreur", "Non authentifié");
      return;
    }

    setLoading(true);

    try {
      // Check if already reported
      const { data: existing } = await supabase
        .from("reports")
        .select("id")
        .eq("post_id", postId)
        .eq("reporter_id", session.user.id)
        .maybeSingle();

      if (existing) {
        Alert.alert("Erreur", "Vous avez déjà signalé cette publication");
        setLoading(false);
        return;
      }

      // Insert report
      const { error } = await supabase.from("reports").insert({
        post_id: postId,
        reporter_id: session.user.id,
        category,
        reason: reason.trim() || null,
      });

      if (error) {
        Alert.alert("Erreur", "Erreur lors du signalement");
        setLoading(false);
        return;
      }

      Alert.alert(
        "Succès",
        "Merci, votre signalement a été pris en compte."
      );

      // Reset and close
      setCategory(null);
      setReason("");
      setLoading(false);
      onClose();
    } catch (err) {
      Alert.alert("Erreur", "Une erreur est survenue");
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: "#27272a" }]}>
            Signaler cette publication
          </Text>
          <TouchableOpacity
            onPress={onClose}
            disabled={loading}
            style={styles.closeButton}
          >
            <X size={24} color="#27272a" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Category picker */}
          <View style={styles.section}>
            {REPORT_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryButton,
                  {
                    borderColor: category === cat.value ? theme.primary : "#e4e4e7",
                    backgroundColor:
                      category === cat.value ? theme.primary + "15" : "#FFFFFF",
                  },
                ]}
                onPress={() => setCategory(cat.value)}
                disabled={loading}
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text
                  style={[
                    styles.categoryLabel,
                    {
                      color:
                        category === cat.value
                          ? theme.primary
                          : "#27272a",
                    },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Reason input */}
          {category && (
            <View style={styles.section}>
              <Text
                style={[
                  styles.reasonLabel,
                  { color: "#27272a" },
                ]}
              >
                {category === "autre"
                  ? "Détails (obligatoire)"
                  : "Détails (optionnel)"}
              </Text>
              <TextInput
                style={[
                  styles.reasonInput,
                  {
                    color: "#27272a",
                    borderColor: "#e4e4e7",
                    backgroundColor: "#FFFFFF",
                  },
                ]}
                placeholder="Expliquez ou précisez..."
                placeholderTextColor="#71717a"
                value={reason}
                onChangeText={setReason}
                editable={!loading}
                multiline
                numberOfLines={4}
              />
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { borderColor: "#e4e4e7" },
              ]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: "#27272a" }]}>
                Annuler
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  opacity: !category || loading ? 0.5 : 1,
                },
              ]}
              onPress={handleSubmit}
              disabled={!category || loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? "Envoi..." : "Signaler"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e4e4e7",
  },
  title: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  section: {
    marginBottom: 20,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  categoryEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  categoryLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    flex: 1,
  },
  reasonLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: "top",
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },
  submitButton: {
    flex: 1,
    backgroundColor: "#dc2626",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitButtonText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
});
