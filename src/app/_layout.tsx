import { BebasNeue_400Regular, useFonts } from '@expo-google-fonts/bebas-neue';
import { DarkTheme, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'react-native';

import AppTabs from '@/components/app-tabs';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ BebasNeue_400Regular });

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor('#000000');
  }, []);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={DarkTheme}>
      <AppTabs />
    </ThemeProvider>
  );
}
