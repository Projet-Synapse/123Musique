// Powered by OnSpace.AI
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider } from '@/template';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { MusicProvider } from '@/contexts/MusicContext';
import { UpdateProvider } from '@/contexts/UpdateContext';

export default function RootLayout() {
  return (
    <AlertProvider>
      <SafeAreaProvider>
        <ThemeProvider>
          <UpdateProvider>
            <MusicProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="player" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="edit-track" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="playlist-detail" options={{ headerShown: false }} />
              </Stack>
            </MusicProvider>
          </UpdateProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
