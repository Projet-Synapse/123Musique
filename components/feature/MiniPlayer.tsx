// Powered by OnSpace.AI
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useMusic } from '@/contexts/MusicContext';
import { spacing, radius, fontSize } from '@/constants/theme';

export default function MiniPlayer() {
  const { colors, accent } = useTheme();
  const { currentTrack, isPlaying, pauseTrack, resumeTrack, nextTrack } = useMusic();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (!currentTrack) return null;

  // Mini player sits just above the tab bar
  const tabBarHeight = insets.bottom + 60;

  const s = StyleSheet.create({
    container: {
      position: 'absolute', bottom: tabBarHeight + 8,
      left: spacing.sm, right: spacing.sm,
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.lg,
      borderWidth: 1, borderColor: colors.border,
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
      shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
      elevation: 12,
    },
    artwork: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.surface },
    artworkPlaceholder: {
      width: 44, height: 44, borderRadius: radius.sm,
      backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    },
    info: { flex: 1, marginLeft: spacing.sm },
    name: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
    artist: { fontSize: fontSize.xs, color: colors.textSecondary },
    controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    playBtn: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: accent,
      alignItems: 'center', justifyContent: 'center',
    },
    skipBtn: { padding: spacing.xs },
    progressBar: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: 2, backgroundColor: colors.border, borderBottomLeftRadius: radius.lg,
      borderBottomRightRadius: radius.lg, overflow: 'hidden',
    },
  });

  return (
    <Pressable
      style={s.container}
      onPress={() => router.push('/player')}
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir le lecteur — ${currentTrack.name}`}
    >
      {currentTrack.artworkUri ? (
        <Image source={{ uri: currentTrack.artworkUri }} style={s.artwork} contentFit="cover" />
      ) : (
        <View style={s.artworkPlaceholder}>
          <MaterialIcons name="music-note" size={22} color={accent} />
        </View>
      )}
      <View style={s.info}>
        <Text style={s.name} numberOfLines={1}>{currentTrack.name}</Text>
        <Text style={s.artist} numberOfLines={1}>{currentTrack.artist}</Text>
      </View>
      <View style={s.controls}>
        <TouchableOpacity
          style={s.playBtn}
          onPress={e => { e.stopPropagation(); if (isPlaying) pauseTrack(); else resumeTrack(); }}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Mettre en pause' : 'Lire'}
        >
          <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={22} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.skipBtn}
          onPress={e => { e.stopPropagation(); nextTrack(); }}
          accessibilityRole="button"
          accessibilityLabel="Piste suivante"
        >
          <MaterialIcons name="skip-next" size={26} color={colors.text} />
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}
