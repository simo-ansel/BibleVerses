/**
 * Morning notification with the verse of the day.
 * Each notification carries that day's verse, so instead of one repeating reminder
 * we schedule the next 30 days one by one and top the list up every time the app opens.
 */
import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { formatPassage } from './data/books';
import { dailyPosition, dayNumber } from './data/daily';
import { getDailyPassage } from './data/db';
import { getSettings } from './data/store';

const CHANNEL_ID = 'verse-of-the-day';
const DAYS_AHEAD = 30;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Verse of the day',
    description: 'One verse each morning',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** Asks for permission if needed. Returns true when notifications are allowed. */
export async function requestPermission(): Promise<boolean> {
  await ensureChannel(); // Android 13+ shows the prompt only once a channel exists
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

export async function cancelAll() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Replaces all scheduled notifications with the next 30 mornings, if the setting is on. */
export async function rescheduleVerses(db: SQLiteDatabase) {
  const { notify, notifyHour, notifyMinute } = getSettings();
  await cancelAll();
  if (!notify) return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;
  await ensureChannel();

  const now = new Date();
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const when = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, notifyHour, notifyMinute, 0);
    if (when.getTime() <= now.getTime() + 30_000) continue;
    const passage = await getDailyPassage(db, dailyPosition(dayNumber(when)));
    if (!passage) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: formatPassage(passage),
        body: passage.text.length > 230 ? `${passage.text.slice(0, 227).trimEnd()}…` : passage.text,
        data: { day: dayNumber(when) },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: when,
        channelId: CHANNEL_ID,
      },
    });
  }
}
