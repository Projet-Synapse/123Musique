// Powered by OnSpace.AI
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useMusic } from '@/contexts/MusicContext';
import { ACCENT_OPTIONS, spacing, radius, fontSize } from '@/constants/theme';

export default function SettingsScreen() {
  const { colors, accent, mode, toggleMode, setAccent } = useTheme();
  const { tracks, playlists } = useMusic();
  const insets = useSafeAreaInsets();

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.md,
      paddingBottom: spacing.md, backgroundColor: colors.surface,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
    content: { padding: spacing.md, paddingBottom: 180 },
    section: { marginBottom: spacing.xl },
    sectionTitle: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textMuted, letterSpacing: 1.2, marginBottom: spacing.sm, textTransform: 'uppercase' },
    card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    row: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md,
      paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    rowLast: { borderBottomWidth: 0 },
    rowIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
    rowLabel: { flex: 1, fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
    rowValue: { fontSize: fontSize.sm, color: colors.textSecondary },
    accentRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', padding: spacing.md },
    stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
    statValue: { fontSize: fontSize.xxxl, fontWeight: '700', color: accent },
    statLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
    divider: { width: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
    statsRow: { flexDirection: 'row' },
  });

  // Kept outside StyleSheet.create: a function value mixed into that call collapses
  // TypeScript's inference for every other style key in the same object.
  const accentDotStyle = (color: string, active: boolean): ViewStyle => ({
    width: 36, height: 36, borderRadius: 18, backgroundColor: color,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: active ? 2 : 0, borderColor: '#FFF',
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Réglages</Text>
      </View>
      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Ma bibliothèque</Text>
          <View style={[s.card]}>
            <View style={s.statsRow}>
              <View style={s.stat}>
                <Text style={s.statValue}>{tracks.length}</Text>
                <Text style={s.statLabel}>Titres</Text>
              </View>
              <View style={s.divider} />
              <View style={s.stat}>
                <Text style={s.statValue}>{playlists.length}</Text>
                <Text style={s.statLabel}>Playlists</Text>
              </View>
              <View style={s.divider} />
              <View style={s.stat}>
                <Text style={s.statValue}>{[...new Set(tracks.map(t => t.artist))].filter(a => a !== 'Artiste inconnu').length}</Text>
                <Text style={s.statLabel}>Artistes</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Appearance */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Apparence</Text>
          <View style={s.card}>
            <View style={s.row}>
              <View style={[s.rowIcon, { backgroundColor: mode === 'dark' ? '#333' : '#E5E5F0' }]}>
                <MaterialIcons name={mode === 'dark' ? 'dark-mode' : 'light-mode'} size={20} color={accent} />
              </View>
              <Text style={s.rowLabel}>Thème sombre</Text>
              <Switch
                value={mode === 'dark'}
                onValueChange={toggleMode}
                trackColor={{ false: colors.border, true: accent }}
                thumbColor="#FFF"
              />
            </View>
            <View style={[s.row, s.rowLast, { flexDirection: 'column', alignItems: 'flex-start' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                <View style={[s.rowIcon, { backgroundColor: accent + '22' }]}>
                  <MaterialIcons name="palette" size={20} color={accent} />
                </View>
                <Text style={s.rowLabel}>Couleur d&apos;accent</Text>
              </View>
              <View style={s.accentRow}>
                {ACCENT_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={accentDotStyle(opt.value, accent === opt.value)}
                    onPress={() => setAccent(opt.value)}
                  >
                    {accent === opt.value && <MaterialIcons name="check" size={18} color="#FFF" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* About */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>À propos</Text>
          <View style={s.card}>
            <View style={[s.row, s.rowLast]}>
              <View style={[s.rowIcon, { backgroundColor: accent + '22' }]}>
                <MaterialIcons name="music-note" size={20} color={accent} />
              </View>
              <Text style={s.rowLabel}>MusicBox</Text>
              <Text style={s.rowValue}>v1.0.0</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
