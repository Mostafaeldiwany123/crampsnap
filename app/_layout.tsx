import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold
} from '@expo-google-fonts/nunito';
import {
  PTSans_400Regular,
  PTSans_700Bold
} from '@expo-google-fonts/pt-sans';
import {
  Assistant_400Regular,
  Assistant_600SemiBold,
  Assistant_700Bold,
  Assistant_800ExtraBold,
} from '@expo-google-fonts/assistant';
import { InstallGate } from '@/components/InstallGate';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function isRunningAsStandalonePWA(): boolean {
  if (Platform.OS !== 'web') return true;
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    ('standalone' in window.navigator && Boolean((window.navigator as any).standalone))
  );
}

export default function RootLayout() {
  const [loadedNative, error] = useFonts(
    Platform.OS === 'web'
      ? {}
      : {
          SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
          Nunito: Nunito_400Regular,
          NunitoSemiBold: Nunito_600SemiBold,
          NunitoBold: Nunito_700Bold,
          PTSans: PTSans_400Regular,
          PTSansBold: PTSans_700Bold,
          Assistant: Assistant_400Regular,
          AssistantSemiBold: Assistant_600SemiBold,
          AssistantBold: Assistant_700Bold,
          AssistantExtraBold: Assistant_800ExtraBold,
        }
  );

  const loaded = Platform.OS === 'web' ? true : loadedNative;

  const [isStandalonePWA, setIsStandalonePWA] = useState<boolean>(() => {
    return isRunningAsStandalonePWA();
  });

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(display-mode: standalone)');
      const checkMode = () => {
        setIsStandalonePWA(isRunningAsStandalonePWA());
      };
      mediaQuery.addEventListener('change', checkMode);
      return () => mediaQuery.removeEventListener('change', checkMode);
    }
  }, []);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  // On Web: If NOT running as an installed standalone PWA, ALWAYS show the Install Gate!
  if (Platform.OS === 'web' && !isStandalonePWA) {
    return <InstallGate />;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, title: 'CramSnap' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'CramSnap' }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="note/preview" options={{ headerShown: false }} />
      <Stack.Screen name="collection/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true }} />
    </Stack>
  );
}
