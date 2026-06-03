import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Slot, router, usePathname } from 'expo-router';
import { type ComponentProps, useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrutlColors } from '@/constants/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const TABS: { route: string; icon: IoniconName; iconOutline: IoniconName }[] = [
  { route: '/',        icon: 'home',       iconOutline: 'home-outline' },
  { route: '/workout', icon: 'barbell',    iconOutline: 'barbell-outline' },
  { route: '/diet',    icon: 'nutrition',  iconOutline: 'nutrition-outline' },
  { route: '/stats',   icon: 'bar-chart',  iconOutline: 'bar-chart-outline' },
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
  const progress = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: isActive ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isActive]);

  const filledOpacity = progress;
  const outlineOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const pillOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const pillScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <Pressable onPress={onPress} style={styles.tabItem} hitSlop={12}>
      <View style={styles.iconWrap}>
        <Animated.View
          style={[styles.pill, { opacity: pillOpacity, transform: [{ scale: pillScale }] }]}
        />
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, { opacity: outlineOpacity }]}>
          <Ionicons name={iconOutline} size={22} color="#4a4a4a" />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, { opacity: filledOpacity }]}>
          <Ionicons name={icon} size={22} color={BrutlColors.accent} />
        </Animated.View>
      </View>
    </Pressable>
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

export default function AppTabs() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const showNav = !pathname.startsWith('/onboarding');
  const navBottom = Math.max(insets.bottom, NAV_MARGIN);
  const contentPad = showNav ? NAV_H + navBottom + 8 : 0;

  return (
    <View style={styles.root}>
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: contentPad }]}>
        <Slot />
      </View>

      {showNav && (
        <View style={[styles.navContainer, { bottom: navBottom }]}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={75} tint="dark" style={styles.navInner}>
              <NavItems pathname={pathname} />
            </BlurView>
          ) : (
            <View style={[styles.navInner, styles.navSolid]}>
              <NavItems pathname={pathname} />
            </View>
          )}
        </View>
      )}
    </View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 18,
  },

  navInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },

  navSolid: {
    backgroundColor: 'rgba(10,10,10,0.97)',
  },

  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },

  iconWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pill: {
    position: 'absolute',
    width: 48,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(226,75,74,0.12)',
  },

  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
