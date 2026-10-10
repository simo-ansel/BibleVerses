import Feather from '@expo/vector-icons/Feather';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { withAlpha } from '@/art/palettes';
import { useTodayChrome } from '@/data/store';
import { Fonts, useColors } from '@/theme';
import type { IconName } from './components';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Today', icon: 'sun' },
  read: { label: 'Read', icon: 'book-open' },
  search: { label: 'Search', icon: 'search' },
  saved: { label: 'Saved', icon: 'heart' },
};

export const TAB_BAR_HEIGHT = 58;

/** Space to leave at the bottom of tab screens so content clears the tab bar. */
export function useTabBarSpace() {
  return TAB_BAR_HEIGHT + useSafeAreaInsets().bottom;
}

/**
 * Over the painting (Today) the bar is transparent and takes the painting's ink;
 * elsewhere it sits on the gesso ground with a hairline above.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const c = useColors();
  const chrome = useTodayChrome();
  const insets = useSafeAreaInsets();
  const onToday = state.routes[state.index]?.name === 'index';
  const active = onToday ? chrome.ink : c.lapis;
  const idle = onToday ? withAlpha(chrome.ink, 0.62) : c.inkSoft;

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: insets.bottom, height: TAB_BAR_HEIGHT + insets.bottom },
        onToday
          ? styles.overPainting
          : { backgroundColor: c.ground, borderTopColor: c.rule, borderTopWidth: StyleSheet.hairlineWidth },
      ]}>
      {state.routes.map((route, i) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === i;
        const color = focused ? active : idle;
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
            <Text style={[styles.label, { color, fontFamily: focused ? Fonts.sansMedium : Fonts.sans }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', position: 'absolute', left: 0, right: 0, bottom: 0 },
  overPainting: { backgroundColor: 'transparent' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 6 },
  label: { fontSize: 12 },
});
