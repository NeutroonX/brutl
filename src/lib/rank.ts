import type { Rank } from '@/types';

export const RANK_TITLES: Record<Rank, string> = {
  E: 'Couch Corpse',
  D: 'Warm Body',
  C: 'Iron Recruit',
  B: 'Steel Hunter',
  A: 'Shadow Athlete',
  S: 'Iron Animal',
};

export const RANK_XP_THRESHOLDS: Record<Rank, number> = {
  E: 0,
  D: 500,
  C: 2000,
  B: 6000,
  A: 15000,
  S: 40000,
};

const RANK_ORDER: Rank[] = ['E', 'D', 'C', 'B', 'A', 'S'];

export function getRankFromXP(xp: number): Rank {
  let current: Rank = 'E';
  for (const rank of RANK_ORDER) {
    if (xp >= RANK_XP_THRESHOLDS[rank]) current = rank;
  }
  return current;
}

export function getXPForNextRank(currentRank: Rank): number {
  const idx = RANK_ORDER.indexOf(currentRank);
  if (idx === RANK_ORDER.length - 1) return RANK_XP_THRESHOLDS['S'];
  return RANK_XP_THRESHOLDS[RANK_ORDER[idx + 1]];
}

export function getXPInCurrentRank(xp: number, rank: Rank): number {
  return xp - RANK_XP_THRESHOLDS[rank];
}

export function getXPRangeForRank(rank: Rank): number {
  const idx = RANK_ORDER.indexOf(rank);
  if (idx === RANK_ORDER.length - 1) return RANK_XP_THRESHOLDS['S'];
  return RANK_XP_THRESHOLDS[RANK_ORDER[idx + 1]] - RANK_XP_THRESHOLDS[rank];
}
