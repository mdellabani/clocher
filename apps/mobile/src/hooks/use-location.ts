import { useEffect, useState } from "react";
import * as Location from "expo-location";
import { getCurrentLocation } from "@/lib/location";

export function useLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentLocation()
      .then((loc) => { setLocation(loc); setLoading(false); })
      .catch((err) => { setError(err instanceof Error ? err.message : "Failed to get location"); setLoading(false); });
  }, []);

  return { location, error, loading };
}
