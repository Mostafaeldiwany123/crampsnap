
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
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

export default function RootLayout() {
  const [loaded, error] = useFonts({
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
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return <RootLayoutNav />;
}


function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="note/preview" options={{ headerShown: false }} />
      <Stack.Screen name="collection/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true }} />
    </Stack>
  );
}
