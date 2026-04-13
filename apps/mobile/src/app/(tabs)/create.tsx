import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { ImagePickerButton } from "@/components/image-picker-button";
import { createPostSchema } from "@rural-community-platform/shared";
import { POST_TYPE_LABELS, POST_TYPE_COLORS } from "@rural-community-platform/shared";
import type { PostType } from "@rural-community-platform/shared";
import type { ImagePickerAsset } from "expo-image-picker";

const POST_TYPES: PostType[] = ["annonce", "evenement", "entraide", "discussion"];

export default function CreatePostScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [type, setType] = useState<PostType>("discussion");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [image, setImage] = useState<ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const parsed = createPostSchema.safeParse({
      title,
      body,
      type,
      event_date: type === "evenement" && eventDate ? new Date(eventDate).toISOString() : null,
      event_location: type === "evenement" ? eventLocation || null : null,
      epci_visible: false,
    });

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Donnees invalides";
      Alert.alert("Erreur", firstError);
      return;
    }

    if (!profile) {
      Alert.alert("Erreur", "Vous devez etre connecte");
      return;
    }

    setLoading(true);

    const { data: post, error } = await supabase
      .from("posts")
      .insert({
        ...parsed.data,
        commune_id: profile.commune_id,
        author_id: profile.id,
      })
      .select()
      .single();

    if (error || !post) {
      setLoading(false);
      Alert.alert("Erreur", "Impossible de creer la publication");
      return;
    }

    // Upload image if selected
    if (image) {
      const ext = image.uri.split(".").pop() ?? "jpg";
      const path = `posts/${post.id}/${Date.now()}.${ext}`;

      const response = await fetch(image.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(path, blob, { contentType: image.mimeType ?? "image/jpeg" });

      if (!uploadError) {
        await supabase
          .from("post_images")
          .insert({ post_id: post.id, storage_path: path });
      }
    }

    setLoading(false);
    setTitle("");
    setBody("");
    setEventDate("");
    setEventLocation("");
    setImage(null);
    setType("discussion");

    router.navigate("/(tabs)/feed");
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Type de publication</Text>
      <View style={styles.typeRow}>
        {POST_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[
              styles.typeChip,
              type === t && { backgroundColor: POST_TYPE_COLORS[t], borderColor: POST_TYPE_COLORS[t] },
            ]}
            onPress={() => setType(t)}
          >
            <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}>
              {POST_TYPE_LABELS[t]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Titre</Text>
      <TextInput
        style={styles.input}
        placeholder="Titre de votre publication"
        value={title}
        onChangeText={setTitle}
        maxLength={200}
      />

      <Text style={styles.label}>Contenu</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Redigez votre message..."
        value={body}
        onChangeText={setBody}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
        maxLength={5000}
      />

      {type === "evenement" && (
        <>
          <Text style={styles.label}>Date de l&apos;evenement (AAAA-MM-JJ)</Text>
          <TextInput
            style={styles.input}
            placeholder="2026-06-15"
            value={eventDate}
            onChangeText={setEventDate}
          />

          <Text style={styles.label}>Lieu</Text>
          <TextInput
            style={styles.input}
            placeholder="Salle des fetes, Place de la Mairie..."
            value={eventLocation}
            onChangeText={setEventLocation}
            maxLength={200}
          />
        </>
      )}

      <Text style={styles.label}>Photo (optionnelle)</Text>
      <ImagePickerButton onImageSelected={setImage} />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Publication..." : "Publier"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 24, paddingBottom: 48 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#18181b", marginBottom: 8 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  typeChip: {
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  typeChipText: { fontSize: 13, color: "#52525b", fontWeight: "500" },
  typeChipTextActive: { color: "#fff", fontWeight: "600" },
  label: { fontSize: 14, fontWeight: "600", color: "#3f3f46", marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fafafa",
  },
  textArea: { height: 120 },
  button: {
    backgroundColor: "#18181b",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
