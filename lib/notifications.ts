import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const requestNotificationPermission = async (): Promise<boolean> => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
};

export const scheduleLunchReminder = async (
  matchId: string,
  userName: string,
  meetingTime: Date
) => {
  const reminderTime = new Date(meetingTime.getTime() - 15 * 60 * 1000);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Lunch przypomnienie',
      body: `Lunch z ${userName} za 15 minut!`,
      data: { matchId },
    },
    trigger: {
      type: 'date',
      date: reminderTime,
    } as Notifications.DateTriggerInput,
  });
};

export const sendLocalNotification = async (
  title: string,
  body: string,
  data?: any
) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
    },
    trigger: null,
  });
};
