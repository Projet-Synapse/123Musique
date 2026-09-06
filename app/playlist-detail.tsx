// Powered by OnSpace.AI
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useMusic, Track } from '@/contexts/MusicContext';
import { spacing, radius, fontSize } from '@/constants/theme';

export default function PlaylistDetailScreen() {
  const { colors, accent } = useTheme();
  const { playlists, tracks, renamePlaylist, removeFromPlaylist, addToPlaylist, playTrack } = useMusic();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const playlist = playlists.find(p => p.id === id);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [newName, setNewName] = useState('');
  const [addSearch, setAddSearch] = useState('');

  if (!playlist) {
    router.back();
    return null;
  }

  const playlistTracks = playlist.trackIds
    .map(tid => tracks.find(t => t.id === tid))
    .filter(Boolean) as Track[];

  const availableToAdd = tracks.filter(t => !playlist.trackIds.includes(t.id));
  const addQuery = addSearch.toLowerCase();
  const filteredAvailable = availableToAdd.filter(t =>
    t.name.toLowerCase().includes(addQuery) || t.artist.toLowerCase().includes(addQuery)
  );

  const closeAddModal = () => {
    setShowAddModal(false);
    setAddSearch('');
  };

  const handleAddAll = () => {
    filteredAvailable.forEach(t => addToPlaylist(id, t.id));
  };

  const handleRename = () => {
    if (!newName.trim()) return;
    renamePlaylist(id, newName.trim());
    setShowRename(false);
    setNewName('');
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.md,
      paddingBottom: spacing.md, backgroundColor: colors.surface,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backBtn: { marginRight: spacing.sm, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    headerInfo: { flex: 1 },
    headerTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
    headerCount: { fontSize: fontSize.xs, color: colors.textSecondary },
    addBtn: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: accent,
      alignItems: 'center', justifyContent: 'center', marginLeft: spacing.xs,
    },
    renameBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.xs },
    playAllBtn: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      backgroundColor: accent, borderRadius: radius.full, marginLeft: spacing.sm,
    },
    playAllText: { color: '#FFF', fontWeight: '700', fontSize: fontSize.sm },
    trackItem: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    artwork: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.surfaceElevated },
    artworkPlaceholder: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
    trackInfo: { flex: 1, marginLeft: spacing.sm },
    trackName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
    trackMeta: { fontSize: fontSize.xs, color: colors.textSecondary },
    removeBtn: { padding: spacing.xs },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
    emptyText: { fontSize: fontSize.lg, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
    modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface, borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl, padding: spacing.md,
      paddingBottom: insets.bottom + spacing.lg, maxHeight: '70%',
    },
    sheetTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
    sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    addAllText: { fontSize: fontSize.sm, fontWeight: '700', color: accent },
    searchRow: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceElevated,
      borderRadius: radius.md, paddingHorizontal: spacing.sm, marginBottom: spacing.sm,
    },
    searchInput: { flex: 1, color: colors.text, fontSize: fontSize.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
    sheetTrack: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    sheetTrackName: { flex: 1, fontSize: fontSize.md, color: colors.text },
    input: {
      backgroundColor: colors.surfaceElevated, borderRadius: radius.md,
      padding: spacing.md, color: colors.text, fontSize: fontSize.md,
      borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
    },
    modalBtns: { flexDirection: 'row', gap: spacing.sm },
    cancelBtn: { flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceElevated, alignItems: 'center' },
    confirmBtn: { flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: accent, alignItems: 'center' },
    cancelText: { color: colors.textSecondary, fontWeight: '600' },
    confirmText: { color: '#FFF', fontWeight: '700' },
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerInfo}>
          <Text style={s.headerTitle} numberOfLines={1}>{playlist.name}</Text>
          <Text style={s.headerCount}>{playlistTracks.length} titre{playlistTracks.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={s.renameBtn} onPress={() => { setNewName(playlist.name); setShowRename(true); }}>
          <MaterialIcons name="edit" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        {playlistTracks.length > 0 && (
          <TouchableOpacity style={s.playAllBtn} onPress={() => playTrack(playlistTracks[0], playlistTracks)}>
            <MaterialIcons name="play-arrow" size={18} color="#FFF" />
            <Text style={s.playAllText}>Lire tout</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={s.addBtn} onPress={() => { setAddSearch(''); setShowAddModal(true); }}>
          <MaterialIcons name="add" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {playlistTracks.length === 0 ? (
        <View style={s.empty}>
          <MaterialIcons name="queue-music" size={64} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
          <Text style={s.emptyText}>Cette playlist est vide.{'\n'}Ajoutez des musiques avec le bouton +</Text>
        </View>
      ) : (
        <FlatList
          data={playlistTracks}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 180 }}
          renderItem={({ item }) => (
            <Pressable style={({ pressed }) => [s.trackItem, pressed && { opacity: 0.7 }]} onPress={() => playTrack(item, playlistTracks)}>
              {item.artworkUri ? (
                <Image source={{ uri: item.artworkUri }} style={s.artwork} contentFit="cover" />
              ) : (
                <View style={s.artworkPlaceholder}>
                  <MaterialIcons name="music-note" size={24} color={accent} />
                </View>
              )}
              <View style={s.trackInfo}>
                <Text style={s.trackName} numberOfLines={1}>{item.name}</Text>
                <Text style={s.trackMeta} numberOfLines={1}>{item.artist}</Text>
              </View>
              <TouchableOpacity style={s.removeBtn} onPress={() => removeFromPlaylist(id, item.id)}>
                <MaterialIcons name="remove-circle-outline" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </Pressable>
          )}
        />
      )}

      {/* Add tracks modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={closeAddModal}>
        <View style={s.modal}>
          <View style={s.sheet}>
            <View style={s.sheetHeaderRow}>
              <Text style={s.sheetTitle}>Ajouter à la playlist</Text>
              {filteredAvailable.length > 0 && (
                <TouchableOpacity onPress={handleAddAll}>
                  <Text style={s.addAllText}>Tout ajouter ({filteredAvailable.length})</Text>
                </TouchableOpacity>
              )}
            </View>
            {availableToAdd.length > 0 && (
              <View style={s.searchRow}>
                <MaterialIcons name="search" size={18} color={colors.textMuted} />
                <TextInput
                  style={s.searchInput}
                  placeholder="Rechercher..."
                  placeholderTextColor={colors.textMuted}
                  value={addSearch}
                  onChangeText={setAddSearch}
                />
                {addSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setAddSearch('')}>
                    <MaterialIcons name="close" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            )}
            {availableToAdd.length === 0 ? (
              <Text style={{ color: colors.textSecondary, padding: spacing.md }}>Toutes les musiques sont déjà dans cette playlist.</Text>
            ) : filteredAvailable.length === 0 ? (
              <Text style={{ color: colors.textSecondary, padding: spacing.md }}>Aucun résultat.</Text>
            ) : (
              <FlatList
                data={filteredAvailable}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={s.sheetTrack} onPress={() => { addToPlaylist(id, item.id); }}>
                    <Text style={s.sheetTrackName} numberOfLines={1}>{item.name}</Text>
                    <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>{item.artist}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity style={[s.cancelBtn, { marginTop: spacing.md }]} onPress={closeAddModal}>
              <Text style={s.cancelText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rename modal */}
      <Modal visible={showRename} transparent animationType="slide">
        <View style={s.modal}>
          <View style={[s.sheet, { maxHeight: undefined }]}>
            <Text style={s.sheetTitle}>Renommer la playlist</Text>
            <TextInput
              style={s.input}
              value={newName}
              onChangeText={setNewName}
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowRename(false)}>
                <Text style={s.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={handleRename}>
                <Text style={s.confirmText}>Renommer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
