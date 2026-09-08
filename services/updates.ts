// Powered by OnSpace.AI — Cross-platform update tracker
//
//   desktop  electron-updater downloads the new installer from GitHub
//            Releases, then replaces the installed build and relaunches.
//   web      nothing to install — a reload picks up the new deployment.
//
// On desktop electron-updater is authoritative: it reads the same GitHub feed
// the installer will download from. On mobile and in the browser the public
// GitHub releases API of this repository tells whether a newer build exists.
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import semver from 'semver';
import { desktop, isDesktop, DesktopUpdateEvent } from '@/services/platform';
import { RELEASES_URL } from '@/constants/config';

/** GitHub REST endpoint serving the newest published release. */
const GITHUB_LATEST_API = RELEASES_URL.replace('github.com', 'api.github.com/repos');

export type UpdateStage =
  'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'ready' | 'error';

export interface UpdateState {
  stage: UpdateStage;
  currentVersion: string;
  latestVersion?: string;
  releaseNotes?: string;
  downloadUrl?: string;
  mandatory: boolean;
  /** 0–100 while downloading, undefined otherwise. */
  progress?: number;
  error?: string;
  /** True when this platform can install the update by itself. */
  canSelfInstall: boolean;
}

/** The version this build reports — desktop bridge, then app.json. */
export function getCurrentVersion(): string {
  const bridge = desktop();
  if (bridge?.appVersion && bridge.appVersion !== '0.0.0') return bridge.appVersion;
  return Constants.expoConfig?.version ?? '0.0.0';
}

function normalise(version: string): string | null {
  return semver.valid(semver.coerce(version));
}

/** True when `candidate` is strictly newer than `current`. */
export function isNewer(candidate: string, current: string): boolean {
  const a = normalise(candidate);
  const b = normalise(current);
  if (!a || !b) return false;
  return semver.gt(a, b);
}

interface GithubRelease {
  tag_name?: string;
  body?: string | null;
}

/** Reads the newest published release from the repository's GitHub feed. */
async function fetchLatestRelease(): Promise<GithubRelease | null> {
  try {
    const response = await fetch(GITHUB_LATEST_API, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!response.ok) return null;
    return (await response.json()) as GithubRelease;
  } catch {
    return null;
  }
}

export function initialState(): UpdateState {
  return {
    stage: 'idle',
    currentVersion: getCurrentVersion(),
    mandatory: false,
    canSelfInstall: isDesktop(),
  };
}

/**
 * Asks the active mechanism whether a newer build exists.
 * Never throws — failures surface as `stage: 'error'` so the UI can retry.
 */
export async function checkForUpdate(): Promise<UpdateState> {
  const base: UpdateState = { ...initialState(), stage: 'checking' };

  try {
    if (isDesktop()) return await checkDesktop(base);
    return await checkRemote(base);
  } catch (error) {
    return {
      ...base,
      stage: 'error',
      error: error instanceof Error ? error.message : 'Vérification impossible',
    };
  }
}

async function checkDesktop(base: UpdateState): Promise<UpdateState> {
  const bridge = desktop();
  if (!bridge) return { ...base, stage: 'error', error: 'Pont desktop indisponible' };

  const result = await bridge.checkForUpdates();
  if (result.error) {
    return { ...base, stage: 'error', error: result.error };
  }

  // electron-updater is authoritative here; a reported version that is not
  // newer (e.g. a pre-release tag) counts as up to date.
  const version = result.version;
  if (!result.updateAvailable || !version || !isNewer(version, base.currentVersion)) {
    return { ...base, stage: 'up-to-date' };
  }
  return { ...base, latestVersion: version, stage: 'available' };
}

/** Mobile and browser fallback: no self-install, point at the release page. */
async function checkRemote(base: UpdateState): Promise<UpdateState> {
  const release = await fetchLatestRelease();
  const version = release?.tag_name;
  if (!version || !isNewer(version, base.currentVersion)) {
    return { ...base, stage: 'up-to-date' };
  }
  return {
    ...base,
    latestVersion: normalise(version) ?? undefined,
    releaseNotes: release?.body ?? undefined,
    downloadUrl: RELEASES_URL,
    stage: 'available',
  };
}

/**
 * Downloads the pending update. Resolves once the payload is on disk and
 * `installUpdate()` can be called; on web there is nothing to download.
 */
export async function downloadUpdate(): Promise<{ ok: boolean; error?: string }> {
  if (isDesktop()) {
    const bridge = desktop();
    if (!bridge) return { ok: false, error: 'Pont desktop indisponible' };
    return bridge.downloadUpdate();
  }

  // Mobile and browser have nothing to download locally — the update happens
  // through the app stores or a page reload of the new deployment.
  return { ok: true };
}

/**
 * Applies the downloaded update.
 *
 * On desktop this quits the app, lets the installer replace the currently
 * installed version, and relaunches it — the app will not return from here.
 * On web it reloads the page so the new deployment is picked up.
 */
export async function installUpdate(): Promise<void> {
  if (isDesktop()) {
    desktop()?.quitAndInstall();
    return;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.reload();
  }
}

/** Subscribes to desktop download/install progress. No-op elsewhere. */
export function subscribeToDesktopEvents(handler: (event: DesktopUpdateEvent) => void): () => void {
  const bridge = desktop();
  if (!bridge) return () => {};
  return bridge.onUpdateEvent(handler);
}
