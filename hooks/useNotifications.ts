import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { requestNotificationPermission } from '@/lib/notifications';

export const useNotifications = () => {
  const router = useRouter();

  useEffect(() => {
    requestNotificationPermission();

    const notificationListener =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification);
      });

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;

        if (data?.matchId) {
          router.push(`/chat/${data.matchId}` as any);
        }
      });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);
};
