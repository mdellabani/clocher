import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  phone: string | null;
  email: string | null;
  openingHours: Record<string, string> | null;
};

export function AnnonceContactBlock({ phone, email, openingHours }: Props) {
  const hours = openingHours
    ? Object.entries(openingHours).filter(
        ([, v]) => typeof v === "string" && v.trim(),
      )
    : [];
  if (!phone && !email && hours.length === 0) return null;

  return (
    <View style={s.block}>
      {phone && (
        <Pressable
          style={s.row}
          onPress={() => Linking.openURL(`tel:${phone.replace(/\s|\./g, "")}`)}
        >
          <Text style={s.icon}>📞</Text>
          <Text style={s.link}>{phone}</Text>
        </Pressable>
      )}
      {email && (
        <Pressable style={s.row} onPress={() => Linking.openURL(`mailto:${email}`)}>
          <Text style={s.icon}>✉️</Text>
          <Text style={s.link}>{email}</Text>
        </Pressable>
      )}
      {hours.length > 0 && (
        <View style={s.row}>
          <Text style={s.icon}>🕒</Text>
          <View style={{ flex: 1 }}>
            {hours.map(([day, time]) => (
              <Text key={day} style={s.hours}>
                {day.charAt(0).toUpperCase() + day.slice(1)} : {time}
              </Text>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  block: {
    borderWidth: 1,
    borderColor: "#f0e0d0",
    backgroundColor: "#FDF0EB",
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  icon: { fontSize: 14, lineHeight: 20 },
  link: {
    color: "#BF3328",
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  hours: {
    color: "#5a4030",
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
});
