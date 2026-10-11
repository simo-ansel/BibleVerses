import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { formatTime } from '@/core/settings';
import { ScreenHeader } from '@/ui/components/controls';
import { useStatusBar } from '@/ui/hooks/useStatusBar';
import { useObservable, useServices } from '@/ui/services';
import { Fonts, Space, useColors } from '@/ui/theme';

export function SettingsScreen() {
  const { settings } = useServices();
  const { reminderEnabled, reminderTime } = useObservable(settings);
  const colors = useColors();
  const [busy, setBusy] = useState(false);

  useStatusBar();

  const toggleReminder = async (on: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (!on) {
        await settings.disableReminder();
      } else if ((await settings.enableReminder()) === 'permission-denied') {
        Alert.alert('Notifications are off', 'Allow notifications for BibleVerses in your phone settings.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open settings', onPress: () => void Linking.openSettings() },
        ]);
      }
    } finally {
      setBusy(false);
    }
  };

  const pickTime = () => {
    const value = new Date();
    value.setHours(reminderTime.hour, reminderTime.minute, 0, 0);
    DateTimePickerAndroid.open({
      value,
      mode: 'time',
      is24Hour: true,
      onValueChange: (_event, date) => {
        void settings.setReminderTime({ hour: date.getHours(), minute: date.getMinutes() });
      },
    });
  };

  return (
    <View style={[styles.fill, { backgroundColor: colors.ground }]}>
      <ScreenHeader title="Settings" />
      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.rule }]}>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.ink }]}>Daily reminder</Text>
            <Switch
              value={reminderEnabled}
              onValueChange={toggleReminder}
              disabled={busy}
              trackColor={{ true: colors.lapis, false: colors.rule }}
              thumbColor={colors.surface}
              accessibilityLabel="Daily reminder"
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.rule }]} />
          <Pressable
            onPress={pickTime}
            disabled={!reminderEnabled}
            accessibilityRole="button"
            accessibilityLabel={`Reminder time, ${formatTime(reminderTime)}`}
            style={({ pressed }) => [
              styles.row,
              { opacity: reminderEnabled ? 1 : 0.45 },
              pressed && { backgroundColor: colors.selection },
            ]}>
            <Text style={[styles.label, { color: colors.ink }]}>Time</Text>
            <Text style={[styles.value, { color: colors.lapis }]}>{formatTime(reminderTime)}</Text>
          </Pressable>
        </View>
        <Text style={[styles.version, { color: colors.inkSoft }]}>Version {Constants.expoConfig?.version}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Space.l },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space.m,
    minHeight: 60,
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: Space.m },
  label: { fontFamily: Fonts.ui, fontSize: 16 },
  value: { fontFamily: Fonts.uiMedium, fontSize: 17 },
  version: { fontFamily: Fonts.ui, fontSize: 13, textAlign: 'center', marginTop: Space.xl },
});
