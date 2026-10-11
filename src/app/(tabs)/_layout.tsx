import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/ui/components/TabBar';
import { useColors } from '@/ui/theme';

export default function TabsLayout() {
  const colors = useColors();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.ground } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="read" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="saved" />
    </Tabs>
  );
}
