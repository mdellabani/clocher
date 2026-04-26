import { StyleSheet, Text, View } from "react-native";

export function CrossCommuneBanner({ communeName }: { communeName: string }) {
  return (
    <View style={s.banner}>
      <Text style={s.txt}>
        Vous écrivez à un habitant de{" "}
        <Text style={s.strong}>{communeName}</Text>.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    backgroundColor: "#FDF0EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginBottom: 4,
  },
  txt: {
    color: "#5a4030",
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
  },
  strong: { fontFamily: "DMSans_600SemiBold" },
});
