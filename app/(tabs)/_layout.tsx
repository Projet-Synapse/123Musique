// Powered by OnSpace.AI
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useMusic } from '@/contexts/MusicContext';
import MiniPlayer from '@/components/feature/MiniPlayer';
import { UpdateBanner } from '@/components';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors, accent } = useTheme();
  const { currentTrack } = useMusic();

  const tabBarHeight = Platform.select({
    ios: insets.bottom + 60,
    android: insets.bottom + 60,
    default: 70,
  });
  // Above the tab bar, and above the mini player when one is showing.
  const bannerBottom = tabBarHeight + 8 + (currentTrack ? 62 : 0);

  const tabBarStyle = {
    height: tabBarHeight,
    paddingTop: 8,
    paddingBottom: Platform.select({
      ios: insets.bottom + 8,
      android: insets.bottom + 8,
      default: 8,
    }),
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle,
          tabBarActiveTintColor: accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Bibliothèque',
            tabBarIcon: ({ color, size }) => <MaterialIcons name="library-music" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="playlists"
          options={{
            title: 'Playlists',
            tabBarIcon: ({ color, size }) => <MaterialIcons name="queue-music" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Réglages',
            tabBarIcon: ({ color, size }) => <MaterialIcons name="settings" size={size} color={color} />,
          }}
        />
      </Tabs>
      {/* Floats above the tab bar / mini player so it is visible from any tab. */}
      <View
        style={{ position: 'absolute', left: 0, right: 0, bottom: bannerBottom }}
        pointerEvents="box-none"
      >
        <UpdateBanner />
      </View>
      <MiniPlayer />
    </View>
  );
}
