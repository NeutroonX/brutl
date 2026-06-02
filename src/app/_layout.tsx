import { BebasNeue_400Regular, useFonts } from '@expo-google-fonts/bebas-neue';
import { DarkTheme, ThemeProvider, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { useUserStore } from '@/stores/user.store';
import { useRoastStore } from '@/stores/roast.store';
import { useWorkoutStore } from '@/stores/workout.store';
import { useDietStore } from '@/stores/diet.store';
import { useQuestStore } from '@/stores/quest.store';
import { useWatchStore } from '@/stores/watch.store';
import { useDungeonStore } from '@/stores/dungeon.store';
import { useRoutineStore } from '@/stores/routine.store';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ BebasNeue_400Regular });
  const [ready, setReady] = useState(false);

  const loadUser = useUserStore((s) => s.loadFromStorage);
  const loadRoasts = useRoastStore((s) => s.loadFromStorage);
  const loadWorkouts = useWorkoutStore((s) => s.loadFromStorage);
  const loadDiet = useDietStore((s) => s.loadFromStorage);
  const loadQuests = useQuestStore((s) => s.loadFromStorage);
  const loadWatch = useWatchStore((s) => s.loadFromStorage);
  const loadDungeon = useDungeonStore((s) => s.loadFromStorage);
  const checkDungeonExpiry = useDungeonStore((s) => s.checkForExpiry);
  const loadRoutines = useRoutineStore((s) => s.loadFromStorage);
  const hasOnboarded = useUserStore((s) => s.hasOnboarded);

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('transparent');
    StatusBar.setTranslucent(true);
    Promise.all([loadUser(), loadRoasts(), loadWorkouts(), loadDiet(), loadQuests(), loadWatch(), loadDungeon(), loadRoutines()])
      .then(() => checkDungeonExpiry())
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!(fontsLoaded || fontError) || !ready) return;
    if (!hasOnboarded) {
      router.replace('/onboarding/cold-open');
    }
  }, [fontsLoaded, fontError, hasOnboarded, ready]);

  // Render once fonts are resolved (loaded or errored) AND stores are ready
  if (!(fontsLoaded || fontError) || !ready) return null;

  return (
    <ThemeProvider value={DarkTheme}>
      <AppTabs />
    </ThemeProvider>
  );
}
