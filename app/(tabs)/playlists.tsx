// Powered by OnSpace.AI
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, StatusBar, Modal, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useMusic } from '@/contexts/MusicContext';
import { useAlert } from '@/template';
import { spacing, radius, fontSize } from '@/constants/theme';

export default function PlaylistsScreen() {
  const { colors, accent, mode } = useTheme();
  const { playlists, createPlaylist, deletePlaylist, tracks } = useMusic();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = () => {
    if (!newName.trim()) return;
    createPlaylist(newName.trim());
    setNewName('');
    setShowCreate(false);
  };

  const handleDelete = (id: string, name: string) => {
    showAlert('Supprimer', `Supprimer la playlist "${name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deletePlaylist(id) },
    ]);
  };

  const COLORS = [accent, '#3B82F6', '#EC4899', '#10B981', '#F59E0B'];

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.md,
      paddingBottom: spacing.md, backgroundColor: colors.surface,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
    addBtn: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: accent,
      alignItems: 'center', justifyContent: 'center',
    },
    grid: { padding: spacing.md, paddingBottom: 180 },
    card: {
      flex: 1, margin: spacing.xs, borderRadius: radius.lg,
      backgroundColor: colors.surface, overflow: 'hidden',
      borderWidth: 1, borderColor: colors.border,
    },
    cardTop: {
      height: 100, alignItems: 'center', justifyContent: 'center',
    },
    cardBody: { padding: spacing.sm, paddingBottom: spacing.md },
    cardName: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: 2 },
    cardCount: { fontSize: fontSize.xs, color: colors.textSecondary },
    cardActions: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.xs },
    actionBtn: { padding: 6 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
    emptyText: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
    emptySubtitle: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center' },
    modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: colors.surface, borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl, padding: spacing.lg,
      paddingBottom: insets.bottom + spacing.lg,
    },
    modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
    input: {
      backgroundColor: colors.surfaceElevated, borderRadius: radius.md,
      padding: spacing.md, color: colors.text, fontSize: fontSize.md,
      borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
    },
    modalBtns: { flexDirection: 'row', gap: spacing.sm },
    cancelBtn: {
      flex: 1, padding: spacing.md, borderRadius: radius.md,
      backgroundColor: colors.surfaceElevated, alignItems: 'center',
    },
    confirmBtn: {
      flex: 1, padding: spacing.md, borderRadius: radius.md,
      backgroundColor: accent, alignItems: 'center',
    },
    cancelText: { color: colors.textSecondary, fontWeight: '600' },
    confirmText: { color: '#FFF', fontWeight: '700' },
  });

  return (
    <View style={s.container}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.title}>Playlists</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowCreate(true)}>
            <MaterialIcons name="add" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {playlists.length === 0 ? (
        <View style={s.emptyContainer}>
          <MaterialIcons name="queue-music" size={80} color={colors.textMuted} style={{ marginBottom: spacing.lg }} />
          <Text style={s.emptyText}>Aucune playlist</Text>
          <Text style={s.emptySubtitle}>Créez des playlists pour organiser vos musiques.</Text>
        </View>
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={s.grid}
          renderItem={({ item, index }) => {
            const col = COLORS[index % COLORS.length];
            const count = item.trackIds.filter(id => tracks.find(t => t.id === id)).length;
            return (
              <Pressable
                style={({ pressed }) => [s.card, pressed && { opacity: 0.8 }]}
                onPress={() => router.push({ pathname: '/playlist-detail', params: { id: item.id } })}
              >
                <View style={[s.cardTop, { backgroundColor: col + '22' }]}>
                  <MaterialIcons name="queue-music" size={44} color={col} />
                </View>
                <View style={s.cardBody}>
                  <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.cardCount}>{count} titre{count !== 1 ? 's' : ''}</Text>
                </View>
                <View style={s.cardActions}>
                  <TouchableOpacity style={s.actionBtn} onPress={() => handleDelete(item.id, item.name)}>
                    <MaterialIcons name="delete-outline" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <Modal visible={showCreate} transparent animationType="slide">
        <View style={s.modal}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Nouvelle playlist</Text>
            <TextInput
              style={s.input}
              placeholder="Nom de la playlist"
              placeholderTextColor={colors.textMuted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowCreate(false); setNewName(''); }}>
                <Text style={s.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={handleCreate}>
                <Text style={s.confirmText}>Créer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
