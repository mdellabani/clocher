import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { takePhoto, pickImage } from "@/lib/camera";
import type { ImagePickerAsset } from "expo-image-picker";

interface ImagePickerButtonProps { onImageSelected: (asset: ImagePickerAsset) => void; }

export function ImagePickerButton({ onImageSelected }: ImagePickerButtonProps) {
  const [preview, setPreview] = useState<string | null>(null);

  function handlePress() {
    Alert.alert("Add Photo", "Choose a source", [
      { text: "Camera", onPress: async () => { const asset = await takePhoto(); if (asset) { setPreview(asset.uri); onImageSelected(asset); } } },
      { text: "Photo Library", onPress: async () => { const asset = await pickImage(); if (asset) { setPreview(asset.uri); onImageSelected(asset); } } },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  return (
    <View>
      <Pressable style={styles.button} onPress={handlePress}>
        <Text style={styles.buttonText}>{preview ? "Change Photo" : "Add Photo"}</Text>
      </Pressable>
      {preview && <Image source={{ uri: preview }} style={styles.preview} />}
    </View>
  );
}

const styles = StyleSheet.create({
  button: { borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 8, borderStyle: "dashed", padding: 16, alignItems: "center" },
  buttonText: { fontSize: 14, color: "#71717a" },
  preview: { width: "100%", height: 200, borderRadius: 8, marginTop: 12 },
});
