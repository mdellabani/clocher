import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { registerForPushNotifications } from "@/lib/notifications";
import { isExpoGo } from "@/lib/expo-env";

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (isExpoGo) return;

    registerForPushNotifications().then(setExpoPushToken);

    let subRemove: (() => void) | undefined;

    import("expo-notifications").then((Notifications) => {
      const notifSub = Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification received:", notification);
      });
      const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.url && typeof data.url === "string") {
          router.push(data.url as any);
        } else if (data?.conversation_id && typeof data.conversation_id === "string") {
          router.push(`/messages/${data.conversation_id}` as any);
        } else if (data?.postId && typeof data.postId === "string") {
          router.push(`/post/${data.postId}` as any);
        }
      });
      subRemove = () => {
        notifSub.remove();
        responseSub.remove();
      };
    });

    return () => subRemove?.();
  }, [router]);

  return { expoPushToken };
}
