import { Stack } from 'expo-router';

import { BrutlColors } from '@/constants/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: BrutlColors.bg },
        animation: 'fade',
      }}
    />
  );
}
