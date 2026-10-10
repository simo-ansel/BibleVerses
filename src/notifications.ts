/**
 * Morning notification with the verse of the day.
 * Each notification carries that day's verse, so instead of one repeating reminder
 * we schedule the next 30 days one by one and top the list up every time the app opens.
 *
 * expo-notifications cannot even be imported inside Expo Go on Android (since SDK 53 the
 * import throws), so the module is loaded lazily and only in the installed app.
 * In Expo Go the rest of the app works and the notification setting is shown as unavailable.
 */
import { isRunningInExpoGo } from 'expo';
import type * as NotificationsModule from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { formatPassage } from './data/books';
import { dailyPosition, dayNumber } from './data/daily';
import { getDailyPassage } from './data/db';
import { getSettings } from './data/store';

const CHANNEL_ID = 'verse-of-the-day';
const DAYS_AHEAD = 30;

/** False inside Expo Go on Android, where notifications are not available. */
export const notificationsAvailable = !(Platform.OS === 'android' && isRunningInExpoGo());

let cached: typeof NotificationsModule | null | undefined;

function notifications(): typeof NotificationsModule | null {
  if (cached !== undefined) return cached;
  if (!notificationsAvailable) return (cached = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-notifications') as typeof NotificationsModule;
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    cached = mod;
  } catch {
    cached = null;
  }
  return cached;
}

async function ensureChannel(N: typeof NotificationsModule) {
  if (Platform.OS !== 'android') return;
  await N.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Verse of the day',
    description: 'One verse each morning',
    importance: N.AndroidImportance.DEFAULT,
  });
}

/** Asks for permission if needed. Returns true when notifications are allowed. */
export async function requestPermission(): Promise<boolean> {
  const N = notifications();
  if (!N) return false;
  await ensureChannel(N); // Android 13+ shows the prompt only once a channel exists
  const current = await N.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await N.requestPermissionsAsync();
  return next.granted;
}

/** Replaces all scheduled notifications with the next 30 mornings, if the setting is on. */
export async function rescheduleVerses(db: SQLiteDatabase) {
  const N = notifications();
  if (!N) return;
  const { notify, notifyHour, notifyMinute } = getSettings();
  await N.cancelAllScheduledNotificationsAsync();
  if (!notify) return;
  const perm = await N.getPermissionsAsync();
  if (!perm.granted) return;
  await ensureChannel(N);

  const now = new Date();
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const when = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, notifyHour, notifyMinute, 0);
    if (when.getTime() <= now.getTime() + 30_000) continue;
    const passage = await getDailyPassage(db, dailyPosition(dayNumber(when)));
    if (!passage) continue;
    await N.scheduleNotificationAsync({
      content: {
        title: formatPassage(passage),
        body: passage.text.length > 230 ? `${passage.text.slice(0, 227).trimEnd()}…` : passage.text,
        data: { day: dayNumber(when) },
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DATE,
        date: when,
        channelId: CHANNEL_ID,
      },
    });
  }
}
