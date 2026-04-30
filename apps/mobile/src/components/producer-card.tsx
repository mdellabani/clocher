import { StyleSheet, Text, TouchableOpacity, View, Linking, Image } from "react-native";
import { MapPin, Clock, Phone, Truck } from "lucide-react-native";
import { useTheme } from "@/lib/theme-context";
import { PRODUCER_CATEGORIES } from "@pretou/shared";
import type { Producer } from "@pretou/shared";

interface ProducerCardProps {
  producer: Producer;
}

export function ProducerCard({ producer }: ProducerCardProps) {
  const theme = useTheme();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  };

  const handleCall = () => {
    if (producer.contact_phone) {
      Linking.openURL(`tel:${producer.contact_phone}`);
    }
  };

  const themeColor = theme.primary || "#D35230";

  const PhotoPlaceholder = () => (
    <View style={[styles.photoPlaceholder, { backgroundColor: "#4ade80" }]}>
      <Text style={styles.photoInitials}>{getInitials(producer.name)}</Text>
    </View>
  );

  return (
    <View style={[styles.card, { backgroundColor: "#FFFFFF" }]}>
      {/* Header: name and categories */}
      <View style={styles.headerSection}>
        <Text style={[styles.name, { color: "#27272a" }]} numberOfLines={1}>
          {producer.name}
        </Text>
        {producer.categories && producer.categories.length > 0 && (
          <View style={styles.categoriesRow}>
            {producer.categories.slice(0, 2).map((category) => (
              <View key={category} style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>
                  {PRODUCER_CATEGORIES.find((c) => c.value === category)?.label || category}
                </Text>
              </View>
            ))}
            {producer.categories.length > 2 && (
              <Text style={styles.moreCategories}>+{producer.categories.length - 2}</Text>
            )}
          </View>
        )}
        {producer.communes?.name && (
          <Text style={styles.commune}>{producer.communes.name}</Text>
        )}
      </View>

      {/* Pickup/Delivery info */}
      {(producer.pickup_location || producer.delivers) && (
        <View style={styles.infoSection}>
          {producer.pickup_location && (
            <View style={styles.infoPill}>
              <MapPin size={12} color="#4ade80" />
              <Text style={styles.infoPillText} numberOfLines={1}>
                {producer.pickup_location}
              </Text>
            </View>
          )}
          {producer.delivers && (
            <View style={styles.infoPill}>
              <Truck size={12} color="#4ade80" />
              <Text style={styles.infoPillText}>Livraison</Text>
            </View>
          )}
        </View>
      )}

      {/* Schedule */}
      {producer.schedule && (
        <View style={styles.scheduleRow}>
          <Clock size={12} color="#71717a" />
          <Text style={styles.scheduleText} numberOfLines={2}>
            {producer.schedule}
          </Text>
        </View>
      )}

      {/* Phone contact */}
      {producer.contact_phone && (
        <TouchableOpacity
          style={[styles.phoneButton, { borderColor: themeColor }]}
          onPress={handleCall}
          activeOpacity={0.7}
        >
          <Phone size={14} color={themeColor} />
          <Text style={[styles.phoneButtonText, { color: themeColor }]}>
            {producer.contact_phone}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerSection: {
    marginBottom: 12,
  },
  name: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
    marginBottom: 8,
  },
  categoriesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  categoryChip: {
    backgroundColor: "#dcfce7",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryChipText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: "#15803d",
  },
  moreCategories: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: "#4ade80",
  },
  commune: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#a1a1aa",
  },
  infoSection: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  infoPillText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: "#15803d",
    maxWidth: 120,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 10,
  },
  scheduleText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#71717a",
    flex: 1,
  },
  photoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  photoInitials: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 20,
    color: "#FFFFFF",
  },
  phoneButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 9,
    marginTop: 2,
  },
  phoneButtonText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },
});
