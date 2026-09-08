// Powered by OnSpace.AI — Bannière de mise à jour dans l'app
import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useUpdates } from '@/hooks/useUpdates';
import { RELEASES_URL } from '@/constants/config';
import { useTheme } from '@/hooks/useTheme';
import { spacing, radius, fontSize } from '@/constants/theme';

// Le thème n'expose pas de couleur d'erreur ; on reprend le rouge des accents.
const ERROR_COLOR = '#EF4444';

/**
 * Sits above the tab content. Silent unless a newer version exists, so it
 * costs nothing on the happy path.
 */
export function UpdateBanner() {
  const { colors, accent } = useTheme();
  const {
    stage,
    latestVersion,
    progress,
    mandatory,
    canSelfInstall,
    downloadUrl,
    dismissed,
    dismiss,
    applyUpdate,
  } = useUpdates();

  const isBusy = stage === 'downloading';
  const isReady = stage === 'ready';
  const shouldShow = stage === 'available' || isBusy || isReady;
  if (!shouldShow) return null;
  if (dismissed && !mandatory && !isBusy) return null;

  const handlePress = () => {
    if (isBusy) return;
    if (canSelfInstall) {
      void applyUpdate();
      return;
    }
    void Linking.openURL(downloadUrl ?? RELEASES_URL);
  };

  const actionLabel = isReady ? 'Redémarrer' : canSelfInstall ? 'Mettre à jour' : 'Télécharger';
  const busyLabel = `Téléchargement${typeof progress === 'number' ? ` ${progress}%` : '…'}`;

  const s = StyleSheet.create({
    banner: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      marginHorizontal: spacing.md, marginBottom: spacing.sm,
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1, borderColor: mandatory ? ERROR_COLOR : accent,
      borderRadius: radius.lg,
      shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
      elevation: 12,
    },
    textBlock: { flex: 1, gap: 2 },
    title: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
    subtitle: { fontSize: fontSize.xs, color: colors.textSecondary },
    progressTrack: {
      height: 4, marginTop: spacing.xs,
      borderRadius: radius.full, backgroundColor: colors.border, overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: accent, borderRadius: radius.full },
    action: {
      backgroundColor: accent, borderRadius: radius.md,
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      minWidth: 96, alignItems: 'center',
    },
    actionText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '700' },
  });

  return (
    <View style={s.banner}>
      <MaterialIcons
        name={mandatory ? 'priority-high' : 'system-update'}
        size={20}
        color={mandatory ? ERROR_COLOR : accent}
      />

      <View style={s.textBlock}>
        <Text style={s.title} numberOfLines={1}>
          {mandatory
            ? 'Mise à jour requise'
            : isReady
              ? 'Nouvelle version prête à installer'
              : 'Nouvelle version disponible'}
          {latestVersion ? ` · ${latestVersion}` : ''}
        </Text>
        <Text style={s.subtitle} numberOfLines={1}>
          {isBusy
            ? busyLabel
            : isReady
              ? "Elle s'installera à la fermeture de l'application, ou redémarrez maintenant."
              : canSelfInstall
                ? "L'application redémarrera pour terminer l'installation."
                : 'Ouvrez la page de téléchargement pour installer la nouvelle version.'}
        </Text>
        {isBusy && typeof progress === 'number' ? (
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${Math.max(2, progress)}%` }]} />
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={handlePress}
        disabled={isBusy}
        accessibilityRole="button"
        accessibilityLabel={isBusy ? busyLabel : actionLabel}
        style={({ pressed }) => [s.action, pressed && !isBusy && { opacity: 0.75 }]}
      >
        {isBusy ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text style={s.actionText}>{actionLabel}</Text>
        )}
      </Pressable>

      {!mandatory && !isBusy ? (
        <Pressable
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel="Masquer la notification de mise à jour"
          hitSlop={8}
        >
          <MaterialIcons name="close" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}
