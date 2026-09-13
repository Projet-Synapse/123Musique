// Powered by OnSpace.AI
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useMusic } from '@/contexts/MusicContext';

// Desktop convenience keys (web + Electron): Space toggles playback, ←/→ seek
// ±10 s, ↑/↓ nudge the volume. No-op on native platforms, and inert while
// typing in a text field.
export default function WebKeyboardShortcuts() {
  const {
    isPlaying, pauseTrack, resumeTrack, position, duration, seekTo,
    volume, setVolume, currentTrack,
  } = useMusic();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (!currentTrack) return;
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (isPlaying) pauseTrack();
          else resumeTrack();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (duration > 0) seekTo(Math.min(position + 10000, duration));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (position > 0 || duration > 0) seekTo(Math.max(position - 10000, 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.05));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.05));
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPlaying, pauseTrack, resumeTrack, position, duration, seekTo, volume, setVolume, currentTrack]);

  return null;
}
