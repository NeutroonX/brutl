import { StyleSheet, Text, type TextProps } from 'react-native';

import { BrutlColors, BrutlFonts } from '@/constants/theme';

type Variant = 'display' | 'heading' | 'body' | 'caption' | 'muted' | 'accent';

interface BrutlTextProps extends TextProps {
  variant?: Variant;
}

const styles = StyleSheet.create({
  display: {
    fontFamily: BrutlFonts.display,
    fontSize: 48,
    color: BrutlColors.textPrimary,
    letterSpacing: 2,
  },
  heading: {
    fontFamily: BrutlFonts.display,
    fontSize: 28,
    color: BrutlColors.textPrimary,
    letterSpacing: 1,
  },
  body: {
    fontFamily: BrutlFonts.body,
    fontSize: 15,
    color: BrutlColors.textPrimary,
    lineHeight: 22,
  },
  caption: {
    fontFamily: BrutlFonts.body,
    fontSize: 12,
    color: BrutlColors.textMuted,
    lineHeight: 16,
  },
  muted: {
    fontFamily: BrutlFonts.body,
    fontSize: 14,
    color: BrutlColors.textMuted,
    lineHeight: 20,
  },
  accent: {
    fontFamily: BrutlFonts.body,
    fontSize: 14,
    color: BrutlColors.accent,
    fontWeight: '700',
  },
});

export function BrutlText({ variant = 'body', style, ...props }: BrutlTextProps) {
  return <Text style={[styles[variant], style]} {...props} />;
}
