import Feather from '@expo/vector-icons/Feather';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { paintingForDate } from '@/application/DailyVerseService';
import { withAlpha } from '@/core/art/palettes';
import { useToday } from '@/ui/hooks/useToday';
import { Fonts, useColors } from '@/ui/theme';

import type { IconName } from './controls';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Today', icon: 'sun' },
  read: { label: 'Read', icon: 'book-open' },
  search: { label: 'Search', icon: 'search' },
  saved: { label: 'Saved', icon: 'heart' },
};

const TAB_BAR_HEIGHT = 58;

/** Space to leave at the bottom of tab screens so content clears the tab bar. */
export function useTabBarSpace(): number {
  return TAB_BAR_HEIGHT + useSafeAreaInsets().bottom;
}

/**
 * Over today's painting the bar is transparent and takes the painting's ink colour;
 * on the other tabs it sits on the ground colour with a hairline above.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const paintingInk = useMemo(() => paintingForDate(today).palette.ink, [today]);
  const onToday = state.routes[state.index]?.name === 'index';
  const activeColor = onToday ? paintingInk : colors.lapis;
  const idleColor = onToday ? withAlpha(paintingInk, 0.62) : colors.inkSoft;

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: insets.bottom, height: TAB_BAR_HEIGHT + insets.bottom },
        onToday
          ? null
          : { backgroundColor: colors.ground, borderTopColor: colors.rule, borderTopWidth: StyleSheet.hairlineWidth },
      ]}>
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === index;
        const color = focused ? activeColor : idleColor;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
            }}
            style={styles.tab}>
            <Feather name={tab.icon} size={21} color={color} />
            <Text style={[styles.label, { color, fontFamily: focused ? Fonts.uiMedium : Fonts.ui }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', position: 'absolute', left: 0, right: 0, bottom: 0 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 6 },
  label: { fontSize: 12 },
});
