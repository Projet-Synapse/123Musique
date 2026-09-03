// Powered by OnSpace.AI
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useMusic } from '@/contexts/MusicContext';
import { useAlert } from '@/template';
import { spacing, radius, fontSize } from '@/constants/theme';

export default function EditTrackScreen() {
  const { colors, accent } = useTheme();
  const { tracks, updateTrack, playlists, addToPlaylist, removeFromPlaylist } = useMusic();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const track = tracks.find(t => t.id === id);
  const [name, setName] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [year, setYear] = useState('');
  const [description, setDescription] = useState('');
  const [artworkUri, setArtworkUri] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (track) {
      setName(track.name);
      setArtist(track.artist);
      setAlbum(track.album);
      setYear(track.year);
      setDescription(track.description);
      setArtworkUri(track.artworkUri);
    }
  }, [track]);

  if (!track) {
    router.back();
    return null;
  }

  const pickArtwork = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setArtworkUri(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      showAlert('Erreur', 'Le titre ne peut pas être vide.');
      return;
    }
    updateTrack(id, { name: name.trim(), artist: artist.trim(), album: album.trim(), year: year.trim(), description: description.trim(), artworkUri });
    showAlert('Sauvegardé', 'Les informations ont été mises à jour.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.md,
      paddingBottom: spacing.md, backgroundColor: colors.surface,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
    saveBtn: {
      paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
      backgroundColor: accent, borderRadius: radius.full,
    },
    saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: fontSize.sm },
    content: { padding: spacing.md, paddingBottom: 60 },
    artworkBtn: {
      width: 120, height: 120, borderRadius: radius.lg,
      backgroundColor: colors.surfaceElevated, alignSelf: 'center',
      alignItems: 'center', justifyContent: 'center',
      marginBottom: spacing.xl, overflow: 'hidden',
      borderWidth: 2, borderColor: colors.border,
    },
    artwork: { width: 120, height: 120 },
    artworkOverlay: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', padding: 6, alignItems: 'center',
    },
    artworkOverlayText: { color: '#FFF', fontSize: fontSize.xs, fontWeight: '600' },
    field: { marginBottom: spacing.md },
    label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
    input: {
      backgroundColor: colors.surface, borderRadius: radius.md,
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      color: colors.text, fontSize: fontSize.md,
      borderWidth: 1, borderColor: colors.border,
    },
    inputMulti: { minHeight: 80, textAlignVertical: 'top' },
    sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.sm, marginTop: spacing.md },
    playlistRow: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    playlistName: { flex: 1, fontSize: fontSize.md, color: colors.text },
  });

  // Kept outside StyleSheet.create: a function value mixed into that call collapses
  // TypeScript's inference for every other style key in the same object.
  const checkboxStyle = (checked: boolean): ViewStyle => ({
    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
    borderColor: checked ? accent : colors.border,
    backgroundColor: checked ? accent : 'transparent',
    alignItems: 'center', justifyContent: 'center',
  });

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={() => router.back()}>
          <MaterialIcons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Modifier</Text>
        <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
          <Text style={s.saveBtnText}>Sauvegarder</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={s.artworkBtn} onPress={pickArtwork}>
          {artworkUri ? (
            <>
              <Image source={{ uri: artworkUri }} style={s.artwork} contentFit="cover" />
              <View style={s.artworkOverlay}>
                <Text style={s.artworkOverlayText}>Changer</Text>
              </View>
            </>
          ) : (
            <>
              <MaterialIcons name="add-photo-alternate" size={40} color={accent} />
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 4 }}>Pochette</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={s.field}>
          <Text style={s.label}>TITRE</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholderTextColor={colors.textMuted} />
        </View>
        <View style={s.field}>
          <Text style={s.label}>ARTISTE</Text>
          <TextInput style={s.input} value={artist} onChangeText={setArtist} placeholderTextColor={colors.textMuted} />
        </View>
        <View style={s.field}>
          <Text style={s.label}>ALBUM</Text>
          <TextInput style={s.input} value={album} onChangeText={setAlbum} placeholderTextColor={colors.textMuted} />
        </View>
        <View style={s.field}>
          <Text style={s.label}>ANNÉE</Text>
          <TextInput style={s.input} value={year} onChangeText={setYear} keyboardType="numeric" placeholderTextColor={colors.textMuted} placeholder="Ex: 2024" />
        </View>
        <View style={s.field}>
          <Text style={s.label}>DESCRIPTION</Text>
          <TextInput
            style={[s.input, s.inputMulti]} value={description} onChangeText={setDescription}
            multiline placeholderTextColor={colors.textMuted} placeholder="Notes ou description..."
          />
        </View>

        {playlists.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Playlists</Text>
            {playlists.map(p => {
              const inPl = p.trackIds.includes(id);
              return (
                <TouchableOpacity
                  key={p.id}
                  style={s.playlistRow}
                  onPress={() => inPl ? removeFromPlaylist(p.id, id) : addToPlaylist(p.id, id)}
                >
                  <Text style={s.playlistName}>{p.name}</Text>
                  <View style={checkboxStyle(inPl)}>
                    {inPl && <MaterialIcons name="check" size={14} color="#FFF" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
