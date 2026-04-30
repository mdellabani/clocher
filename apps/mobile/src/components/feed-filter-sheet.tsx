import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/lib/theme-context";
import { POST_TYPE_LABELS } from "@pretou/shared";
import type { PostType } from "@pretou/shared";

const TYPE_OPTIONS: { value: PostType; label: string }[] = [
  { value: "annonce", label: POST_TYPE_LABELS.annonce },
  { value: "evenement", label: POST_TYPE_LABELS.evenement },
  { value: "entraide", label: POST_TYPE_LABELS.entraide },
  { value: "discussion", label: POST_TYPE_LABELS.discussion },
  { value: "service", label: POST_TYPE_LABELS.service },
];

type DateFilter = "" | "today" | "week" | "month";

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: "", label: "Toutes" },
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
];

interface FeedFilterSheetProps {
  visible: boolean;
  activeTypes: Set<PostType>;
  dateFilter: DateFilter;
  onToggleType: (type: PostType) => void;
  onClearTypes: () => void;
  onSetDate: (value: DateFilter) => void;
  onClose: () => void;
  // Commune filtering (EPCI only)
  communes?: { id: string; name: string }[];
  selectedCommunes?: Set<string>;
  onToggleCommune?: (id: string) => void;
  onClearCommunes?: () => void;
}

export function FeedFilterSheet({
  visible,
  activeTypes,
  dateFilter,
  onToggleType,
  onClearTypes,
  onSetDate,
  onClose,
  communes,
  selectedCommunes,
  onToggleCommune,
  onClearCommunes,
}: FeedFilterSheetProps) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Type filters */}
          <Text style={styles.sectionLabel}>Catégorie</Text>
          <View style={styles.pillGrid}>
            <TouchableOpacity
              style={[
                styles.pill,
                activeTypes.size === 0 && { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}
              onPress={onClearTypes}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, activeTypes.size === 0 && styles.pillTextActive]}>
                Tout
              </Text>
            </TouchableOpacity>
            {TYPE_OPTIONS.map((opt) => {
              const isActive = activeTypes.has(opt.value);
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.pill,
                    isActive && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                  onPress={() => onToggleType(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Date filters */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Période</Text>
          <View style={styles.pillGrid}>
            {DATE_OPTIONS.map((opt) => {
              const isActive = dateFilter === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.pill,
                    isActive && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                  onPress={() => onSetDate(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Commune filters (EPCI only) */}
          {communes && communes.length > 0 && onToggleCommune && onClearCommunes && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Communes</Text>
              <View style={styles.pillGrid}>
                <TouchableOpacity
                  style={[
                    styles.pill,
                    (selectedCommunes?.size ?? 0) === 0 && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                  onPress={onClearCommunes}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, (selectedCommunes?.size ?? 0) === 0 && styles.pillTextActive]}>
                    Toutes
                  </Text>
                </TouchableOpacity>
                {communes.map((c) => {
                  const isActive = selectedCommunes?.has(c.id) ?? false;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.pill,
                        isActive && { backgroundColor: theme.primary, borderColor: theme.primary },
                      ]}
                      onPress={() => onToggleCommune(c.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Apply button */}
          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: theme.primary }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.applyText}>Appliquer</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    maxHeight: "70%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e4e4e7",
    alignSelf: "center",
    marginBottom: 20,
  },
  sectionLabel: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
    color: "#a1a1aa",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  pillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e8dfd0",
    backgroundColor: "#FFFFFF",
  },
  pillText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#71717a",
  },
  pillTextActive: {
    fontFamily: "DMSans_600SemiBold",
    color: "#FFFFFF",
  },
  applyButton: {
    marginTop: 24,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  applyText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
});
