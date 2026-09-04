// Powered by OnSpace.AI
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';

export interface Track {
  id: string;
  uri: string;
  name: string;
  artist: string;
  album: string;
  year: string;
  description: string;
  artworkUri?: string;
  duration?: number;
  dateAdded: number;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
}

export interface AudioEffects {
  speed: number;
  pitch: number;
  reverb: number;
}

export type RepeatMode = 'off' | 'all' | 'one';

interface MusicContextType {
  tracks: Track[];
  playlists: Playlist[];
  currentTrack: Track | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  effects: AudioEffects;
  shuffle: boolean;
  repeatMode: RepeatMode;
  addTrack: (track: Track) => void;
  removeTrack: (id: string) => void;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  playTrack: (track: Track, queue?: Track[]) => void;
  pauseTrack: () => void;
  resumeTrack: () => void;
  seekTo: (ms: number) => void;
  nextTrack: (auto?: boolean) => void;
  prevTrack: () => void;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  createPlaylist: (name: string) => string;
  deletePlaylist: (id: string) => void;
  renamePlaylist: (id: string, name: string) => void;
  addToPlaylist: (playlistId: string, trackId: string) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  setEffects: (effects: Partial<AudioEffects>) => void;
  queue: Track[];
}

export const MusicContext = createContext<MusicContextType | undefined>(undefined);

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusic must be used within MusicProvider');
  return ctx;
}

const TRACKS_KEY = 'music_tracks_v2';
const PLAYLISTS_KEY = 'music_playlists_v2';

