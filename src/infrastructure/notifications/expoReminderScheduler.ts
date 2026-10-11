/**
 * ReminderScheduler on expo-notifications: one repeating local notification per day.
 * The notification only says the verse is ready; tapping it opens the app.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { ReminderScheduler } from '@/core/ports';

const CHANNEL_ID = 'daily-reminder';
const NOTIFICATION_ID = 'daily-reminder';

let handlerInstalled = false;

function installForegroundHandler() {
  if (handlerInstalled) return;
  handlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  // HIGH importance makes Android show the notification as a heads-up banner.
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily reminder',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

export function createExpoReminderScheduler(): ReminderScheduler {
  installForegroundHandler();
  return {
    async requestPermission() {
      await ensureChannel(); // Android 13+ shows the permission prompt only once a channel exists.
      const current = await Notifications.getPermissionsAsync();
      if (current.granted) return true;
      if (!current.canAskAgain) return false;
      return (await Notifications.requestPermissionsAsync()).granted;
    },

    async hasPermission() {
      return (await Notifications.getPermissionsAsync()).granted;
    },

    async scheduleDaily({ hour, minute }) {
      await ensureChannel();
      await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
      await Notifications.scheduleNotificationAsync({
        identifier: NOTIFICATION_ID,
        content: { title: 'Verse of the day', body: 'Your verse for today is ready.' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL_ID },
      });
    },

    async cancel() {
      await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
    },

    onOpened(listener) {
      // The reminder is the app's only notification, so any tap on one means "open the verse".
      const subscription = Notifications.addNotificationResponseReceivedListener(() => listener());
      return () => subscription.remove();
    },
  };
}
