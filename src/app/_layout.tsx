import { BebasNeue_400Regular, useFonts } from '@expo-google-fonts/bebas-neue';
import { DarkTheme, ThemeProvider, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

import AppTabs from '@/components/app-tabs';
import { loadApiKeys } from '@/lib/api-keys';
import { queryClient, queryPersister } from '@/lib/queryClient';
import { useUserStore } from '@/stores/user.store';
import { useRoastStore } from '@/stores/roast.store';
import { useWorkoutStore } from '@/stores/workout.store';
import { useDietStore } from '@/stores/diet.store';
import { useWatchStore } from '@/stores/watch.store';
import { useRoutineStore } from '@/stores/routine.store';
import { useWeightStore } from '@/stores/weight.store';
import { useSyncStore, registerSyncListeners, registerBackgroundSync } from '@/stores/sync.store';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ BebasNeue_400Regular });
  const [ready, setReady] = useState(false);

  const loadUser = useUserStore((s) => s.loadFromStorage);
  const loadRoasts = useRoastStore((s) => s.loadFromStorage);
  const loadWorkouts = useWorkoutStore((s) => s.loadFromStorage);
  const loadDiet = useDietStore((s) => s.loadFromStorage);
  const loadWatch = useWatchStore((s) => s.loadFromStorage);
  const loadRoutines = useRoutineStore((s) => s.loadFromStorage);
  const loadWeights = useWeightStore((s) => s.loadFromStorage);
  const hydrateSyncQueue = useSyncStore((s) => s.hydrate);
  const hasOnboarded = useUserStore((s) => s.hasOnboarded);

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('transparent');
    StatusBar.setTranslucent(true);

    hydrateSyncQueue();

    Promise.all([
      loadApiKeys(),
      loadUser(),
      loadRoasts(),
      loadWorkouts(),
      loadDiet(),
      loadWatch(),
      loadRoutines(),
      loadWeights(),
    ]).finally(() => setReady(true));

    registerSyncListeners();
    registerBackgroundSync().catch(console.error);
  }, []);

  useEffect(() => {
    if (!(fontsLoaded || fontError) || !ready) return;
    if (!hasOnboarded) {
      router.replace('/onboarding/cold-open');
    }
  }, [fontsLoaded, fontError, hasOnboarded, ready]);

  if (!(fontsLoaded || fontError) || !ready) return null;

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: queryPersister }}
    >
      <ThemeProvider value={DarkTheme}>
        <AppTabs />
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