export function MusicProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState<Track[]>([]);
  const [effects, setEffectsState] = useState<AudioEffects>({ speed: 1, pitch: 0, reverb: 0 });
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
  const soundRef = useRef<Audio.Sound | null>(null);
  const positionInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  // Refs mirror shuffle/repeatMode so the position-tracking interval — whose
  // closure is captured once per track and outlives re-renders — always acts
  // on the latest mode instead of the one active when the track started.
  const shuffleRef = useRef(shuffle);
  const repeatModeRef = useRef(repeatMode);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });
    loadData();
    return () => {
      if (positionInterval.current) clearInterval(positionInterval.current);
      soundRef.current?.unloadAsync();
    };
  }, []);

  const loadData = async () => {
    const [tracksJson, playlistsJson] = await Promise.all([
      AsyncStorage.getItem(TRACKS_KEY),
      AsyncStorage.getItem(PLAYLISTS_KEY),
    ]);
    if (tracksJson) setTracks(JSON.parse(tracksJson));
    if (playlistsJson) setPlaylists(JSON.parse(playlistsJson));
  };

  const saveTracks = (t: Track[]) => AsyncStorage.setItem(TRACKS_KEY, JSON.stringify(t));
  const savePlaylists = (p: Playlist[]) => AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(p));

  const addTrack = (track: Track) => {
    setTracks(prev => {
      const next = [track, ...prev];
      saveTracks(next);
      return next;
    });
  };

  const removeTrack = (id: string) => {
    setTracks(prev => {
      const next = prev.filter(t => t.id !== id);
      saveTracks(next);
      return next;
    });
    setPlaylists(prev => {
      const next = prev.map(p => ({ ...p, trackIds: p.trackIds.filter(tid => tid !== id) }));
      savePlaylists(next);
      return next;
    });
    if (currentTrack?.id === id) {
      pauseTrack();
      setCurrentTrack(null);
    }
  };

  const updateTrack = (id: string, updates: Partial<Track>) => {
    setTracks(prev => {
      const next = prev.map(t => (t.id === id ? { ...t, ...updates } : t));
      saveTracks(next);
      return next;
    });
    if (currentTrack?.id === id) {
      setCurrentTrack(prev => (prev ? { ...prev, ...updates } : prev));
    }
  };

  const startPositionTracking = () => {
    if (positionInterval.current) clearInterval(positionInterval.current);
    positionInterval.current = setInterval(async () => {
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          setPosition(status.positionMillis);
          setDuration(status.durationMillis ?? 0);
          if (status.didJustFinish) {
            nextTrack(true);
          }
        }
      }
    }, 500);
  };

  const playTrack = async (track: Track, newQueue?: Track[]) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      if (positionInterval.current) clearInterval(positionInterval.current);
      setCurrentTrack(track);
      if (newQueue) setQueue(newQueue);
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.uri },
        { shouldPlay: true, rate: effects.speed, pitchCorrectionQuality: Audio.PitchCorrectionQuality.High }
      );
      soundRef.current = sound;
      setIsPlaying(true);
      setPosition(0);
      const status = await sound.getStatusAsync();
      if (status.isLoaded) setDuration(status.durationMillis ?? 0);
      startPositionTracking();
    } catch (e) {
      console.error('Error playing track', e);
      setIsPlaying(false);
      Alert.alert('Lecture impossible', `Impossible de lire "${track.name}". Le fichier est peut-être corrompu ou dans un format non supporté.`);
    }
  };

  const pauseTrack = async () => {
    await soundRef.current?.pauseAsync();
    setIsPlaying(false);
    if (positionInterval.current) clearInterval(positionInterval.current);
  };

  const resumeTrack = async () => {
    await soundRef.current?.playAsync();
    setIsPlaying(true);
    startPositionTracking();
  };

  const seekTo = async (ms: number) => {
    await soundRef.current?.setPositionAsync(ms);
    setPosition(ms);
  };

  // `auto` distinguishes the natural end-of-track advance (which must honor
  // repeat mode) from a manual tap on the "next" control (which always moves
  // the queue forward, regardless of repeat mode).
  const nextTrack = (auto = false) => {
    if (!currentTrack || queue.length === 0) return;
    if (auto && repeatModeRef.current === 'one') {
      playTrack(currentTrack, queue);
      return;
    }
    const idx = queue.findIndex(t => t.id === currentTrack.id);
    if (shuffleRef.current && queue.length > 1) {
      let randIdx = idx;
      while (randIdx === idx) randIdx = Math.floor(Math.random() * queue.length);
      playTrack(queue[randIdx], queue);
      return;
    }
    const isLast = idx === queue.length - 1;
    if (auto && isLast && repeatModeRef.current === 'off') {
      pauseTrack();
      return;
    }
    const next = queue[(idx + 1) % queue.length];
    if (next) playTrack(next, queue);
  };

  const prevTrack = () => {
    if (!currentTrack || queue.length === 0) return;
    // Mirrors the convention of most music players: restart the current
    // track once you're a few seconds in, rather than always jumping back.
    if (position > 3000) {
      seekTo(0);
      return;
    }
    const idx = queue.findIndex(t => t.id === currentTrack.id);
    const prev = queue[(idx - 1 + queue.length) % queue.length];
    if (prev) playTrack(prev, queue);
  };

  const toggleShuffle = () => setShuffle(s => !s);
  const cycleRepeatMode = () => setRepeatMode(m => (m === 'off' ? 'all' : m === 'all' ? 'one' : 'off'));

  const createPlaylist = (name: string) => {
    const p: Playlist = { id: Date.now().toString(), name, trackIds: [], createdAt: Date.now() };
    setPlaylists(prev => {
      const next = [...prev, p];
      savePlaylists(next);
      return next;
    });
    return p.id;
  };

  const deletePlaylist = (id: string) => {
    setPlaylists(prev => {
      const next = prev.filter(p => p.id !== id);
      savePlaylists(next);
      return next;
    });
  };

  const renamePlaylist = (id: string, name: string) => {
    setPlaylists(prev => {
      const next = prev.map(p => (p.id === id ? { ...p, name } : p));
      savePlaylists(next);
      return next;
    });
  };

  const addToPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists(prev => {
      const next = prev.map(p =>
        p.id === playlistId && !p.trackIds.includes(trackId)
          ? { ...p, trackIds: [...p.trackIds, trackId] }
          : p
      );
      savePlaylists(next);
      return next;
    });
  };

  const removeFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists(prev => {
      const next = prev.map(p =>
        p.id === playlistId ? { ...p, trackIds: p.trackIds.filter(id => id !== trackId) } : p
      );
      savePlaylists(next);
      return next;
    });
  };

  const setEffects = async (newEffects: Partial<AudioEffects>) => {
    const updated = { ...effects, ...newEffects };
    setEffectsState(updated);
    if (soundRef.current) {
      try {
        await soundRef.current.setRateAsync(updated.speed, true);
      } catch (_) {}
    }
  };

  return (
    <MusicContext.Provider value={{
      tracks, playlists, currentTrack, isPlaying, position, duration, queue, effects,
      shuffle, repeatMode,
      addTrack, removeTrack, updateTrack,
      playTrack, pauseTrack, resumeTrack, seekTo, nextTrack, prevTrack,
      toggleShuffle, cycleRepeatMode,
      createPlaylist, deletePlaylist, renamePlaylist, addToPlaylist, removeFromPlaylist,
      setEffects,
    }}>
      {children}
    </MusicContext.Provider>
  );
}
