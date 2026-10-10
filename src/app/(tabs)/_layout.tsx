import { Tabs } from 'expo-router/js-tabs';

import { useColors } from '@/theme';
import { TabBar } from '@/ui/TabBar';

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.ground } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="read" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="saved" />
    </Tabs>
  );
}
