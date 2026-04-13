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
import { LinearGradient } from "expo-linear-gradient";
import {
  Megaphone,
  Calendar,
  HeartHandshake,
  MessageSquare,
  CalendarDays,
  MapPin,
  ImageIcon,
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { ImagePickerButton } from "@/components/image-picker-button";
import { createPostSchema } from "@rural-community-platform/shared";
import { POST_TYPE_LABELS, POST_TYPE_COLORS } from "@rural-community-platform/shared";
import type { PostType } from "@rural-community-platform/shared";
import type { ImagePickerAsset } from "expo-image-picker";

const POST_TYPES: PostType[] = ["annonce", "evenement", "entraide", "discussion"];

const TYPE_ICONS: Record<PostType, typeof Megaphone> = {
  annonce: Megaphone,
  evenement: Calendar,
  entraide: HeartHandshake,
  discussion: MessageSquare,
};

export default function CreatePostScreen() {
  const { profile } = useAuth();
  const theme = useTheme();
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
      event_date:
        type === "evenement" && eventDate
          ? new Date(eventDate).toISOString()
          : null,
      event_location:
        type === "evenement" ? eventLocation || null : null,
      epci_visible: false,
    });

    if (!parsed.success) {
      const firstError =
        parsed.error.errors[0]?.message ?? "Données invalides";
      Alert.alert("Erreur", firstError);
      return;
    }

    if (!profile) {
      Alert.alert("Erreur", "Vous devez être connecté");
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
      Alert.alert("Erreur", "Impossible de créer la publication");
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

  const selectedTypeColor =
    POST_TYPE_COLORS[type] ?? theme.primary;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Type pills */}
      <Text style={styles.sectionTitle}>Type de publication</Text>
      <View style={styles.typeRow}>
        {POST_TYPES.map((t) => {
          const isActive = type === t;
          const tColor = POST_TYPE_COLORS[t];
          const Icon = TYPE_ICONS[t];
          return (
            <TouchableOpacity
              key={t}
              style={[
                styles.typeChip,
                isActive
                  ? { backgroundColor: tColor, borderColor: tColor }
                  : { borderColor: "#e4e4e7", backgroundColor: "#FFFFFF" },
              ]}
              onPress={() => setType(t)}
            >
              <Icon size={14} color={isActive ? "#FFFFFF" : tColor} />
              <Text
                style={[
                  styles.typeChipText,
                  { color: isActive ? "#FFFFFF" : tColor },
                  isActive && styles.typeChipTextActive,
                ]}
              >
                {POST_TYPE_LABELS[t]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Title */}
      <Text style={styles.label}>Titre</Text>
      <TextInput
        style={styles.input}
        placeholder="Titre de votre publication"
        value={title}
        onChangeText={setTitle}
        maxLength={200}
        placeholderTextColor="#a1a1aa"
      />

      {/* Body */}
      <Text style={styles.label}>Contenu</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Rédigez votre message..."
        value={body}
        onChangeText={setBody}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
        maxLength={5000}
        placeholderTextColor="#a1a1aa"
      />

      {/* Event fields */}
      {type === "evenement" && (
        <>
          <Text style={styles.label}>
            <CalendarDays size={13} color={selectedTypeColor} />
            {"  "}Date de l&apos;événement (AAAA-MM-JJ)
          </Text>
          <TextInput
            style={styles.input}
            placeholder="2026-06-15"
            value={eventDate}
            onChangeText={setEventDate}
            placeholderTextColor="#a1a1aa"
          />

          <Text style={styles.label}>
            <MapPin size={13} color={selectedTypeColor} />
            {"  "}Lieu
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Salle des fêtes, Place de la Mairie..."
            value={eventLocation}
            onChangeText={setEventLocation}
            maxLength={200}
            placeholderTextColor="#a1a1aa"
          />
        </>
      )}

      {/* Photo */}
      <Text style={styles.label}>
        <ImageIcon size={13} color={theme.muted} />
        {"  "}Photo (optionnelle)
      </Text>
      <ImagePickerButton onImageSelected={setImage} />

      {/* Submit gradient button */}
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={theme.gradient as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.buttonGradient}
        >
          <Text style={styles.buttonText}>
            {loading ? "Publication..." : "Publier"}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  sectionTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: "#18181b",
    marginBottom: 10,
  },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  typeChipText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },
  typeChipTextActive: { fontFamily: "DMSans_600SemiBold" },
  label: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
    color: "#3f3f46",
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 10,
    padding: 12,
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    backgroundColor: "#FFFFFF",
    color: "#18181b",
  },
  textArea: { height: 120 },
  button: {
    borderRadius: 12,
    marginTop: 28,
    overflow: "hidden",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonGradient: {
    padding: 15,
    alignItems: "center",
  },
  buttonText: {
    fontFamily: "DMSans_600SemiBold",
    color: "#FFFFFF",
    fontSize: 15,
  },
});
