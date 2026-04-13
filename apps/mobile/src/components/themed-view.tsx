import { View, type ViewProps, useColorScheme } from "react-native";
import { Colors } from "@/constants/colors";

export function ThemedView({ style, ...rest }: ViewProps) {
  const colorScheme = useColorScheme() ?? "light";
  const backgroundColor = Colors[colorScheme].background;
  return <View style={[{ backgroundColor }, style]} {...rest} />;
}
