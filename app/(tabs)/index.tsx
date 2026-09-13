// Powered by OnSpace.AI
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, StatusBar, Pressable, ViewStyle, TextStyle, Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useMusic, Track } from '@/contexts/MusicContext';
import { readTrackMetadata } from '@/services/metadata';
import { useAlert } from '@/template';
import { spacing, radius, fontSize } from '@/constants/theme';

function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return '';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function LibraryScreen() {
  const { colors, accent, mode } = useTheme();
  const {
    tracks, addTracks, removeTrack, playTrack, currentTrack, isPlaying,
    playlists, addToPlaylist, removeFromPlaylist, createPlaylist,
    shuffle, toggleShuffle, toggleFavorite,
    playNext, addToQueue,
  } = useMusic();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'artist' | 'date'>('date');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [actionSheetTrack, setActionSheetTrack] = useState<Track | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [importing, setImporting] = useState(false);

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return tracks
      .filter(t => !onlyFavorites || t.favorite)
      .filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.artist.toLowerCase().includes(query) ||
        t.album.toLowerCase().includes(query)
      )
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'artist') return a.artist.localeCompare(b.artist);
        return b.dateAdded - a.dateAdded;
      });
  }, [tracks, search, sortBy, onlyFavorites]);

  const playAll = useCallback(() => {
    if (filtered.length === 0) return;
    playTrack(filtered[0], filtered);
  }, [filtered, playTrack]);

  const shufflePlayAll = useCallback(() => {
    if (filtered.length === 0) return;
    if (!shuffle) toggleShuffle();
    const randIdx = Math.floor(Math.random() * filtered.length);
    playTrack(filtered[randIdx], filtered);
  }, [filtered, playTrack, shuffle, toggleShuffle]);

  const importMusic = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      setImporting(true);
      const now = Date.now();
      const imported: Track[] = [];
      let skipped = 0;
      // Picker URIs are session-scoped (cache/blob), so identity comes from
      // the tags instead: title | artist | duration in seconds. Tracks whose
      // duration is unknown match on title | artist alone.
      const trackSig = (name: string, artist: string, duration?: number) =>
        `${name.toLowerCase()}|${artist.toLowerCase()}|${duration ? Math.round(duration / 1000) : 'x'}`;
      const existing = new Set(tracks.map(t => trackSig(t.name, t.artist, t.duration)));
      const batch = new Set<string>();
      // Sequential on purpose: each file is opened once by the audio engine to
      // measure its duration, which is IO-bound — batching would fight for
      // memory on low-end devices for no user-visible gain.
      for (const [i, asset] of result.assets.entries()) {
        const meta = await readTrackMetadata(asset.uri);
        const name = (meta.title || asset.name.replace(/\.[^/.]+$/, '')).trim();
        const artist = meta.artist || 'Artiste inconnu';
        const sig = trackSig(name, artist, meta.duration);
        if (existing.has(sig) || batch.has(sig)) {
          skipped += 1;
          continue;
        }
        batch.add(sig);
        imported.push({
          id: `${now}_${i}_${Math.random().toString(36).slice(2)}`,
          uri: asset.uri,
          name,
          artist,
          album: meta.album || 'Album inconnu',
          year: meta.year || '',
          description: '',
          artworkUri: meta.artworkUri,
          duration: meta.duration,
          size: asset.size,
          dateAdded: now,
        });
      }
      if (imported.length > 0) addTracks(imported);
      const addedLabel = imported.length === 0
        ? 'Aucun nouveau titre.'
        : `${imported.length} titre${imported.length > 1 ? 's' : ''} ajouté${imported.length > 1 ? 's' : ''} à la bibliothèque.`;
      showAlert(
        'Import terminé',
        skipped > 0 ? `${addedLabel} ${skipped} doublon${skipped > 1 ? 's' : ''} ignoré${skipped > 1 ? 's' : ''}.` : addedLabel
      );
    } catch {
      showAlert('Erreur', "Impossible d'importer ce fichier.");
    } finally {
      setImporting(false);
    }
  }, [addTracks, showAlert, tracks]);

  const closePlaylistPicker = () => {
    setActionSheetTrack(null);
    setNewPlaylistName('');
  };

  const handleCreatePlaylistAndAdd = () => {
    const name = newPlaylistName.trim();
    if (!name || !actionSheetTrack) return;
    const id = createPlaylist(name);
    addToPlaylist(id, actionSheetTrack.id);
    setNewPlaylistName('');
  };

  // With nothing playing, queueing a track would build a queue nothing
  // consumes — start it instead, exactly as a row tap would.
  const queueAction = (mode: 'next' | 'end') => {
    if (!actionSheetTrack) return;
    if (!currentTrack) playTrack(actionSheetTrack, [actionSheetTrack]);
    else if (mode === 'next') playNext(actionSheetTrack);
    else addToQueue(actionSheetTrack);
    closePlaylistPicker();
  };

  const handleDelete = (track: Track) => {
    showAlert(
      'Supprimer',
      `Supprimer "${track.name}" de la bibliothèque ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => removeTrack(track.id) },
      ]
    );
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: insets.top + spacing.md,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
    importBtn: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: accent,
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      borderRadius: radius.full, gap: 6,
    },
    importBtnText: { color: '#FFF', fontWeight: '700', fontSize: fontSize.sm },
    searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceElevated, borderRadius: radius.md, paddingHorizontal: spacing.sm, marginBottom: spacing.sm },
    searchInput: { flex: 1, color: colors.text, fontSize: fontSize.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
    sortRow: { flexDirection: 'row', gap: spacing.xs },
    quickActionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    quickActionBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: spacing.sm, paddingVertical: 6,
      borderRadius: radius.full, backgroundColor: colors.surfaceElevated,
    },
    quickActionText: { fontSize: fontSize.xs, fontWeight: '600', color: accent },
    trackItem: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    artworkWrap: { position: 'relative' },
    artwork: { width: 52, height: 52, borderRadius: radius.sm, backgroundColor: colors.surfaceElevated },
    artworkPlaceholder: {
      width: 52, height: 52, borderRadius: radius.sm, backgroundColor: colors.surfaceElevated,
      alignItems: 'center', justifyContent: 'center',
    },
    favBadge: {
      position: 'absolute', bottom: 2, right: 2, width: 20, height: 20,
      borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center', justifyContent: 'center',
    },
    noResult: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
    noResultText: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center' },
    trackInfo: { flex: 1, marginLeft: spacing.sm },
    trackName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: 2 },
    trackMeta: { fontSize: fontSize.xs, color: colors.textSecondary },
    nowPlayingBar: {
      width: 3, height: 36, backgroundColor: accent, borderRadius: 2, marginRight: spacing.sm,
    },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
    emptyImage: { width: 180, height: 180, marginBottom: spacing.lg },
    emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.sm, textAlign: 'center' },
    emptySubtitle: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
    emptyImportBtn: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: accent,
      paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
      borderRadius: radius.full, gap: 6,
    },
    emptyImportBtnText: { color: '#FFF', fontWeight: '700', fontSize: fontSize.sm },
    actionBtn: { padding: spacing.xs, marginLeft: 4 },
    modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface, borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl, padding: spacing.md,
      paddingBottom: insets.bottom + spacing.lg, maxHeight: '75%',
    },
    sheetTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
    sheetSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, paddingVertical: spacing.md },
    sectionLabel: {
      fontSize: fontSize.xs, fontWeight: '700', color: colors.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.5,
      marginTop: spacing.sm, marginBottom: spacing.xs,
    },
    playlistRow: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    playlistRowText: { flex: 1, fontSize: fontSize.md, color: colors.text },
    newPlaylistRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignItems: 'center' },
    newPlaylistInput: {
      flex: 1, backgroundColor: colors.surfaceElevated, borderRadius: radius.md,
      padding: spacing.sm, color: colors.text, fontSize: fontSize.md,
      borderWidth: 1, borderColor: colors.border,
    },
    newPlaylistBtn: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: accent,
      alignItems: 'center', justifyContent: 'center',
    },
    doneBtn: {
      marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md,
      backgroundColor: colors.surfaceElevated, alignItems: 'center',
    },
    doneBtnText: { color: colors.textSecondary, fontWeight: '600' },
  });

  // Kept outside StyleSheet.create: a function value mixed into that call collapses
  // TypeScript's inference for every other style key in the same object.
  const sortBtnStyle = (active: boolean): ViewStyle => ({
    paddingHorizontal: spacing.sm, paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: active ? accent : colors.surfaceElevated,
  });
  const sortBtnTextStyle = (active: boolean): TextStyle => ({
    fontSize: fontSize.xs, fontWeight: '600',
    color: active ? '#FFF' : colors.textSecondary,
  });

  const renderTrack = ({ item }: { item: Track }) => {
    const isActive = currentTrack?.id === item.id;
    return (
      <Pressable
        style={({ pressed }) => [s.trackItem, pressed && { opacity: 0.7 }]}
        onPress={() => playTrack(item, filtered)}
        accessibilityRole="button"
        accessibilityLabel={`Lire ${item.name}, ${item.artist}`}
      >
        {isActive && isPlaying && <View style={s.nowPlayingBar} />}
        <View style={s.artworkWrap}>
          {item.artworkUri ? (
            <Image source={{ uri: item.artworkUri }} style={s.artwork} contentFit="cover" />
          ) : (
            <View style={s.artworkPlaceholder}>
              <MaterialIcons name="music-note" size={28} color={accent} />
            </View>
          )}
          <TouchableOpacity
            style={s.favBadge}
            onPress={() => toggleFavorite(item.id)}
            accessibilityRole="button"
            accessibilityLabel={item.favorite ? `Retirer ${item.name} des favoris` : `Ajouter ${item.name} aux favoris`}
          >
            <MaterialIcons name={item.favorite ? 'favorite' : 'favorite-border'} size={13} color={item.favorite ? accent : '#FFF'} />
          </TouchableOpacity>
        </View>
        <View style={s.trackInfo}>
          <Text style={[s.trackName, isActive && { color: accent }]} numberOfLines={1}>{item.name}</Text>
          <Text style={s.trackMeta} numberOfLines={1}>
            {item.artist}{item.album !== 'Album inconnu' ? ` · ${item.album}` : ''}{item.duration ? ` · ${formatDuration(item.duration)}` : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={s.actionBtn}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          onPress={() => setActionSheetTrack(item)}
          accessibilityRole="button"
          accessibilityLabel={`Plus d'actions pour ${item.name}`}
        >
          <MaterialIcons name="more-vert" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.actionBtn}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          onPress={() => router.push({ pathname: '/edit-track', params: { id: item.id } })}
          accessibilityRole="button"
          accessibilityLabel={`Modifier ${item.name}`}
        >
          <MaterialIcons name="edit" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.actionBtn}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          onPress={() => handleDelete(item)}
          accessibilityRole="button"
          accessibilityLabel={`Supprimer ${item.name}`}
        >
          <MaterialIcons name="delete-outline" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </Pressable>
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.title}>Bibliothèque</Text>
          <TouchableOpacity
            style={[s.importBtn, importing && { opacity: 0.7 }]}
            onPress={importMusic}
            disabled={importing}
            accessibilityRole="button"
            accessibilityLabel="Importer de la musique"
            accessibilityState={{ busy: importing }}
          >
            {importing
              ? <ActivityIndicator size="small" color="#FFF" />
              : <MaterialIcons name="add" size={18} color="#FFF" />}
            <Text style={s.importBtnText}>{importing ? 'Import…' : 'Importer'}</Text>
          </TouchableOpacity>
        </View>
        <View style={s.searchRow}>
          <MaterialIcons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Rechercher..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch('')}
              accessibilityRole="button"
              accessibilityLabel="Effacer la recherche"
            >
              <MaterialIcons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <View style={s.sortRow}>
          {(['date', 'name', 'artist'] as const).map(k => {
            const label = k === 'date' ? 'Récent' : k === 'name' ? 'Nom' : 'Artiste';
            return (
              <TouchableOpacity
                key={k}
                style={sortBtnStyle(sortBy === k)}
                onPress={() => setSortBy(k)}
                accessibilityRole="button"
                accessibilityLabel={`Trier par ${label}`}
                accessibilityState={{ selected: sortBy === k }}
              >
                <Text style={sortBtnTextStyle(sortBy === k)}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {tracks.length > 0 && (
          <View style={s.quickActionsRow}>
            <TouchableOpacity
              style={s.quickActionBtn}
              onPress={playAll}
              accessibilityRole="button"
              accessibilityLabel="Tout lire"
            >
              <MaterialIcons name="play-arrow" size={18} color={accent} />
              <Text style={s.quickActionText}>Tout lire</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.quickActionBtn}
              onPress={shufflePlayAll}
              accessibilityRole="button"
              accessibilityLabel="Lecture aléatoire"
            >
              <MaterialIcons name="shuffle" size={18} color={accent} />
              <Text style={s.quickActionText}>Aléatoire</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.quickActionBtn, onlyFavorites && { borderColor: accent, borderWidth: 1 }]}
              onPress={() => setOnlyFavorites(f => !f)}
              accessibilityRole="button"
              accessibilityLabel={onlyFavorites ? 'Afficher tous les titres' : 'Afficher uniquement les favoris'}
              accessibilityState={{ selected: onlyFavorites }}
            >
              <MaterialIcons name={onlyFavorites ? 'favorite' : 'favorite-border'} size={16} color={accent} />
              <Text style={s.quickActionText}>Favoris</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {tracks.length === 0 ? (
        <View style={s.emptyContainer}>
          <Image source={require('@/assets/images/empty-music.png')} style={s.emptyImage} contentFit="contain" />
          <Text style={s.emptyTitle}>Aucune musique</Text>
          <Text style={s.emptySubtitle}>Importez vos fichiers MP3 ou audio depuis votre appareil.</Text>
          <TouchableOpacity
            style={s.emptyImportBtn}
            onPress={importMusic}
            accessibilityRole="button"
            accessibilityLabel="Importer de la musique"
          >
            <MaterialIcons name="add" size={18} color="#FFF" />
            <Text style={s.emptyImportBtnText}>Importer de la musique</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.noResult}>
          <MaterialIcons name="search-off" size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
          <Text style={s.noResultText}>
            {onlyFavorites ? 'Aucun favori pour le moment. Touchez le cœur d\'un titre pour l\'ajouter.' : 'Aucun résultat pour cette recherche.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderTrack}
          contentContainerStyle={{ paddingBottom: 180 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={!!actionSheetTrack} transparent animationType="slide" onRequestClose={closePlaylistPicker}>
        <View style={s.modal}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle} numberOfLines={1}>« {actionSheetTrack?.name} »</Text>
            <Text style={s.sectionLabel}>File d&apos;attente</Text>
            <TouchableOpacity
              style={s.playlistRow}
              onPress={() => queueAction('next')}
              accessibilityRole="button"
              accessibilityLabel={`Lire ${actionSheetTrack?.name} ensuite`}
            >
              <MaterialIcons name="queue" size={22} color={accent} />
              <Text style={s.playlistRowText}>Lire ensuite</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.playlistRow}
              onPress={() => queueAction('end')}
              accessibilityRole="button"
              accessibilityLabel={`Ajouter ${actionSheetTrack?.name} à la file d'attente`}
            >
              <MaterialIcons name="playlist-add" size={22} color={accent} />
              <Text style={s.playlistRowText}>Ajouter à la file</Text>
            </TouchableOpacity>
            <Text style={s.sectionLabel}>Playlists</Text>
            {playlists.length === 0 ? (
              <Text style={s.sheetSubtitle}>Aucune playlist pour l&apos;instant. Créez-en une ci-dessous.</Text>
            ) : (
              <FlatList
                data={playlists}
                keyExtractor={p => p.id}
                renderItem={({ item: p }) => {
                  const included = !!actionSheetTrack && p.trackIds.includes(actionSheetTrack.id);
                  return (
                    <TouchableOpacity
                      style={s.playlistRow}
                      onPress={() => {
                        if (!actionSheetTrack) return;
                        if (included) removeFromPlaylist(p.id, actionSheetTrack.id);
                        else addToPlaylist(p.id, actionSheetTrack.id);
                      }}
                      accessibilityRole="checkbox"
                      accessibilityLabel={p.name}
                      accessibilityState={{ checked: included }}
                    >
                      <MaterialIcons
                        name={included ? 'check-box' : 'check-box-outline-blank'}
                        size={22}
                        color={included ? accent : colors.textMuted}
                      />
                      <Text style={s.playlistRowText} numberOfLines={1}>{p.name}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
            <View style={s.newPlaylistRow}>
              <TextInput
                style={s.newPlaylistInput}
                placeholder="Nouvelle playlist…"
                placeholderTextColor={colors.textMuted}
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                onSubmitEditing={handleCreatePlaylistAndAdd}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={s.newPlaylistBtn}
                onPress={handleCreatePlaylistAndAdd}
                accessibilityRole="button"
                accessibilityLabel="Créer la playlist et y ajouter le titre"
              >
                <MaterialIcons name="add" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={s.doneBtn}
              onPress={closePlaylistPicker}
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
