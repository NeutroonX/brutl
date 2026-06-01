import { StyleSheet, View } from 'react-native';

import { BrutlColors, BrutlFonts, BrutlRadius } from '@/constants/theme';
import type { Rank } from '@/types';
import { BrutlText } from './BrutlText';

const RANK_COLORS: Record<Rank, string> = {
  E: '#666666',
  D: '#4A7BE2',
  C: '#4AE24B',
  B: '#E2C44A',
  A: '#E24B4A',
  S: '#C44AE2',
};

interface RankBadgeProps {
  rank: Rank;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE = { sm: 32, md: 48, lg: 80 };
const FONT_SIZE = { sm: 16, md: 24, lg: 48 };

const styles = StyleSheet.create({
  badge: {
    borderRadius: BrutlRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrutlColors.bgCard,
  },
  label: {
    fontFamily: BrutlFonts.display,
    letterSpacing: 2,
    fontWeight: '900',
  },
});

export function RankBadge({ rank, size = 'md' }: RankBadgeProps) {
  const dim = SIZE[size];
  const color = RANK_COLORS[rank];
  return (
    <View
      style={[
        styles.badge,
        { width: dim, height: dim, borderColor: color },
      ]}
    >
      <BrutlText
        style={[styles.label, { color, fontSize: FONT_SIZE[size] }]}
      >
        {rank}
      </BrutlText>
    </View>
  );
}

export { RANK_COLORS };
