import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// BRUTL brand tokens — hardcoded, no light/dark switching
export const BrutlColors = {
  bg: '#000000',
  bgCard: '#111111',
  bgCardSubtle: '#0D0D0D',
  border: '#1A1A1A',
  borderVisible: '#2A2A2A',
  accent: '#E24B4A',
  accentDim: '#991F1F',
  textPrimary: '#F0F0F0',
  textMuted: '#999999',
  textDisabled: '#444444',
  success: '#4AE24B',
  warning: '#E2A54A',
} as const;

export const BrutlFonts = {
  display: 'BebasNeue_400Regular',
  body: Platform.select({ ios: 'system-ui', android: 'sans-serif', default: 'normal' }),
  mono: Platform.select({ ios: 'ui-monospace', android: 'monospace', default: 'monospace' }),
} as const;

export const BrutlSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const BrutlRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20,
  full: 9999,
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
