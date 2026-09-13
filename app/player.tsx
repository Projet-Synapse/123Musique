// Powered by OnSpace.AI
import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Pressable,
  StatusBar, Dimensions, Modal, ViewStyle, TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useMusic } from '@/contexts/MusicContext';
import { spacing, radius, fontSize } from '@/constants/theme';

const { width } = Dimensions.get('window');

function formatTime(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const TABS = ['Lecture', 'Effets', 'Info'] as const;
type Tab = typeof TABS[number];

export default function PlayerScreen() {
  const { colors, accent, mode } = useTheme();
  const {
    currentTrack, isPlaying, position, duration, pauseTrack, resumeTrack, seekTo, nextTrack, prevTrack,
    effects, setEffects, shuffle, repeatMode, toggleShuffle, cycleRepeatMode,
    queue, playTrack, removeFromQueue, volume, setVolume, toggleFavorite,
    sleepTimerMinutes, sleepTimerEndsAt, setSleepTimer,
  } = useMusic();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('Lecture');
  const [showSleepModal, setShowSleepModal] = useState(false);
  const lastVolumeRef = useRef(1);
  const SLEEP_OPTIONS = [15, 30, 45, 60, 90];
  const remainingSleepMin = sleepTimerEndsAt
    ? Math.max(0, Math.ceil((sleepTimerEndsAt - Date.now()) / 60_000))
    : null;

  if (!currentTrack) {
    router.back();
    return null;
  }

  const artworkSize = width - spacing.xl * 2;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: spacing.sm },
    closeRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
    artwork: {
      width: artworkSize, height: artworkSize, borderRadius: radius.xl,
      alignSelf: 'center', backgroundColor: colors.surfaceElevated,
    },
    artworkPlaceholder: {
      width: artworkSize, height: artworkSize, borderRadius: radius.xl,
      alignSelf: 'center', backgroundColor: colors.surfaceElevated,
      alignItems: 'center', justifyContent: 'center',
    },
    trackInfoRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing.xl, marginTop: spacing.lg,
    },
    trackName: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, flex: 1 },
    favBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm },
    artistName: { fontSize: fontSize.md, color: colors.textSecondary, paddingHorizontal: spacing.xl, marginTop: 4 },
    sliderRow: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
    timeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
    timeText: { fontSize: fontSize.xs, color: colors.textMuted },
    volumeRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: spacing.lg, marginTop: spacing.xs, gap: spacing.sm,
    },
    queueHeader: { paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing.xs },
    queueTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
    queueHint: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
    queueRow: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm, borderRadius: radius.md,
    },
    queueIndexCol: { width: 28, alignItems: 'center' },
    queueIndex: { fontSize: fontSize.xs, color: colors.textMuted },
    queueInfo: { flex: 1 },
    queueName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
    queueMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 1 },
    queueRemoveBtn: { padding: spacing.xs },
    controls: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing.xl, marginTop: spacing.lg,
    },
    mainControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
    modeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    playBtn: {
      width: 70, height: 70, borderRadius: 35, backgroundColor: accent,
      alignItems: 'center', justifyContent: 'center',
    },
    tabs: { flexDirection: 'row', paddingHorizontal: spacing.md, marginTop: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border },
    tabContent: { flex: 1, padding: spacing.md },
    effectRow: { marginBottom: spacing.lg },
    effectLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
    effectName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
    effectValue: { fontSize: fontSize.sm, color: accent, fontWeight: '700' },
    aiCard: {
      backgroundColor: colors.surfaceElevated, borderRadius: radius.lg,
      padding: spacing.md, marginBottom: spacing.md,
      borderWidth: 1, borderColor: accent + '44',
    },
    aiTitle: { fontSize: fontSize.md, fontWeight: '700', color: accent, marginBottom: spacing.xs },
    aiDesc: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.md },
    aiBtn: {
      backgroundColor: accent, borderRadius: radius.md,
      padding: spacing.sm, alignItems: 'center',
    },
    aiBtnText: { color: '#FFF', fontWeight: '700', fontSize: fontSize.sm },
    infoRow: { flexDirection: 'row', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
    infoKey: { width: 90, fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
    infoVal: { flex: 1, fontSize: fontSize.sm, color: colors.text },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface, borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl, padding: spacing.md,
      paddingBottom: insets.bottom + spacing.lg,
    },
    sheetTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
    sheetCaption: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm },
    sleepRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    sleepRowText: { fontSize: fontSize.md, color: colors.text },
    doneBtn: {
      marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md,
      backgroundColor: colors.surfaceElevated, alignItems: 'center',
    },
    doneBtnText: { color: colors.textSecondary, fontWeight: '600' },
  });

  // Kept outside StyleSheet.create: a function value mixed into that call collapses
  // TypeScript's inference for every other style key in the same object.
  const tabStyle = (active: boolean): ViewStyle => ({
    flex: 1, paddingVertical: spacing.sm, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: active ? accent : 'transparent',
  });
  const tabTextStyle = (active: boolean): TextStyle => ({
    fontSize: fontSize.sm, fontWeight: '600',
    color: active ? accent : colors.textSecondary,
  });

  const renderEffects = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Speed */}
      <View style={s.effectRow}>
        <View style={s.effectLabel}>
          <Text style={s.effectName}>Vitesse</Text>
          <Text style={s.effectValue}>{effects.speed.toFixed(2)}x</Text>
        </View>
        <Slider
          minimumValue={0.25}
          maximumValue={2}
          step={0.05}
          value={effects.speed}
          onValueChange={v => setEffects({ speed: v })}
          minimumTrackTintColor={accent}
          maximumTrackTintColor={colors.border}
          thumbTintColor={accent}
        />
      </View>
      {/* Pitch and reverb were removed: expo-av has no such engine support,
          and sliders that visibly do nothing read as bugs. */}
      {/* AI Separation */}
      <View style={s.aiCard}>
        <Text style={s.aiTitle}>Séparation d&apos;instruments IA</Text>
        <Text style={s.aiDesc}>
          Isolez voix, guitare, basse, batterie et plus encore grâce à l&apos;intelligence artificielle.
        </Text>
        <TouchableOpacity
          style={[s.aiBtn, { opacity: 0.5 }]}
          disabled
          accessibilityState={{ disabled: true }}
          accessibilityLabel="Séparation d'instruments IA, bientôt disponible"
        >
          <Text style={s.aiBtnText}>Bientôt disponible</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderQueue = () => (
    <FlatList
      data={queue}
      keyExtractor={item => item.id}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={s.queueHeader}>
          <Text style={s.queueTitle}>File d&apos;attente · {queue.length} titre{queue.length !== 1 ? 's' : ''}</Text>
          <Text style={s.queueHint}>Touchez un titre pour le lire immédiatement, ✕ pour le retirer.</Text>
        </View>
      }
      renderItem={({ item, index }) => {
        const isCurrent = item.id === currentTrack.id;
        return (
          <Pressable
            style={({ pressed }) => [s.queueRow, pressed && { opacity: 0.7 }]}
            onPress={() => playTrack(item, queue)}
            accessibilityRole="button"
            accessibilityLabel={`${isCurrent ? 'En lecture : ' : 'Lire '}${item.name}, ${item.artist}`}
          >
            <View style={s.queueIndexCol}>
              {isCurrent ? (
                <MaterialIcons name="volume-up" size={16} color={accent} />
              ) : (
                <Text style={s.queueIndex}>{index + 1}</Text>
              )}
            </View>
            <View style={s.queueInfo}>
              <Text style={[s.queueName, isCurrent && { color: accent }]} numberOfLines={1}>{item.name}</Text>
              <Text style={s.queueMeta} numberOfLines={1}>
                {item.artist}{item.duration ? ` · ${formatTime(item.duration)}` : ''}
              </Text>
            </View>
            {!isCurrent && (
              <TouchableOpacity
                style={s.queueRemoveBtn}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                onPress={() => removeFromQueue(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`Retirer ${item.name} de la file d'attente`}
              >
                <MaterialIcons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </Pressable>
        );
      }}
    />
  );

  const renderInfo = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {[
        ['Titre', currentTrack.name],
        ['Artiste', currentTrack.artist],
        ['Album', currentTrack.album],
        ['Année', currentTrack.year || '—'],
        ['Durée', currentTrack.duration ? formatTime(currentTrack.duration) : '—'],
        ['Description', currentTrack.description || '—'],
      ].map(([key, val]) => (
        <View key={key} style={s.infoRow}>
          <Text style={s.infoKey}>{key}</Text>
          <Text style={s.infoVal}>{val}</Text>
        </View>
      ))}
    </ScrollView>
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={s.handle} />
      <View style={s.closeRow}>
        <TouchableOpacity
          style={s.closeBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Fermer le lecteur"
        >
          <MaterialIcons name="keyboard-arrow-down" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>En lecture</Text>
        <TouchableOpacity
          style={s.closeBtn}
          onPress={() => setShowSleepModal(true)}
          accessibilityRole="button"
          accessibilityLabel={
            sleepTimerMinutes && remainingSleepMin !== null
              ? `Minuteur de sommeil actif : pause dans environ ${remainingSleepMin} minutes`
              : 'Minuteur de sommeil'
          }
        >
          <MaterialIcons name="bedtime" size={20} color={sleepTimerMinutes ? accent : colors.text} />
        </TouchableOpacity>
      </View>

      {currentTrack.artworkUri ? (
        <Image source={{ uri: currentTrack.artworkUri }} style={s.artwork} contentFit="cover" />
      ) : (
        <View style={s.artworkPlaceholder}>
          <MaterialIcons name="music-note" size={90} color={accent + '88'} />
        </View>
      )}

      <View style={s.trackInfoRow}>
        <Text style={s.trackName} numberOfLines={1}>{currentTrack.name}</Text>
        <TouchableOpacity
          style={s.favBtn}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          onPress={() => toggleFavorite(currentTrack.id)}
          accessibilityRole="button"
          accessibilityLabel={currentTrack.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <MaterialIcons
            name={currentTrack.favorite ? 'favorite' : 'favorite-border'}
            size={26}
            color={currentTrack.favorite ? accent : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
      <Text style={s.artistName} numberOfLines={1}>{currentTrack.artist}</Text>

      <View style={s.sliderRow}>
        <Slider
          minimumValue={0}
          maximumValue={duration || 1}
          value={position}
          onSlidingComplete={seekTo}
          minimumTrackTintColor={accent}
          maximumTrackTintColor={colors.border}
          thumbTintColor={accent}
        />
      </View>
      <View style={s.timeRow}>
        <Text style={s.timeText}>{formatTime(position)}</Text>
        <Text style={s.timeText}>{formatTime(duration)}</Text>
      </View>

      <View style={s.volumeRow}>
        <TouchableOpacity
          onPress={() => {
            if (volume > 0) { lastVolumeRef.current = volume; setVolume(0); }
            else setVolume(lastVolumeRef.current || 0.8);
          }}
          accessibilityRole="button"
          accessibilityLabel={volume === 0 ? 'Réactiver le son' : 'Couper le son'}
        >
          <MaterialIcons name={volume === 0 ? 'volume-off' : 'volume-up'} size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Slider
          style={{ flex: 1 }}
          minimumValue={0}
          maximumValue={1}
          step={0.01}
          value={volume}
          onValueChange={setVolume}
          minimumTrackTintColor={accent}
          maximumTrackTintColor={colors.border}
          thumbTintColor={accent}
          accessibilityLabel="Volume"
        />
      </View>

      <View style={s.controls}>
        <TouchableOpacity
          style={s.modeBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={toggleShuffle}
          accessibilityRole="button"
          accessibilityLabel={shuffle ? 'Désactiver la lecture aléatoire' : 'Activer la lecture aléatoire'}
        >
          <MaterialIcons name="shuffle" size={22} color={shuffle ? accent : colors.textMuted} />
        </TouchableOpacity>
        <View style={s.mainControls}>
          <TouchableOpacity onPress={() => prevTrack()} accessibilityRole="button" accessibilityLabel="Piste précédente">
            <MaterialIcons name="skip-previous" size={40} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.playBtn}
            onPress={() => { if (isPlaying) pauseTrack(); else resumeTrack(); }}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Mettre en pause' : 'Lire'}
          >
            <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={38} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => nextTrack()} accessibilityRole="button" accessibilityLabel="Piste suivante">
            <MaterialIcons name="skip-next" size={40} color={colors.text} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={s.modeBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={cycleRepeatMode}
          accessibilityRole="button"
          accessibilityLabel={
            repeatMode === 'off' ? 'Activer la répétition' : repeatMode === 'all' ? 'Répéter uniquement ce titre' : 'Désactiver la répétition'
          }
        >
          <MaterialIcons
            name={repeatMode === 'one' ? 'repeat-one' : 'repeat'}
            size={22}
            color={repeatMode !== 'off' ? accent : colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      <View style={s.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={tabStyle(activeTab === tab)}
            onPress={() => setActiveTab(tab)}
            accessibilityRole="tab"
            accessibilityLabel={tab}
            accessibilityState={{ selected: activeTab === tab }}
          >
            <Text style={tabTextStyle(activeTab === tab)}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={s.tabContent}>
        {activeTab === 'Effets' ? renderEffects() : activeTab === 'Info' ? renderInfo() : renderQueue()}
      </View>

      <Modal visible={showSleepModal} transparent animationType="slide" onRequestClose={() => setShowSleepModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Minuteur de sommeil</Text>
            {sleepTimerMinutes !== null && remainingSleepMin !== null && (
              <Text style={s.sheetCaption}>
                La lecture sera mise en pause dans environ {remainingSleepMin} min.
              </Text>
            )}
            {SLEEP_OPTIONS.map(min => {
              const active = sleepTimerMinutes === min;
              return (
                <TouchableOpacity
                  key={min}
                  style={s.sleepRow}
                  onPress={() => { setSleepTimer(min); setShowSleepModal(false); }}
                  accessibilityRole="button"
                  accessibilityLabel={`Mettre la lecture en pause dans ${min} minutes`}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[s.sleepRowText, active && { color: accent, fontWeight: '700' }]}>{min} minutes</Text>
                  {active && <MaterialIcons name="check" size={20} color={accent} />}
                </TouchableOpacity>
              );
            })}
            {sleepTimerMinutes !== null && (
              <TouchableOpacity
                style={s.sleepRow}
                onPress={() => { setSleepTimer(null); setShowSleepModal(false); }}
                accessibilityRole="button"
                accessibilityLabel="Désactiver le minuteur de sommeil"
              >
                <Text style={s.sleepRowText}>Désactiver</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={s.doneBtn}
              onPress={() => setShowSleepModal(false)}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            >
              <Text style={s.doneBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
