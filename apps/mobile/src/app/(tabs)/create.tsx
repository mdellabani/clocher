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
import * as ImageManipulator from "expo-image-manipulator";
import {
  Megaphone,
  Calendar,
  HeartHandshake,
  MessageSquare,
  Wrench,
  CalendarDays,
  MapPin,
  ImageIcon,
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { ImagePickerButton } from "@/components/image-picker-button";
import { createPostSchema, createPoll } from "@pretou/shared";
import { POST_TYPE_LABELS, POST_TYPE_COLORS } from "@pretou/shared";
import type { PostType, CreatePollInput } from "@pretou/shared";
import type { ImagePickerAsset } from "expo-image-picker";

const ADMIN_POST_TYPES: PostType[] = ["annonce", "evenement", "entraide", "discussion", "service"];
const RESIDENT_POST_TYPES: PostType[] = ["evenement", "entraide", "discussion", "service"];

const TYPE_ICONS: Record<PostType, typeof Megaphone> = {
  annonce: Megaphone,
  evenement: Calendar,
  entraide: HeartHandshake,
  discussion: MessageSquare,
  service: Wrench,
};

export default function CreatePostScreen() {
  const { profile, isAdmin } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const [type, setType] = useState<PostType>("discussion");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [image, setImage] = useState<ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [pollType, setPollType] = useState<"vote" | "participation">("vote");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);

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

    // Rate limiting (residents only)
    if (profile.role === "resident") {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: dailyCount } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("author_id", profile.id)
        .gte("created_at", oneDayAgo);

      if ((dailyCount ?? 0) >= 5) {
        setLoading(false);
        Alert.alert("Limite atteinte", "Vous avez atteint la limite de publications pour aujourd'hui (5 maximum)");
        return;
      }

      if (type === "service") {
        const { count: serviceCount } = await supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("author_id", profile.id)
          .eq("type", "service")
          .gte("created_at", oneDayAgo);

        if ((serviceCount ?? 0) >= 2) {
          setLoading(false);
          Alert.alert("Limite atteinte", "Vous avez atteint la limite d'annonces de service pour aujourd'hui (2 maximum)");
          return;
        }
      }
    }

    const expiresAt = type === "service"
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Word filter check
    const { data: bannedWords } = await supabase.from("word_filters").select("word");
    if (bannedWords && bannedWords.length > 0) {
      const text = `${title} ${body}`;
      const matchedWord = bannedWords.find((w) => {
        const escaped = w.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\b${escaped}\\b`, "i");
        return regex.test(text);
      });

      if (matchedWord) {
        const { data: hiddenPost, error: hiddenError } = await supabase
          .from("posts")
          .insert({
            ...parsed.data,
            commune_id: profile.commune_id,
            author_id: profile.id,
            expires_at: expiresAt,
            is_hidden: true,
          })
          .select()
          .single();

        if (hiddenError || !hiddenPost) {
          setLoading(false);
          Alert.alert("Erreur", "Impossible de créer la publication");
          return;
        }

        await supabase.from("reports").insert({
          post_id: hiddenPost.id,
          reporter_id: profile.id,
          category: "autre",
          reason: `Mot filtré automatiquement : ${matchedWord.word}`,
        });

        // Create poll if needed
        if (showPoll && pollQuestion.trim()) {
          const validOptions = pollOptions.filter((opt) => opt.trim().length > 0);
          if (validOptions.length >= 2) {
            await createPoll(supabase, hiddenPost.id, {
              question: pollQuestion,
              poll_type: pollType,
              allow_multiple: pollAllowMultiple,
              options: validOptions,
            });
          }
        }

        // Upload image if selected
        if (image) {
          const resized = await ImageManipulator.manipulateAsync(
            image.uri,
            [{ resize: { width: 800 } }],
            { compress: 0.85, format: ImageManipulator.SaveFormat.WEBP }
          );

          const path = `posts/${hiddenPost.id}/${Date.now()}.webp`;
          const response = await fetch(resized.uri);
          const blob = await response.blob();

          const { error: uploadError } = await supabase.storage
            .from("post-images")
            .upload(path, blob, { contentType: "image/webp" });

          if (!uploadError) {
            await supabase
              .from("post_images")
              .insert({ post_id: hiddenPost.id, storage_path: path });
          }
        }

        setLoading(false);
        Alert.alert("En cours de vérification", "Votre publication est en cours de vérification par un modérateur.");
        setTitle(""); setBody(""); setEventDate(""); setEventLocation("");
        setImage(null); setType("discussion"); setShowPoll(false);
        setPollQuestion(""); setPollOptions(["", ""]); setPollAllowMultiple(false);
        router.navigate("/(tabs)/feed");
        return;
      }
    }

    const { data: post, error } = await supabase
      .from("posts")
      .insert({
        ...parsed.data,
        commune_id: profile.commune_id,
        author_id: profile.id,
        expires_at: expiresAt,
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
      const resized = await ImageManipulator.manipulateAsync(
        image.uri,
        [{ resize: { width: 800 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.WEBP }
      );

      const path = `posts/${post.id}/${Date.now()}.webp`;
      const response = await fetch(resized.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(path, blob, { contentType: "image/webp" });

      if (!uploadError) {
        await supabase
          .from("post_images")
          .insert({ post_id: post.id, storage_path: path });
      }
    }

    // Create poll if enabled
    if (showPoll && pollQuestion.trim()) {
      const validOptions = pollOptions
        .filter((opt) => opt.trim().length > 0);

      if (validOptions.length >= 2) {
        const pollData: CreatePollInput = {
          question: pollQuestion,
          poll_type: pollType,
          allow_multiple: pollAllowMultiple,
          options: validOptions,
        };

        const pollResult = await createPoll(supabase, post.id, pollData);
        if (pollResult.error) {
          Alert.alert("Avertissement", "La publication a été créée mais le sondage a échoué");
        }
      }
    }

    setLoading(false);
    setTitle("");
    setBody("");
    setEventDate("");
    setEventLocation("");
    setImage(null);
    setType("discussion");
    setShowPoll(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollAllowMultiple(false);

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
        {(isAdmin ? ADMIN_POST_TYPES : RESIDENT_POST_TYPES).map((t) => {
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

      {/* Poll toggle */}
      <TouchableOpacity
        style={[
          styles.pollToggle,
          showPoll && { backgroundColor: selectedTypeColor + "18" },
        ]}
        onPress={() => setShowPoll(!showPoll)}
      >
        <View style={styles.pollToggleCheckbox}>
          {showPoll && (
            <View
              style={[
                styles.pollToggleCheckboxInner,
                { backgroundColor: selectedTypeColor },
              ]}
            />
          )}
        </View>
        <Text style={[styles.pollToggleText, showPoll && { color: selectedTypeColor }]}>
          Ajouter un sondage
        </Text>
      </TouchableOpacity>

      {/* Poll form */}
      {showPoll && (
        <View style={styles.pollFormContainer}>
          {/* Poll type selector */}
          <Text style={styles.label}>Type de sondage</Text>
          <View style={styles.pollTypeRow}>
            <TouchableOpacity
              style={[
                styles.pollTypeButton,
                pollType === "vote" && {
                  backgroundColor: selectedTypeColor,
                  borderColor: selectedTypeColor,
                },
              ]}
              onPress={() => {
                setPollType("vote");
                setPollQuestion("");
                setPollOptions(["", ""]);
                setPollAllowMultiple(false);
              }}
            >
              <Text
                style={[
                  styles.pollTypeButtonText,
                  pollType === "vote" && styles.pollTypeButtonTextActive,
                ]}
              >
                Vote
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.pollTypeButton,
                pollType === "participation" && {
                  backgroundColor: selectedTypeColor,
                  borderColor: selectedTypeColor,
                },
              ]}
              onPress={() => {
                setPollType("participation");
                setPollQuestion("Qui participe ?");
                setPollOptions(["Je participe", "Peut-être", "Pas disponible"]);
                setPollAllowMultiple(false);
              }}
            >
              <Text
                style={[
                  styles.pollTypeButtonText,
                  pollType === "participation" && styles.pollTypeButtonTextActive,
                ]}
              >
                Participation
              </Text>
            </TouchableOpacity>
          </View>

          {pollType === "vote" ? (
            <>
              {/* Question */}
              <Text style={styles.label}>Question</Text>
              <TextInput
                style={styles.input}
                placeholder="Quel est votre avis ?"
                value={pollQuestion}
                onChangeText={setPollQuestion}
                maxLength={200}
                placeholderTextColor="#a1a1aa"
              />

              {/* Options */}
              <Text style={styles.label}>Options (min 2, max 6)</Text>
              {pollOptions.map((option, index) => (
                <View key={index} style={styles.optionRow}>
                  <TextInput
                    style={styles.optionInput}
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChangeText={(value) => {
                      const newOptions = [...pollOptions];
                      newOptions[index] = value;
                      setPollOptions(newOptions);
                    }}
                    maxLength={100}
                    placeholderTextColor="#a1a1aa"
                  />
                  {pollOptions.length > 2 && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => {
                        const newOptions = pollOptions.filter(
                          (_, i) => i !== index
                        );
                        setPollOptions(newOptions);
                      }}
                    >
                      <Text style={styles.removeButtonText}>Supprimer</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {/* Add option button */}
              {pollOptions.length < 6 && (
                <TouchableOpacity
                  style={styles.addOptionButton}
                  onPress={() => setPollOptions([...pollOptions, ""])}
                >
                  <Text style={[styles.addOptionButtonText, { color: selectedTypeColor }]}>
                    + Ajouter une option
                  </Text>
                </TouchableOpacity>
              )}

              {/* Allow multiple toggle */}
              <TouchableOpacity
                style={styles.multipleToggle}
                onPress={() => setPollAllowMultiple(!pollAllowMultiple)}
              >
                <View style={styles.pollToggleCheckbox}>
                  {pollAllowMultiple && (
                    <View
                      style={[
                        styles.pollToggleCheckboxInner,
                        { backgroundColor: selectedTypeColor },
                      ]}
                    />
                  )}
                </View>
                <Text style={styles.multipleToggleText}>Choix multiple</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.participationInfo}>
              <Text style={styles.participationInfoTitle}>
                Question : Qui participe ?
              </Text>
              <Text style={styles.participationInfoDesc}>
                Les options sont définies automatiquement pour ce type de sondage.
              </Text>
              <View style={styles.participationOptionsList}>
                {["Je participe", "Peut-être", "Pas disponible"].map((opt) => (
                  <View key={opt} style={styles.participationOptionBadge}>
                    <Text style={styles.participationOptionText}>{opt}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Service notice */}
      {type === "service" && (
        <View style={styles.serviceNotice}>
          <Text style={styles.serviceNoticeText}>
            Les annonces de service expirent automatiquement après 7 jours.
          </Text>
        </View>
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
  serviceNotice: {
    backgroundColor: "#fffbeb",
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  serviceNoticeText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#b45309",
  },
  pollToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    backgroundColor: "#FFFFFF",
  },
  pollToggleCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#e4e4e7",
    justifyContent: "center",
    alignItems: "center",
  },
  pollToggleCheckboxInner: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  pollToggleText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    color: "#3f3f46",
  },
  pollFormContainer: {
    backgroundColor: "#fafafa",
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  pollTypeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  pollTypeButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  pollTypeButtonText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#52525b",
  },
  pollTypeButtonTextActive: {
    color: "#FFFFFF",
    fontFamily: "DMSans_600SemiBold",
  },
  optionRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    alignItems: "center",
  },
  optionInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 8,
    padding: 10,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    backgroundColor: "#FFFFFF",
    color: "#18181b",
  },
  removeButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fee2e2",
  },
  removeButtonText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: "#dc2626",
  },
  addOptionButton: {
    paddingVertical: 10,
    marginBottom: 12,
  },
  addOptionButtonText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },
  multipleToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  multipleToggleText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#3f3f46",
  },
  participationInfo: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
  },
  participationInfoTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
    color: "#18181b",
    marginBottom: 6,
  },
  participationInfoDesc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 10,
  },
  participationOptionsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  participationOptionBadge: {
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  participationOptionText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: "#52525b",
  },
});
