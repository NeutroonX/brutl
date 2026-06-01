import { BebasNeue_400Regular, useFonts } from '@expo-google-fonts/bebas-neue';
import { DarkTheme, ThemeProvider, router } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { useUserStore } from '@/stores/user.store';
import { useRoastStore } from '@/stores/roast.store';
import { useWorkoutStore } from '@/stores/workout.store';
import { useDietStore } from '@/stores/diet.store';
import { useQuestStore } from '@/stores/quest.store';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ BebasNeue_400Regular });

  const loadUser = useUserStore((s) => s.loadFromStorage);
  const loadRoasts = useRoastStore((s) => s.loadFromStorage);
  const loadWorkouts = useWorkoutStore((s) => s.loadFromStorage);
  const loadDiet = useDietStore((s) => s.loadFromStorage);
  const loadQuests = useQuestStore((s) => s.loadFromStorage);
  const hasOnboarded = useUserStore((s) => s.hasOnboarded);

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('transparent');
    StatusBar.setTranslucent(true);
    Promise.all([loadUser(), loadRoasts(), loadWorkouts(), loadDiet(), loadQuests()]);
  }, []);

  useEffect(() => {
    if (!fontsLoaded) return;
    if (!hasOnboarded) {
      router.replace('/onboarding/cold-open');
    }
  }, [fontsLoaded, hasOnboarded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={DarkTheme}>
      <AppTabs />
    </ThemeProvider>
  );
}
