import { StyleSheet, View } from 'react-native';

import { BrutlColors, BrutlFonts, BrutlRadius } from '@/constants/theme';
import type { Rank } from '@/types';
import { BrutlText } from './BrutlText';

export const RANK_COLORS: Record<Rank, string> = {
  E: '#888888',
  D: '#4A7BE2',
  C: '#4AE24B',
  B: '#E2C44A',
  A: '#E24B4A',
  S: '#C44AE2',
};

interface RankBadgeProps {
  rank: Rank;
  size?: 'sm' | 'md' | 'lg' | 'hero';
}

const DIMS    = { sm: 32,  md: 48,  lg: 80,  hero: 96 };
const FONTS   = { sm: 16,  md: 24,  lg: 44,  hero: 72 };
const RADIUS  = { sm: 4,   md: 6,   lg: 10,  hero: 16 };
const BORDERS = { sm: 1.5, md: 2,   lg: 2.5, hero: 0 };

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrutlColors.bgCard,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: BrutlFonts.display,
    letterSpacing: 2,
    fontWeight: '900',
  },
});

export function RankBadge({ rank, size = 'md' }: RankBadgeProps) {
  const dim = DIMS[size];
  const color = RANK_COLORS[rank];

  if (size === 'hero') {
    return (
      <View style={{
        width: dim, height: dim,
        borderRadius: RADIUS[size],
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: `${color}18`,
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 12,
      }}>
        {/* Inner glow border */}
        <View style={{
          position: 'absolute', inset: 0,
          borderRadius: RADIUS[size],
          borderWidth: 1.5,
          borderColor: `${color}50`,
        }} />
        <BrutlText style={[styles.label, { color, fontSize: FONTS[size], lineHeight: FONTS[size] + 4 }]}>
          {rank}
        </BrutlText>
      </View>
    );
  }

  return (
    <View style={[
      styles.badge,
      {
        width: dim, height: dim,
        borderRadius: RADIUS[size],
        borderWidth: BORDERS[size],
        borderColor: color,
      },
    ]}>
      <BrutlText style={[styles.label, { color, fontSize: FONTS[size] }]}>
        {rank}
      </BrutlText>
    </View>
  );
}
