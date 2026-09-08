// Powered by OnSpace.AI — Runtime platform detection (mobile / web / desktop)
import { Platform } from 'react-native';

/** Bridge injected by desktop/preload.js when running inside the Electron shell. */
export interface DesktopBridge {
  platform: 'linux' | 'darwin' | 'win32';
  appVersion: string;
  checkForUpdates: () => Promise<{ updateAvailable: boolean; version?: string; error?: string }>;
  downloadUpdate: () => Promise<{ ok: boolean; error?: string }>;
  /** Quits the app, replaces the installed build, then relaunches. */
  quitAndInstall: () => void;
  /** Turns automatic download + install-on-quit on or off. */
  setAutoUpdate: (enabled: boolean) => void;
  onUpdateEvent: (handler: (event: DesktopUpdateEvent) => void) => () => void;
  /** Opens an https URL in the user's real browser. */
  openExternal: (url: string) => Promise<{ ok: boolean }>;
  /** Fires with the full musiqueapp:// callback URL after a deep link. */
  onAuthCallback: (handler: (url: string) => void) => () => void;
}

export type DesktopUpdateEvent =
  | { type: 'checking' }
  | { type: 'available'; version: string; releaseNotes?: string }
  | { type: 'not-available'; version: string }
  | { type: 'progress'; percent: number; transferred: number; total: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string };

declare global {
  var musiqueDesktop: DesktopBridge | undefined;
}

function getBridge(): DesktopBridge | undefined {
  if (typeof globalThis === 'undefined') return undefined;
  return globalThis.musiqueDesktop;
}

/** True when the web bundle is running inside the Electron desktop shell. */
export const isDesktop = (): boolean => Platform.OS === 'web' && getBridge() !== undefined;

/** True on a plain browser (not the desktop shell). */
export const isBrowser = (): boolean => Platform.OS === 'web' && !isDesktop();

/** True on iOS or Android. */
export const isNative = (): boolean => Platform.OS === 'ios' || Platform.OS === 'android';

export const desktop = getBridge;
