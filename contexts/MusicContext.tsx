// Powered by OnSpace.AI
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { Audio } from 'expo-av';
import { useAlert } from '@/template';

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
  size?: number;
  favorite?: boolean;
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
  volume: number;
  queue: Track[];
  addTrack: (track: Track) => void;
  addTracks: (tracks: Track[]) => void;
  removeTrack: (id: string) => void;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  toggleFavorite: (id: string) => void;
  playTrack: (track: Track, queue?: Track[]) => void;
  pauseTrack: () => void;
  resumeTrack: () => void;
  seekTo: (ms: number) => void;
  setVolume: (v: number) => void;
  nextTrack: (auto?: boolean) => void;
  prevTrack: () => void;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  createPlaylist: (name: string) => string;
  deletePlaylist: (id: string) => void;
  renamePlaylist: (id: string, name: string) => void;
  addToPlaylist: (playlistId: string, trackId: string) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  moveInPlaylist: (playlistId: string, from: number, to: number) => void;
  removeFromQueue: (trackId: string) => void;
  playNext: (track: Track) => void;
  addToQueue: (track: Track) => void;
  sleepTimerMinutes: number | null;
  sleepTimerEndsAt: number | null;
  setSleepTimer: (minutes: number | null) => void;
  setEffects: (effects: Partial<AudioEffects>) => void;
}

export const MusicContext = createContext<MusicContextType | undefined>(undefined);

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusic must be used within MusicProvider');
  return ctx;
}

const TRACKS_KEY = 'music_tracks_v2';
const PLAYLISTS_KEY = 'music_playlists_v2';
const SESSION_KEY = 'music_session_v1';

