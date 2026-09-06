// Powered by OnSpace.AI
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, StatusBar, Pressable, ViewStyle, TextStyle, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useMusic, Track } from '@/contexts/MusicContext';
import { useAlert } from '@/template';
import { spacing, radius, fontSize } from '@/constants/theme';

export default function LibraryScreen() {
  const { colors, accent, mode } = useTheme();
  const {
    tracks, addTrack, removeTrack, playTrack, currentTrack, isPlaying,
    playlists, addToPlaylist, removeFromPlaylist, createPlaylist,
    shuffle, toggleShuffle,
  } = useMusic();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'artist' | 'date'>('date');
  const [playlistPickerTrack, setPlaylistPickerTrack] = useState<Track | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return tracks
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
  }, [tracks, search, sortBy]);

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
      result.assets.forEach(asset => {
        const track: Track = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
          uri: asset.uri,
          name: asset.name.replace(/\.[^/.]+$/, ''),
          artist: 'Artiste inconnu',
          album: 'Album inconnu',
          year: '',
          description: '',
          artworkUri: undefined,
          dateAdded: Date.now(),
        };
        addTrack(track);
      });
    } catch {
      showAlert('Erreur', "Impossible d'importer ce fichier.");
    }
  }, [addTrack, showAlert]);

  const closePlaylistPicker = () => {
    setPlaylistPickerTrack(null);
    setNewPlaylistName('');
  };

  const handleCreatePlaylistAndAdd = () => {
    const name = newPlaylistName.trim();
    if (!name || !playlistPickerTrack) return;
    const id = createPlaylist(name);
    addToPlaylist(id, playlistPickerTrack.id);
    setNewPlaylistName('');
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
    artwork: { width: 52, height: 52, borderRadius: radius.sm, backgroundColor: colors.surfaceElevated },
    artworkPlaceholder: {
      width: 52, height: 52, borderRadius: radius.sm, backgroundColor: colors.surfaceElevated,
      alignItems: 'center', justifyContent: 'center',
    },
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
      >
        {isActive && isPlaying && <View style={s.nowPlayingBar} />}
        {item.artworkUri ? (
          <Image source={{ uri: item.artworkUri }} style={s.artwork} contentFit="cover" />
        ) : (
          <View style={s.artworkPlaceholder}>
            <MaterialIcons name="music-note" size={28} color={accent} />
          </View>
        )}
        <View style={s.trackInfo}>
          <Text style={[s.trackName, isActive && { color: accent }]} numberOfLines={1}>{item.name}</Text>
          <Text style={s.trackMeta} numberOfLines={1}>
            {item.artist}{item.album !== 'Album inconnu' ? ` · ${item.album}` : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={s.actionBtn}
          onPress={() => setPlaylistPickerTrack(item)}
          accessibilityRole="button"
          accessibilityLabel={`Ajouter ${item.name} à une playlist`}
        >
          <MaterialIcons name="playlist-add" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.actionBtn}
          onPress={() => router.push({ pathname: '/edit-track', params: { id: item.id } })}
          accessibilityRole="button"
          accessibilityLabel={`Modifier ${item.name}`}
        >
          <MaterialIcons name="edit" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.actionBtn}
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
          <TouchableOpacity style={s.importBtn} onPress={importMusic}>
            <MaterialIcons name="add" size={18} color="#FFF" />
            <Text style={s.importBtnText}>Importer</Text>
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
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialIcons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <View style={s.sortRow}>
          {(['date', 'name', 'artist'] as const).map(k => (
            <TouchableOpacity key={k} style={sortBtnStyle(sortBy === k)} onPress={() => setSortBy(k)}>
              <Text style={sortBtnTextStyle(sortBy === k)}>
                {k === 'date' ? 'Récent' : k === 'name' ? 'Nom' : 'Artiste'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {filtered.length > 0 && (
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
          </View>
        )}
      </View>

      {tracks.length === 0 ? (
        <View style={s.emptyContainer}>
          <Image source={require('@/assets/images/empty-music.png')} style={s.emptyImage} contentFit="contain" />
          <Text style={s.emptyTitle}>Aucune musique</Text>
          <Text style={s.emptySubtitle}>Importez vos fichiers MP3 ou audio depuis votre appareil.</Text>
          <TouchableOpacity style={s.emptyImportBtn} onPress={importMusic}>
            <MaterialIcons name="add" size={18} color="#FFF" />
            <Text style={s.emptyImportBtnText}>Importer de la musique</Text>
          </TouchableOpacity>
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

      <Modal visible={!!playlistPickerTrack} transparent animationType="slide" onRequestClose={closePlaylistPicker}>
        <View style={s.modal}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle} numberOfLines={1}>
              Ajouter « {playlistPickerTrack?.name} » à…
            </Text>
            {playlists.length === 0 ? (
              <Text style={s.sheetSubtitle}>Aucune playlist pour l&apos;instant. Créez-en une ci-dessous.</Text>
            ) : (
              <FlatList
                data={playlists}
                keyExtractor={p => p.id}
                renderItem={({ item: p }) => {
                  const included = !!playlistPickerTrack && p.trackIds.includes(playlistPickerTrack.id);
                  return (
                    <TouchableOpacity
                      style={s.playlistRow}
                      onPress={() => {
                        if (!playlistPickerTrack) return;
                        if (included) removeFromPlaylist(p.id, playlistPickerTrack.id);
                        else addToPlaylist(p.id, playlistPickerTrack.id);
                      }}
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
            <TouchableOpacity style={s.doneBtn} onPress={closePlaylistPicker}>
              <Text style={s.doneBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
