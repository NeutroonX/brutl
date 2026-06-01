import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Slot, router, usePathname } from 'expo-router';
import { type ComponentProps, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrutlColors } from '@/constants/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const TABS: { route: string; icon: IoniconName; iconOutline: IoniconName }[] = [
  { route: '/',        icon: 'home',        iconOutline: 'home-outline' },
  { route: '/workout', icon: 'barbell',     iconOutline: 'barbell-outline' },
  { route: '/diet',    icon: 'restaurant',  iconOutline: 'restaurant-outline' },
  { route: '/quests',  icon: 'shield',      iconOutline: 'shield-outline' },
  { route: '/stats',   icon: 'stats-chart', iconOutline: 'stats-chart-outline' },
];

const NAV_H = 62;
const NAV_MARGIN = 16;

interface TabItemProps {
  route: string;
  icon: IoniconName;
  iconOutline: IoniconName;
  isActive: boolean;
  onPress: () => void;
}

function TabItem({ icon, iconOutline, isActive, onPress }: TabItemProps) {
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Animated.spring(scale, {
      toValue: 0.8,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }

  function pressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 180,
      friction: 6,
    }).start();
    onPress();
  }

  return (
    <Pressable onPressIn={pressIn} onPressOut={pressOut} style={styles.tabItem} hitSlop={10}>
      <Animated.View style={[styles.iconWrap, isActive && styles.iconWrapActive, { transform: [{ scale }] }]}>
        <Ionicons
          name={isActive ? icon : iconOutline}
          size={23}
          color={isActive ? BrutlColors.accent : '#555'}
        />
      </Animated.View>
    </Pressable>
  );
}

export default function AppTabs() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const showNav = !pathname.startsWith('/onboarding');
  const navBottom = Math.max(insets.bottom, NAV_MARGIN);
  const contentPad = showNav ? NAV_H + navBottom + 8 : 0;

  return (
    <View style={styles.root}>
      <View style={[styles.screen, { paddingBottom: contentPad }]}>
        <Slot />
      </View>

      {showNav && (
        <View style={[styles.navContainer, { bottom: navBottom }]}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={80} tint="dark" style={styles.navBlur}>
              <NavItems pathname={pathname} />
            </BlurView>
          ) : (
            <View style={styles.navSolid}>
              <NavItems pathname={pathname} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function NavItems({ pathname }: { pathname: string }) {
  return (
    <>
      {TABS.map((tab) => {
        const isActive = tab.route === '/' ? pathname === '/' : pathname.startsWith(tab.route);
        return (
          <TabItem
            key={tab.route}
            {...tab}
            isActive={isActive}
            onPress={() => router.push(tab.route as any)}
          />
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BrutlColors.bg },
  screen: { flex: 1 },

  navContainer: {
    position: 'absolute',
    left: NAV_MARGIN,
    right: NAV_MARGIN,
    height: NAV_H,
    borderRadius: 32,
    overflow: 'hidden',
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    // Android shadow
    elevation: 20,
  },

  navBlur: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },

  navSolid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,10,10,0.97)',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },

  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },

  iconWrap: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
  },

  iconWrapActive: {
    backgroundColor: 'rgba(226,75,74,0.13)',
  },
});
