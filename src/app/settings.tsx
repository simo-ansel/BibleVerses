import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { updateSettings, useSettings, type ReaderFont, type TextSize } from '@/data/store';
import { notificationsAvailable, rescheduleVerses, requestPermission } from '@/notifications';
import { Fonts, Space, useColors } from '@/theme';
import { ScreenHeader, Segmented } from '@/ui/components';

const pad = (n: number) => String(n).padStart(2, '0');

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const [busy, setBusy] = useState(false);

  const setNotify = async (on: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (on) {
        const granted = await requestPermission();
        if (!granted) {
          Alert.alert(
            'Notifications are off for BibleVerses',
            'Allow notifications for BibleVerses in your phone settings, then turn this on again.',
            [
              { text: 'Not now', style: 'cancel' },
              { text: 'Open settings', onPress: () => Linking.openSettings() },
            ],
          );
          return;
        }
      }
      updateSettings({ notify: on });
      await rescheduleVerses(db);
    } finally {
      setBusy(false);
    }
  };

  const pickTime = () => {
    const value = new Date();
    value.setHours(settings.notifyHour, settings.notifyMinute, 0, 0);
    DateTimePickerAndroid.open({
      value,
      mode: 'time',
      is24Hour: true,
      onValueChange: (_event, date) => {
        updateSettings({ notifyHour: date.getHours(), notifyMinute: date.getMinutes() });
        rescheduleVerses(db).catch(() => {});
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.ground }}>
      <ScreenHeader title="Settings" />
      <ScrollView contentContainerStyle={{ padding: Space.l, paddingBottom: insets.bottom + Space.xxl }}>
        <Text style={[styles.group, { color: c.ink }]}>Verse of the day</Text>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.rule }]}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={[styles.label, { color: c.ink }]}>Morning notification</Text>
              <Text style={[styles.help, { color: c.inkSoft }]}>
                {notificationsAvailable
                  ? 'Get the day’s verse on your lock screen.'
                  : 'Works in the installed app. Expo Go can’t show notifications.'}
              </Text>
            </View>
            <Switch
              value={notificationsAvailable && settings.notify}
              onValueChange={setNotify}
              disabled={busy || !notificationsAvailable}
              trackColor={{ true: c.lapis, false: c.rule }}
              thumbColor={c.surface}
              accessibilityLabel="Morning notification"
            />
          </View>
          <View style={[styles.divider, { backgroundColor: c.rule }]} />
          <Pressable
            onPress={pickTime}
            disabled={!settings.notify || !notificationsAvailable}
            style={({ pressed }) => [
              styles.row,
              { opacity: settings.notify && notificationsAvailable ? 1 : 0.45 },
              pressed && { backgroundColor: c.selection },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Time, ${pad(settings.notifyHour)}:${pad(settings.notifyMinute)}`}>
            <Text style={[styles.label, styles.flex, { color: c.ink }]}>Time</Text>
            <Text style={[styles.value, { color: c.lapis }]}>
              {pad(settings.notifyHour)}:{pad(settings.notifyMinute)}
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.group, { color: c.ink }]}>Reading</Text>
        <View style={[styles.card, styles.cardPad, { backgroundColor: c.surface, borderColor: c.rule }]}>
          <Text style={[styles.label, { color: c.ink }]}>Typeface</Text>
          <Text style={[styles.help, { color: c.inkSoft, marginBottom: Space.s }]}>
            Fell is cut from English types of the 1670s, close to how the King James Bible was first printed.
          </Text>
          <Segmented<ReaderFont>
            value={settings.readerFont}
            onChange={(readerFont) => updateSettings({ readerFont })}
            options={[
              { value: 'fell', label: 'Fell', fontFamily: Fonts.fell },
              { value: 'garamond', label: 'Garamond', fontFamily: Fonts.garamond },
            ]}
          />
          <Text style={[styles.label, { color: c.ink, marginTop: Space.l, marginBottom: Space.s }]}>Text size</Text>
          <Segmented<TextSize>
            value={settings.textSize}
            onChange={(textSize) => updateSettings({ textSize })}
            options={[
              { value: 's', label: 'Small' },
              { value: 'm', label: 'Medium' },
              { value: 'l', label: 'Large' },
            ]}
          />
        </View>

        <Pressable
          onPress={() => router.push('/about')}
          style={({ pressed }) => [styles.card, styles.row, styles.link, { backgroundColor: pressed ? c.selection : c.surface, borderColor: c.rule }]}
          accessibilityRole="button">
          <Text style={[styles.label, styles.flex, { color: c.ink }]}>About the texts and this app</Text>
          <Feather name="chevron-right" size={20} color={c.inkSoft} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { fontFamily: Fonts.sansMedium, fontSize: 15, marginTop: Space.l, marginBottom: Space.s },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  cardPad: { padding: Space.m },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.m, paddingHorizontal: Space.m, minHeight: 60, paddingVertical: Space.s },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: Space.m },
  label: { fontFamily: Fonts.sans, fontSize: 16 },
  help: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18, marginTop: 2 },
  value: { fontFamily: Fonts.sansMedium, fontSize: 17 },
  link: { marginTop: Space.xl },
});
