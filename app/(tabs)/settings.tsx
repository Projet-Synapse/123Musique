// Powered by OnSpace.AI
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ViewStyle, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useMusic } from '@/contexts/MusicContext';
import { useUpdates } from '@/hooks/useUpdates';
import { RELEASES_URL } from '@/constants/config';
import { ACCENT_OPTIONS, spacing, radius, fontSize } from '@/constants/theme';

// Le thème n'expose pas de couleur d'erreur ; on reprend le rouge des accents.
const ERROR_COLOR = '#EF4444';

export default function SettingsScreen() {
  const { colors, accent, mode, toggleMode, setAccent } = useTheme();
  const { tracks, playlists } = useMusic();
  const updates = useUpdates();
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
    rowDescription: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
    releaseNotes: {
      paddingHorizontal: spacing.md, paddingBottom: spacing.md,
      fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18,
    },
    updateError: {
      paddingHorizontal: spacing.md, paddingBottom: spacing.md,
      fontSize: fontSize.sm, color: ERROR_COLOR,
    },
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
                accessibilityLabel="Thème sombre"
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
                    accessibilityRole="radio"
                    accessibilityLabel={`Accent ${opt.label}`}
                    accessibilityState={{ selected: accent === opt.value }}
                  >
                    {accent === opt.value && <MaterialIcons name="check" size={18} color="#FFF" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Updates */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Mises à jour</Text>
          <View style={s.card}>
            <View style={s.row}>
              <View style={[s.rowIcon, { backgroundColor: accent + '22' }]}>
                <MaterialIcons name="system-update" size={20} color={accent} />
              </View>
              <Text style={s.rowLabel}>Version installée</Text>
              <Text style={s.rowValue}>v{updates.currentVersion}</Text>
            </View>
            <View style={s.row}>
              <View style={[s.rowIcon, { backgroundColor: accent + '22' }]}>
                <MaterialIcons name="info-outline" size={20} color={accent} />
              </View>
              <Text style={s.rowLabel}>Statut</Text>
              <Text style={s.rowValue}>{updateStatusLabel(updates)}</Text>
            </View>
            {updates.releaseNotes && updates.stage === 'available' ? (
              <Text style={s.releaseNotes} numberOfLines={6}>
                {updates.releaseNotes}
              </Text>
            ) : null}
            {updates.error ? <Text style={s.updateError}>{updates.error}</Text> : null}
            <TouchableOpacity
              style={s.row}
              onPress={() => void updates.check()}
              disabled={updates.stage === 'checking'}
              accessibilityRole="button"
              accessibilityLabel="Rechercher une mise à jour"
            >
              <View style={[s.rowIcon, { backgroundColor: accent + '22' }]}>
                <MaterialIcons name="search" size={20} color={accent} />
              </View>
              <Text style={s.rowLabel}>
                {updates.stage === 'checking' ? 'Vérification…' : 'Rechercher une mise à jour'}
              </Text>
              <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
            </TouchableOpacity>
            {(updates.stage === 'available' || updates.stage === 'ready') && updates.canSelfInstall ? (
              <TouchableOpacity
                style={s.row}
                onPress={() => void updates.applyUpdate()}
                accessibilityRole="button"
                accessibilityLabel="Installer la mise à jour"
              >
                <View style={[s.rowIcon, { backgroundColor: accent }]}>
                  <MaterialIcons name="restart-alt" size={20} color="#FFF" />
                </View>
                <Text style={s.rowLabel}>
                  {updates.stage === 'ready' ? 'Redémarrer et installer' : 'Installer et redémarrer'}
                </Text>
                <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            ) : updates.stage === 'available' && !updates.canSelfInstall ? (
              <TouchableOpacity
                style={s.row}
                onPress={() => void Linking.openURL(updates.downloadUrl ?? RELEASES_URL)}
                accessibilityRole="button"
                accessibilityLabel="Ouvrir la page de téléchargement"
              >
                <View style={[s.rowIcon, { backgroundColor: accent + '22' }]}>
                  <MaterialIcons name="open-in-new" size={20} color={accent} />
                </View>
                <Text style={s.rowLabel}>Page de téléchargement</Text>
                <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
            <View style={[s.row, s.rowLast]}>
              <View style={[s.rowIcon, { backgroundColor: accent + '22' }]}>
                <MaterialIcons name="autorenew" size={20} color={accent} />
              </View>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <Text style={s.rowLabel}>Mise à jour automatique</Text>
                <Text style={s.rowDescription}>
                  Télécharge les nouvelles versions en arrière-plan et les installe à la fermeture de
                  l&apos;application.
                </Text>
              </View>
              <Switch
                value={updates.autoUpdate}
                onValueChange={updates.setAutoUpdate}
                trackColor={{ false: colors.border, true: accent }}
                thumbColor="#FFF"
                accessibilityLabel="Mise à jour automatique"
              />
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
              <Text style={s.rowValue}>v{updates.currentVersion}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function updateStatusLabel(update: ReturnType<typeof useUpdates>): string {
  switch (update.stage) {
    case 'checking':
      return 'Vérification…';
    case 'available':
      return update.latestVersion ? `${update.latestVersion} disponible` : 'Mise à jour disponible';
    case 'downloading':
      return typeof update.progress === 'number' ? `Téléchargement ${update.progress}%` : 'Téléchargement…';
    case 'ready':
      return 'Prête à installer';
    case 'error':
      return 'Échec de la vérification';
    case 'up-to-date':
      return 'À jour';
    default:
      return '—';
  }
}
