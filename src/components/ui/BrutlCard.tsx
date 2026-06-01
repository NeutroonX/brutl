import { StyleSheet, View, type ViewProps } from 'react-native';

import { BrutlColors, BrutlRadius, BrutlSpacing } from '@/constants/theme';

interface BrutlCardProps extends ViewProps {
  subtle?: boolean;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrutlColors.bgCard,
    borderRadius: BrutlRadius.md,
    borderWidth: 1,
    borderColor: BrutlColors.border,
    padding: BrutlSpacing.md,
  },
  subtle: {
    backgroundColor: BrutlColors.bgCardSubtle,
  },
});

export function BrutlCard({ subtle, style, children, ...props }: BrutlCardProps) {
  return (
    <View style={[styles.card, subtle && styles.subtle, style]} {...props}>
      {children}
    </View>
  );
}
