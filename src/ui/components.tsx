import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSettings } from '@/data/store';
import { Fonts, Space, useColors } from '@/theme';

export type IconName = ComponentProps<typeof Feather>['name'];

/** Reading typeface and size chosen in Settings. */
export function useReaderType() {
  const { readerFont, textSize } = useSettings();
  const size = textSize === 's' ? 17 : textSize === 'l' ? 22 : 19;
  return {
    fontFamily: readerFont === 'fell' ? Fonts.fell : Fonts.garamond,
    italicFamily: readerFont === 'fell' ? Fonts.fellItalic : Fonts.garamondItalic,
    fontSize: size,
    lineHeight: Math.round(size * (readerFont === 'fell' ? 1.5 : 1.55)),
  };
}

export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + Space.s, borderBottomColor: c.rule, backgroundColor: c.ground }]}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={styles.back}>
        <Feather name="chevron-left" size={26} color={c.ink} />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={[styles.headerTitle, { color: c.ink }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={[styles.headerSub, { color: c.inkSoft }]}>{subtitle}</Text> : null}
      </View>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  color,
  size = 22,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color: string;
  size?: number;
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
      <Feather name={icon} size={size} color={color} />
    </Pressable>
  );
}

/** A quiet text button with a leading icon, used under verses. */
export function ActionButton({
  icon,
  label,
  onPress,
  color,
  active,
  activeColor,
  disabled,
  style,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color: string;
  active?: boolean;
  activeColor?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const tint = active && activeColor ? activeColor : color;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      style={({ pressed }) => [styles.action, { opacity: disabled ? 0.4 : pressed ? 0.55 : 1 }, style]}>
      <Feather name={icon} size={18} color={tint} />
      <Text style={[styles.actionLabel, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  labelStyle,
}: {
  options: { value: T; label: string; fontFamily?: string }[];
  value: T;
  onChange: (v: T) => void;
  labelStyle?: StyleProp<TextStyle>;
}) {
  const c = useColors();
  return (
    <View style={[styles.segmented, { borderColor: c.rule }]} accessibilityRole="radiogroup">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            style={[styles.segment, selected && { backgroundColor: c.selection }]}>
            <Text
              style={[
                styles.segmentLabel,
                { color: selected ? c.lapis : c.inkSoft },
                o.fontFamily ? { fontFamily: o.fontFamily, fontSize: 18 } : null,
                labelStyle,
              ]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, paddingHorizontal: Space.xs },
  headerTitle: { fontFamily: Fonts.fell, fontSize: 24 },
  headerSub: { fontFamily: Fonts.sans, fontSize: 13, marginTop: 1 },
  headerRight: { minWidth: 44, alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'flex-end' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44, paddingRight: Space.l },
  actionLabel: { fontFamily: Fonts.sans, fontSize: 15 },
  segmented: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    overflow: 'hidden',
  },
  segment: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Space.s },
  segmentLabel: { fontFamily: Fonts.sans, fontSize: 15 },
});
