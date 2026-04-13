import { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";

interface InfosPratiques {
  horaires?: string;
  contact?: string;
  services?: string;
  associations?: string;
  liens?: string;
}

const SECTION_LABELS: Record<keyof InfosPratiques, string> = {
  horaires: "Horaires de la mairie",
  contact: "Contact",
  services: "Services de proximité",
  associations: "Associations",
  liens: "Liens utiles",
};

const SECTION_ORDER: (keyof InfosPratiques)[] = [
  "horaires",
  "contact",
  "services",
  "associations",
  "liens",
];

export default function InfosPratiquesScreen() {
  const { profile } = useAuth();
  const theme = useTheme();
  const [infos, setInfos] = useState<InfosPratiques>({});
  const [communeName, setCommuneName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadInfos = useCallback(async () => {
    if (!profile?.commune_id) return;

    const { data } = await supabase
      .from("communes")
      .select("name, infos_pratiques")
      .eq("id", profile.commune_id)
      .single();

    if (data) {
      setCommuneName(data.name ?? "");
      setInfos((data.infos_pratiques as InfosPratiques) ?? {});
    }
  }, [profile?.commune_id]);

  useEffect(() => {
    loadInfos().then(() => setLoading(false));
  }, [loadInfos]);

  async function onRefresh() {
    setRefreshing(true);
    await loadInfos();
    setRefreshing(false);
  }

  const sections = SECTION_ORDER.filter(
    (key) => infos[key] && infos[key]!.trim().length > 0
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.muted }]}>
          Chargement...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={[styles.pageTitle, { color: "#18181b" }]}>
        Infos pratiques{communeName ? ` — ${communeName}` : ""}
      </Text>

      {sections.length > 0 ? (
        sections.map((key) => (
          <View key={key} style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>
              {SECTION_LABELS[key]}
            </Text>
            <Text style={styles.sectionBody}>{infos[key]}</Text>
          </View>
        ))
      ) : (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: theme.muted }]}>
            Aucune information pratique disponible pour le moment.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
  },
  pageTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 20,
    marginBottom: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sectionBody: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#3f3f46",
    lineHeight: 22,
  },
  emptyText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
    textAlign: "center",
  },
});
