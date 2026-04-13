import * as Location from "expo-location";

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
}

export async function getCurrentLocation(): Promise<Location.LocationObject | null> {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) return null;
  return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
}

export async function watchLocation(callback: (location: Location.LocationObject) => void): Promise<Location.LocationSubscription | null> {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) return null;
  return Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 10 }, callback);
}