// What survives an app restart: the track that was playing, where it stood,
// the queue it was started from and the playback modes, so the user resumes
// exactly where they left off instead of from a cold library.
interface SessionState {
  trackId: string | null;
  queueIds: string[];
  position: number;
  shuffle: boolean;
  repeatMode: RepeatMode;
  speed: number;
  volume: number;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function MusicProvider({ children }: { children: ReactNode }) {
  const { showAlert } = useAlert();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState<Track[]>([]);
  const [effects, setEffectsState] = useState<AudioEffects>({ speed: 1 });
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
  const [volume, setVolumeState] = useState(1);
  const soundRef = useRef<Audio.Sound | null>(null);
  const positionInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  // Refs mirror every value read by the position-tracking interval. That
  // interval's closure is captured once per track and outlives re-renders, so
  // reading the state values directly would act on the snapshot from when the
  // track started (stale currentTrack/queue broke auto-advance entirely).
  const currentTrackRef = useRef<Track | null>(null);
  const queueRef = useRef<Track[]>([]);
  const shuffleRef = useRef(shuffle);
  const repeatModeRef = useRef(repeatMode);
  const effectsRef = useRef(effects);
  const volumeRef = useRef(volume);
  const positionRef = useRef(0);
  const lastSavedPositionRef = useRef(0);
  // Guards the 500 ms poll against firing nextTrack twice for one didJustFinish
  // while playTrack is still unloading the finished sound.
  const finishingRef = useRef(false);
  // False until loadData has run: the persist-effect below fires on mount and
  // would otherwise overwrite the saved session with an empty one before the
  // restore had a chance to read it.
  const initializedRef = useRef(false);
  // Sleep timer: the chosen duration (for UI checkmarks) and the wall-clock
  // instant it fires, plus the timeout handle itself.
  const sleepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerEndsAt, setSleepTimerEndsAt] = useState<number | null>(null);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { queueRef.current = queue; }, [queue]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });
    loadData();
    return () => {
      if (positionInterval.current) clearInterval(positionInterval.current);
      if (sleepTimeoutRef.current) clearTimeout(sleepTimeoutRef.current);
      soundRef.current?.unloadAsync();
    };
    // One-shot init: loadData must only ever run on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSession = () => {
    if (!initializedRef.current) return;
    const session: SessionState = {
      trackId: currentTrackRef.current?.id ?? null,
      queueIds: queueRef.current.map(t => t.id),
      position: positionRef.current,
      shuffle: shuffleRef.current,
      repeatMode: repeatModeRef.current,
      speed: effectsRef.current.speed,
      volume: volumeRef.current,
    };
    AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session)).catch(() => {});
  };

  // Session values other than the position change rarely: persist them as they
  // change, and persist the position on pause/background or every ~10 s of
  // playback (see the poll below) to keep AsyncStorage writes bounded.
  useEffect(() => { saveSession(); }, [currentTrack, queue, shuffle, repeatMode, effects, volume]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') saveSession();
    });
    return () => sub.remove();
  }, []);

  const restoreSession = async (session: SessionState, loadedTracks: Track[]) => {
    const track = loadedTracks.find(t => t.id === session.trackId);
    if (!track) return;
    const queueFromIds = (session.queueIds ?? [])
      .map(id => loadedTracks.find(t => t.id === id))
      .filter((t): t is Track => !!t);
    const restoredQueue = queueFromIds.length > 0 ? queueFromIds : [track];
    const speed = effectsRef.current.speed;
    try {
      const { sound, status } = await Audio.Sound.createAsync(
        { uri: track.uri },
        {
          shouldPlay: false,
          positionMillis: Math.max(0, session.position || 0),
          volume: volumeRef.current,
          rate: speed,
          shouldCorrectPitch: true,
          pitchCorrectionQuality: Audio.PitchCorrectionQuality.High,
        }
      );
      soundRef.current = sound;
      currentTrackRef.current = track;
      queueRef.current = restoredQueue;
      setCurrentTrack(track);
      setQueue(restoredQueue);
      if (status.isLoaded) {
        positionRef.current = status.positionMillis ?? 0;
        setPosition(status.positionMillis ?? 0);
        setDuration(status.durationMillis ?? 0);
        if (status.durationMillis && !track.duration) {
          updateTrack(track.id, { duration: status.durationMillis });
        }
      }
    } catch {
      // The saved file is gone (purged cache, moved origin) — start fresh
      // rather than restoring a track that can't play.
      currentTrackRef.current = null;
      queueRef.current = [];
      setCurrentTrack(null);
      setQueue([]);
    }
  };

  const loadData = async () => {
    try {
      const [tracksJson, playlistsJson, sessionJson] = await Promise.all([
        AsyncStorage.getItem(TRACKS_KEY),
        AsyncStorage.getItem(PLAYLISTS_KEY),
        AsyncStorage.getItem(SESSION_KEY),
      ]);
      const parsedTracks: Track[] = tracksJson ? JSON.parse(tracksJson) : [];
      const parsedPlaylists: Playlist[] = playlistsJson ? JSON.parse(playlistsJson) : [];
      setTracks(parsedTracks);
      setPlaylists(parsedPlaylists);
      if (sessionJson) {
        try {
          const session = JSON.parse(sessionJson) as SessionState;
          setShuffle(!!session.shuffle);
          shuffleRef.current = !!session.shuffle;
          if (session.repeatMode === 'off' || session.repeatMode === 'all' || session.repeatMode === 'one') {
            setRepeatMode(session.repeatMode);
            repeatModeRef.current = session.repeatMode;
          }
          if (typeof session.speed === 'number' && session.speed >= 0.25 && session.speed <= 2) {
            const restored = { speed: session.speed };
            setEffectsState(restored);
            effectsRef.current = restored;
          }
          if (typeof session.volume === 'number') {
            const v = clamp01(session.volume);
            setVolumeState(v);
            volumeRef.current = v;
          }
          if (session.trackId) await restoreSession(session, parsedTracks);
        } catch {
          // Corrupted session: ignore it, modes keep their defaults.
        }
      }
    } catch (e) {
      console.warn('Failed to load music data', e);
    } finally {
      initializedRef.current = true;
    }
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

  // Batched sibling of addTrack: importing several files at once should cost
  // one state update and one AsyncStorage write, not one per file — looping
  // addTrack over N files re-copies and re-persists the whole growing array
  // N times.
  const addTracks = (newTracks: Track[]) => {
    if (newTracks.length === 0) return;
    setTracks(prev => {
      const next = [...newTracks, ...prev];
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
    setQueue(prev => {
      const next = prev.filter(t => t.id !== id);
      queueRef.current = next;
      return next;
    });
    if (currentTrackRef.current?.id === id) {
      pauseTrack();
      currentTrackRef.current = null;
      setCurrentTrack(null);
    }
  };

  const updateTrack = (id: string, updates: Partial<Track>) => {
    setTracks(prev => {
      const next = prev.map(t => (t.id === id ? { ...t, ...updates } : t));
      saveTracks(next);
      return next;
    });
    if (currentTrackRef.current?.id === id) {
      const merged = currentTrackRef.current ? { ...currentTrackRef.current, ...updates } : null;
      currentTrackRef.current = merged;
      setCurrentTrack(merged);
    }
  };

  const toggleFavorite = (id: string) => {
    setTracks(prev => {
      const next = prev.map(t => (t.id === id ? { ...t, favorite: !t.favorite } : t));
      saveTracks(next);
      return next;
    });
    if (currentTrackRef.current?.id === id) {
      const merged = { ...currentTrackRef.current, favorite: !currentTrackRef.current.favorite };
      currentTrackRef.current = merged;
      setCurrentTrack(merged);
    }
  };

  const startPositionTracking = () => {
    if (positionInterval.current) clearInterval(positionInterval.current);
    positionInterval.current = setInterval(async () => {
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          setPosition(status.positionMillis);
          positionRef.current = status.positionMillis;
          setDuration(status.durationMillis ?? 0);
          // Import can't always know the duration (no tag): backfill it the
          // first time the track actually plays so lists can show it.
          const cur = currentTrackRef.current;
          if (cur && status.durationMillis && !cur.duration) {
            updateTrack(cur.id, { duration: status.durationMillis });
          }
          if (Math.abs(status.positionMillis - lastSavedPositionRef.current) > 10000) {
            lastSavedPositionRef.current = status.positionMillis;
            saveSession();
          }
          if (status.didJustFinish && !finishingRef.current) {
            finishingRef.current = true;
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
      currentTrackRef.current = track;
      setCurrentTrack(track);
      if (newQueue) {
        queueRef.current = newQueue;
        setQueue(newQueue);
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.uri },
        {
          shouldPlay: true,
          rate: effectsRef.current.speed,
          volume: volumeRef.current,
          shouldCorrectPitch: true,
          pitchCorrectionQuality: Audio.PitchCorrectionQuality.High,
        }
      );
      soundRef.current = sound;
      finishingRef.current = false;
      setIsPlaying(true);
      setPosition(0);
      positionRef.current = 0;
      lastSavedPositionRef.current = 0;
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        setDuration(status.durationMillis ?? 0);
        if (status.durationMillis && !track.duration) {
          updateTrack(track.id, { duration: status.durationMillis });
        }
      }
      startPositionTracking();
    } catch (e) {
      console.error('Error playing track', e);
      setIsPlaying(false);
      finishingRef.current = false;
      showAlert(
        'Lecture impossible',
        `Impossible de lire "${track.name}". Le fichier est peut-être corrompu ou dans un format non supporté.`
      );
    }
  };

  const pauseTrack = async () => {
    await soundRef.current?.pauseAsync();
    setIsPlaying(false);
    if (positionInterval.current) clearInterval(positionInterval.current);
    finishingRef.current = false;
    saveSession();
  };

  const resumeTrack = async () => {
    await soundRef.current?.playAsync();
    setIsPlaying(true);
    finishingRef.current = false;
    startPositionTracking();
  };

  const seekTo = async (ms: number) => {
    await soundRef.current?.setPositionAsync(ms);
    setPosition(ms);
    positionRef.current = ms;
  };

  const setVolume = (v: number) => {
    const clamped = clamp01(v);
    setVolumeState(clamped);
    volumeRef.current = clamped;
    soundRef.current?.setVolumeAsync(clamped).catch(() => {});
  };

  // `auto` distinguishes the natural end-of-track advance (which must honor
  // repeat mode) from a manual tap on the "next" control (which always moves
  // the queue forward, regardless of repeat mode).
  const nextTrack = (auto = false) => {
    const track = currentTrackRef.current;
    const q = queueRef.current;
    if (!track || q.length === 0) return;
    if (auto && repeatModeRef.current === 'one') {
      playTrack(track, q);
      return;
    }
    const idx = q.findIndex(t => t.id === track.id);
    if (shuffleRef.current && q.length > 1) {
      let randIdx = idx;
      while (randIdx === idx) randIdx = Math.floor(Math.random() * q.length);
      playTrack(q[randIdx], q);
      return;
    }
    const isLast = idx === q.length - 1;
    if (auto && isLast && repeatModeRef.current === 'off') {
      pauseTrack();
      return;
    }
    const next = q[(idx + 1) % q.length];
    if (next) playTrack(next, q);
  };

  const prevTrack = () => {
    const track = currentTrackRef.current;
    const q = queueRef.current;
    if (!track || q.length === 0) return;
    // Mirrors the convention of most music players: restart the current
    // track once you're a few seconds in, rather than always jumping back.
    if (positionRef.current > 3000) {
      seekTo(0);
      return;
    }
    const idx = q.findIndex(t => t.id === track.id);
    const prev = q[(idx - 1 + q.length) % q.length];
    if (prev) playTrack(prev, q);
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

  const moveInPlaylist = (playlistId: string, from: number, to: number) => {
    setPlaylists(prev => {
      const next = prev.map(p => {
        if (p.id !== playlistId) return p;
        if (from < 0 || from >= p.trackIds.length || to < 0 || to >= p.trackIds.length || from === to) return p;
        const ids = [...p.trackIds];
        const [moved] = ids.splice(from, 1);
        ids.splice(to, 0, moved);
        return { ...p, trackIds: ids };
      });
      savePlaylists(next);
      return next;
    });
  };

  const removeFromQueue = (trackId: string) => {
    setQueue(prev => {
      const next = prev.filter(t => t.id !== trackId);
      queueRef.current = next;
      return next;
    });
  };

  // Queue growth from the library: "play next" slots a track right after the
  // current one so it is what auto-advance picks; "add to queue" appends it.
  // A track already queued is not duplicated — removeFromQueue removes by id
  // and would drop every copy at once.
  const insertInQueue = (track: Track, afterCurrent: boolean) => {
    if (queueRef.current.some(t => t.id === track.id)) return;
    const cur = currentTrackRef.current;
    const curIdx = cur ? queueRef.current.findIndex(t => t.id === cur.id) : -1;
    const next = [...queueRef.current];
    next.splice(afterCurrent && curIdx >= 0 ? curIdx + 1 : next.length, 0, track);
    queueRef.current = next;
    setQueue(next);
  };

  const playNext = (track: Track) => insertInQueue(track, true);
  const addToQueue = (track: Track) => insertInQueue(track, false);

  const setSleepTimer = (minutes: number | null) => {
    if (sleepTimeoutRef.current) {
      clearTimeout(sleepTimeoutRef.current);
      sleepTimeoutRef.current = null;
    }
    setSleepTimerMinutes(minutes);
    if (minutes === null) {
      setSleepTimerEndsAt(null);
      return;
    }
    setSleepTimerEndsAt(Date.now() + minutes * 60_000);
    sleepTimeoutRef.current = setTimeout(() => {
      sleepTimeoutRef.current = null;
      setSleepTimerMinutes(null);
      setSleepTimerEndsAt(null);
      pauseTrack();
    }, minutes * 60_000);
  };

  const setEffects = async (newEffects: Partial<AudioEffects>) => {
    const updated = { ...effects, ...newEffects };
    setEffectsState(updated);
    effectsRef.current = updated;
    if (soundRef.current) {
      try {
        await soundRef.current.setRateAsync(updated.speed, true);
      } catch {}
    }
  };

  return (
    <MusicContext.Provider value={{
      tracks, playlists, currentTrack, isPlaying, position, duration, queue, effects,
      shuffle, repeatMode, volume,
      addTrack, addTracks, removeTrack, updateTrack, toggleFavorite,
      playTrack, pauseTrack, resumeTrack, seekTo, setVolume, nextTrack, prevTrack,
      toggleShuffle, cycleRepeatMode,
      createPlaylist, deletePlaylist, renamePlaylist, addToPlaylist, removeFromPlaylist,
      moveInPlaylist, removeFromQueue, playNext, addToQueue,
      sleepTimerMinutes, sleepTimerEndsAt, setSleepTimer,
      setEffects,
    }}>
      {children}
    </MusicContext.Provider>
  );
}
