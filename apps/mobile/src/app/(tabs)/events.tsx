import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { CalendarDays, MapPin } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { getPostsByType } from "@rural-community-platform/shared";
import type { Post } from "@rural-community-platform/shared";
import { EventCalendar } from "@/components/event-calendar";

export default function EventsScreen() {
  const { profile } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const [events, setEvents] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const listRef = useRef<FlatList<Post>>(null);

  const loadEvents = useCallback(async () => {
    if (!profile?.commune_id) return;
    const { data } = await getPostsByType(supabase, profile.commune_id, "evenement");
    if (data) {
      const now = new Date().toISOString();
      const upcoming = (data as Post[]).filter(
        (e) => !e.event_date || e.event_date >= now
      );
      setEvents(upcoming);
    }
  }, [profile?.commune_id]);

  useEffect(() => {
    loadEvents().then(() => setLoading(false));
  }, [loadEvents]);

  async function onRefresh() {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "Date à définir";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  function formatTime(dateStr: string | null) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Called by the calendar when a day with events is tapped.
  // Toggles date selection for filtering; also scrolls to first event as fallback.
  const handleDayPress = useCallback(
    (eventId: string, dateString: string) => {
      if (selectedDate === dateString) {
        setSelectedDate(null);
      } else {
        setSelectedDate(dateString);
      }
      // Also scroll to first event on that day
      const index = events.findIndex((e) => e.id === eventId);
      if (index >= 0 && listRef.current) {
        listRef.current.scrollToIndex({ index, animated: true, viewPosition: 0 });
      }
    },
    [events, selectedDate]
  );

  // Build calendar events from the loaded posts
  const calendarEvents = events
    .filter((e) => e.event_date != null)
    .map((e) => ({ id: e.id, date: e.event_date! }));

  // Filter events by selected date
  const filteredEvents = selectedDate
    ? events.filter((e) => {
        if (!e.event_date) return false;
        const d = new Date(e.event_date);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return dateStr === selectedDate;
      })
    : events;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      data={filteredEvents}
      keyExtractor={(item) => item.id}
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={filteredEvents.length === 0 ? styles.emptyContainer : styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListHeaderComponent={
        <View>
          <EventCalendar
            events={calendarEvents}
            onDayPress={handleDayPress}
            selectedDate={selectedDate}
          />
          {selectedDate && (
            <TouchableOpacity
              style={[styles.clearFilterChip, { backgroundColor: theme.pinBg }]}
              onPress={() => setSelectedDate(null)}
              activeOpacity={0.7}
            >
              <Text style={[styles.clearFilterText, { color: theme.primary }]}>
                Voir tout
              </Text>
            </TouchableOpacity>
          )}
        </View>
      }
      onScrollToIndexFailed={(info) => {
        // Fallback: scroll to end if index not yet measured
        listRef.current?.scrollToOffset({
          offset: info.averageItemLength * info.index,
          animated: true,
        });
      }}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push(`/post/${item.id}`)}
          activeOpacity={0.7}
        >
          {/* Date + time row */}
          <View style={[styles.dateRow, { backgroundColor: theme.pinBg }]}>
            <CalendarDays size={14} color={theme.primary} />
            <Text style={[styles.dateText, { color: theme.primary }]}>
              {formatDate(item.event_date)}
              {item.event_date ? ` · ${formatTime(item.event_date)}` : ""}
            </Text>
          </View>

          <Text style={styles.title}>{item.title}</Text>

          {item.event_location && (
            <View style={styles.locationRow}>
              <MapPin size={13} color={theme.muted} />
              <Text style={[styles.location, { color: theme.primary }]}>
                {item.event_location}
              </Text>
            </View>
          )}

          <Text style={styles.body} numberOfLines={2}>
            {item.body}
          </Text>

          <View style={styles.metaRow}>
            <Text style={[styles.author, { color: theme.muted }]}>
              {item.profiles?.display_name ?? "Anonyme"}
            </Text>
            {item.rsvps && item.rsvps.filter((r) => r.status === "going").length > 0 && (
              <Text style={[styles.rsvpCount, { color: theme.primary }]}>
                {item.rsvps.filter((r) => r.status === "going").length} participant
                {item.rsvps.filter((r) => r.status === "going").length > 1 ? "s" : ""}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: theme.muted }]}>
            Aucun événement à venir.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  emptyContainer: { flex: 1 },
  loadingText: { fontFamily: "DMSans_500Medium", fontSize: 16, color: "#a1a1aa" },
  emptyText: { fontFamily: "DMSans_500Medium", fontSize: 16, textAlign: "center" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f0e8da",
    shadowColor: "#8a7850",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  dateText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
  },
  title: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    color: "#2E2118",
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  location: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },
  body: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#907B64",
    lineHeight: 20,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  author: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
  },
  rsvpCount: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
  },
  clearFilterChip: {
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  clearFilterText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },
});
