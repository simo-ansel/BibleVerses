import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goBack } from '@/ui/navigation';
import { Fonts, Space, useColors } from '@/ui/theme';

export type IconName = ComponentProps<typeof Feather>['name'];

export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + Space.s, borderBottomColor: colors.rule }]}>
      <Pressable
        onPress={goBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={styles.iconButton}>
        <Feather name="chevron-left" size={26} color={colors.ink} />
      </Pressable>
      <Text style={[styles.headerTitle, { color: colors.ink }]} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  color,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconButton, { opacity: disabled ? 0.35 : pressed ? 0.55 : 1 }]}>
      <Feather name={icon} size={22} color={color} />
    </Pressable>
  );
}

/** A quiet text button with a leading icon, used under verses. */
export function ActionButton({
  icon,
  label,
  onPress,
  color,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      style={({ pressed }) => [styles.action, { opacity: disabled ? 0.4 : pressed ? 0.55 : 1 }]}>
      <Feather name={icon} size={18} color={color} />
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space.s,
    paddingBottom: Space.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { flex: 1, fontFamily: Fonts.display, fontSize: 24, paddingHorizontal: Space.xs },
  headerRight: { minWidth: 44, flexDirection: 'row', justifyContent: 'flex-end' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44, paddingRight: Space.l },
  actionLabel: { fontFamily: Fonts.ui, fontSize: 15 },
});
