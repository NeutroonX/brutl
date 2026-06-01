import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
} from 'react-native';

import { BrutlColors, BrutlFonts, BrutlRadius, BrutlSpacing } from '@/constants/theme';

type Variant = 'primary' | 'ghost' | 'outline';

interface BrutlButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: Variant;
  loading?: boolean;
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: BrutlSpacing.md,
    paddingHorizontal: BrutlSpacing.xl,
    borderRadius: BrutlRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: BrutlColors.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: BrutlColors.borderVisible,
  },
  label: {
    fontFamily: BrutlFonts.display,
    fontSize: 18,
    letterSpacing: 1.5,
  },
  labelPrimary: { color: BrutlColors.textPrimary },
  labelGhost: { color: BrutlColors.accent },
  labelOutline: { color: BrutlColors.textMuted },
});

export function BrutlButton({ label, variant = 'primary', loading, style, ...props }: BrutlButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], style]}
      activeOpacity={0.75}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : BrutlColors.accent} />
      ) : (
        <Text style={[styles.label, styles[`label${capitalize(variant) as 'Primary' | 'Ghost' | 'Outline'}`]]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
