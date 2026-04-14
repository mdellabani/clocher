import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { Search, X } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { PRODUCER_CATEGORIES, getProducers } from "@rural-community-platform/shared";
import { ProducerCard } from "@/components/producer-card";
import type { Producer } from "@rural-community-platform/shared";

export default function ProducersScreen() {
  const { profile } = useAuth();
  const theme = useTheme();
  const [producers, setProducers] = useState<Producer[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  const loadProducers = useCallback(async () => {
    const { data } = await getProducers(supabase);
    if (data) setProducers(data as Producer[]);
  }, []);

  useEffect(() => {
    loadProducers().then(() => setLoading(false));
  }, [loadProducers]);

  async function onRefresh() {
    setRefreshing(true);
    await loadProducers();
    setRefreshing(false);
  }

  function toggleCategory(category: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  const filteredProducers = useMemo(() => {
    return producers.filter((p) => {
      const searchMatch =
        searchQuery === "" ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());

      const categoryMatch =
        selectedCategories.size === 0 ||
        (p.categories?.some((cat) => selectedCategories.has(cat)) ?? false);

      return searchMatch && categoryMatch;
    });
  }, [producers, searchQuery, selectedCategories]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Producteurs locaux",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.primary,
          headerTitleStyle: {
            fontFamily: "DMSans_600SemiBold",
            fontSize: 18,
            color: "#27272a",
          },
        }}
      />

      <View style={[styles.wrapper, { backgroundColor: theme.background }]}>
        <FlatList
          data={filteredProducers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProducerCard producer={item} />}
          contentContainerStyle={
            filteredProducers.length === 0 ? styles.emptyContainer : styles.list
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <>
              {/* Search bar */}
              <View style={[styles.searchBar, { borderColor: "#e8dfd0" }]}>
                <Search size={18} color="#a1a1aa" />
                <TextInput
                  style={[styles.searchInput, { color: "#27272a" }]}
                  placeholder="Chercher un producteur..."
                  placeholderTextColor="#a1a1aa"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery !== "" && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <X size={18} color="#a1a1aa" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Category filter pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pillsRow}
              >
                {PRODUCER_CATEGORIES.map((cat) => {
                  const isActive = selectedCategories.has(cat.value);
                  return (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.pill,
                        isActive && {
                          backgroundColor: theme.primary,
                          borderColor: theme.primary,
                        },
                      ]}
                      onPress={() => toggleCategory(cat.value)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          isActive && styles.pillTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                Aucun producteur pour le moment.
              </Text>
              <Text style={styles.emptySubtext}>
                Revenez bientôt pour découvrir nos producteurs locaux !
              </Text>
            </View>
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  list: { paddingBottom: 20 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyContainer: { flex: 1 },
  loadingText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
    color: "#71717a",
  },
  emptyText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 16,
    color: "#71717a",
    textAlign: "center",
  },
  emptySubtext: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#a1a1aa",
    textAlign: "center",
    marginTop: 4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  searchInput: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
  },
  pillsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e8dfd0",
    backgroundColor: "#FFFFFF",
  },
  pillText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: "#71717a",
  },
  pillTextActive: {
    fontFamily: "DMSans_600SemiBold",
    color: "#FFFFFF",
  },
});
