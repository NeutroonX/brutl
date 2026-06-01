import { Slot, router, usePathname } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { BrutlColors, BrutlSpacing } from '@/constants/theme';
import { BrutlText } from './ui/BrutlText';

const TABS = [
  { name: 'Home', route: '/' as const },
  { name: 'Workout', route: '/workout' as const },
  { name: 'Diet', route: '/diet' as const },
  { name: 'Quests', route: '/quests' as const },
  { name: 'Stats', route: '/stats' as const },
] as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BrutlColors.bg },
  screen: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: BrutlColors.bg,
    borderTopWidth: 1,
    borderTopColor: BrutlColors.borderVisible,
    paddingBottom: BrutlSpacing.sm,
    paddingTop: BrutlSpacing.sm,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: BrutlSpacing.xs },
  activeIndicator: {
    height: 2,
    width: 24,
    backgroundColor: BrutlColors.accent,
    borderRadius: 9999,
    marginBottom: BrutlSpacing.xs,
  },
});

export default function AppTabs() {
  const pathname = usePathname();
  const showTabBar = !pathname.startsWith('/onboarding');

  return (
    <View style={styles.root}>
      <View style={styles.screen}>
        <Slot />
      </View>
      {showTabBar && (
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const active = tab.route === '/' ? pathname === '/' : pathname.startsWith(tab.route);
            return (
              <TouchableOpacity
                key={tab.route}
                style={styles.tabItem}
                onPress={() => router.push(tab.route)}
                activeOpacity={0.7}
              >
                {active && <View style={styles.activeIndicator} />}
                <BrutlText
                  variant="caption"
                  style={{ color: active ? BrutlColors.accent : BrutlColors.textMuted }}
                >
                  {tab.name}
                </BrutlText>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}
