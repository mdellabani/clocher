import * as ImagePicker from "expo-image-picker";
import { Camera } from "expo-camera";

export async function requestCameraPermission(): Promise<boolean> {
  const { status } = await Camera.requestCameraPermissionsAsync();
  return status === "granted";
}

export async function requestMediaLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === "granted";
}

export async function takePhoto(): Promise<ImagePicker.ImagePickerAsset | null> {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) return null;
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: true });
  if (result.canceled) return null;
  return result.assets[0];
}

export async function pickImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) return null;
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: true });
  if (result.canceled) return null;
  return result.assets[0];
}
