import { useEffect, useRef, useState } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { registerForPushNotifications } from "@/lib/notifications";

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();
  const router = useRouter();

  useEffect(() => {
    registerForPushNotifications().then(setExpoPushToken);
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => { console.log("Notification received:", notification); });
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.url && typeof data.url === "string") router.push(data.url);
    });
    return () => {
      if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
      if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [router]);

  return { expoPushToken };
}
