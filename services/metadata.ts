// Powered by OnSpace.AI
// Reads what the import flow needs to fill a Track: playback duration (from
// the audio engine, works for every format) and ID3v2 tags (title, artist,
// album, year, embedded artwork — MP3 only). Everything degrades silently:
// any failure returns partial or empty metadata and the caller falls back to
// the file name.
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export interface TrackMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  artworkUri?: string;
  duration?: number;
}

// ID3v2 artwork can be large; reading (and later persisting) a bounded head
// of the file keeps imports fast and AsyncStorage small.
const HEAD_LIMIT = 512 * 1024;
// Data URIs live inside AsyncStorage via Track.artworkUri — refuse art that
// would bloat every library write.
const ARTWORK_MAX_CHARS = 700_000;

async function readDuration(uri: string): Promise<number | undefined> {
  try {
    const { sound, status } = await Audio.Sound.createAsync({ uri }, { shouldPlay: false });
    let d = status.isLoaded ? status.durationMillis : undefined;
    if (d === undefined) {
      const st = await sound.getStatusAsync();
      if (st.isLoaded) d = st.durationMillis ?? undefined;
    }
    await sound.unloadAsync();
    return d;
  } catch {
    return undefined;
  }
}

async function readHeadBytes(uri: string): Promise<Uint8Array | null> {
  try {
    if (Platform.OS === 'web') {
      // expo-document-picker on web hands back blob:/data: URIs, both fetchable.
      if (!uri.startsWith('blob:') && !uri.startsWith('data:')) return null;
      const blob = await fetch(uri).then(r => r.blob());
      const buf = await blob.slice(0, HEAD_LIMIT).arrayBuffer();
      return new Uint8Array(buf);
    }
    if (!uri.startsWith('file:')) return null;
    const b64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
      position: 0,
      length: HEAD_LIMIT,
    });
    return base64ToBytes(b64);
  } catch {
    return null;
  }
}

interface Id3Tags {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  artwork?: { mime: string; data: Uint8Array };
}

const isAsciiPrint = (b: number) => b >= 0x20 && b <= 0x7e;
const be32 = (b: Uint8Array, i: number) => (b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3];
const be24 = (b: Uint8Array, i: number) => (b[i] << 16) | (b[i + 1] << 8) | b[i + 2];
const syncsafe = (b: Uint8Array, i: number) => (b[i] << 21) | (b[i + 1] << 14) | (b[i + 2] << 7) | b[i + 3];

function parseId3(bytes: Uint8Array): Id3Tags | null {
  if (bytes.length < 10) return null;
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return null; // "ID3"
  const major = bytes[3];
  if (major !== 2 && major !== 3 && major !== 4) return null;
  const flags = bytes[5];
  const tagSize = syncsafe(bytes, 6);
  const available = Math.min(tagSize, bytes.length - 10);
  let pos = 10;
  if (flags & 0x40) {
    // Extended header: skip it (rare in practice, size rules differ per version).
    if (major === 4) pos += syncsafe(bytes, pos);
    else pos += be32(bytes, pos) + 4;
    if (pos < 10 || pos >= bytes.length) return null;
  }
  const tags: Id3Tags = {};
  const idLen = major === 2 ? 3 : 4;
  while (pos + idLen + (major === 2 ? 3 : 6) <= 10 + available) {
    let id = '';
    for (let k = 0; k < idLen; k++) id += String.fromCharCode(bytes[pos + k]);
    if (![...id].every(c => isAsciiPrint(c.charCodeAt(0)))) break; // padding reached
    let size: number;
    let headerLen: number;
    if (major === 2) {
      size = be24(bytes, pos + 3);
      headerLen = 6;
    } else {
      size = major === 4 ? syncsafe(bytes, pos + 4) : be32(bytes, pos + 4);
      headerLen = 10;
    }
    if (size <= 0 || pos + headerLen + size > bytes.length) break; // truncated frame
    const content = bytes.subarray(pos + headerLen, pos + headerLen + size);
    applyFrame(tags, id, content);
    pos += headerLen + size;
  }
  return tags;
}

function applyFrame(tags: Id3Tags, id: string, content: Uint8Array) {
  const textIds: Record<string, keyof Id3Tags> = {
    TIT2: 'title', TT2: 'title',
    TPE1: 'artist', TP1: 'artist',
    TALB: 'album', TAL: 'album',
    TDRC: 'year', TYER: 'year', TYE: 'year',
  };
  if (textIds[id]) {
    const key = textIds[id] as 'title' | 'artist' | 'album' | 'year';
    const value = decodeTextFrame(content);
    if (value && !tags[key]) tags[key] = value;
    return;
  }
  if ((id === 'APIC' || id === 'PIC') && !tags.artwork) {
    tags.artwork = parseArtwork(content, id === 'PIC');
  }
}

function decodeTextFrame(content: Uint8Array): string | undefined {
  if (content.length < 1) return undefined;
  const encoding = content[0];
  const body = content.subarray(1);
  let text = decodeString(body, encoding);
  // v2.4 allows several NUL-separated values — keep only the first.
  const nul = text.indexOf('\u0000');
  if (nul >= 0) text = text.slice(0, nul);
  text = text.replace(/\u0000+$/g, '').trim();
  return text || undefined;
}

// Encoding byte convention of ID3v2 text frames.
function decodeString(b: Uint8Array, encoding: number): string {
  let out = '';
  if (encoding === 1) {
    // UTF-16 with BOM (default to LE when absent).
    let be = false;
    let start = 0;
    if (b.length >= 2 && b[0] === 0xfe && b[1] === 0xff) { be = true; start = 2; }
    else if (b.length >= 2 && b[0] === 0xff && b[1] === 0xfe) { start = 2; }
    for (let i = start; i + 1 < b.length; i += 2) {
      out += String.fromCharCode(be ? (b[i] << 8) | b[i + 1] : (b[i + 1] << 8) | b[i]);
    }
  } else if (encoding === 2) {
    // UTF-16BE without BOM.
    for (let i = 0; i + 1 < b.length; i += 2) {
      out += String.fromCharCode((b[i] << 8) | b[i + 1]);
    }
  } else if (encoding === 3) {
    const start = b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf ? 3 : 0;
    out = utf8Decode(b.subarray(start));
  } else {
    for (let i = 0; i < b.length; i++) out += String.fromCharCode(b[i]);
  }
  return out;
}

// Hermes has no TextDecoder: decode UTF-8 by hand.
function utf8Decode(b: Uint8Array): string {
  let out = '';
  for (let i = 0; i < b.length;) {
    const c = b[i];
    if (c < 0x80) { out += String.fromCharCode(c); i += 1; }
    else if (c < 0xc0) { i += 1; } // stray continuation byte, skip
    else if (c < 0xe0 && i + 1 < b.length) {
      out += String.fromCharCode(((c & 0x1f) << 6) | (b[i + 1] & 0x3f)); i += 2;
    } else if (c < 0xf0 && i + 2 < b.length) {
      out += String.fromCharCode(((c & 0x0f) << 12) | ((b[i + 1] & 0x3f) << 6) | (b[i + 2] & 0x3f)); i += 3;
    } else if (i + 3 < b.length) {
      const cp = ((c & 0x07) << 18) | ((b[i + 1] & 0x3f) << 12) | ((b[i + 2] & 0x3f) << 6) | (b[i + 3] & 0x3f);
      out += String.fromCodePoint(cp); i += 4;
    } else { i += 1; }
  }
  return out;
}

function parseArtwork(content: Uint8Array, v22: boolean): { mime: string; data: Uint8Array } | undefined {
  try {
    const encoding = content[0];
    let i = 1;
    let mime = '';
    if (v22) {
      mime = String.fromCharCode(content[1], content[2], content[3]);
      i = 4;
    } else {
      while (i < content.length && content[i] !== 0x00) { mime += String.fromCharCode(content[i]); i += 1; }
      i += 1; // terminate mime
    }
    i += 1; // picture type
    // Description terminator is 0x00 0x00 for the UTF-16 encodings.
    if (encoding === 1 || encoding === 2) {
      while (i + 1 < content.length && !(content[i] === 0x00 && content[i + 1] === 0x00)) i += 2;
      i += 2;
    } else {
      while (i < content.length && content[i] !== 0x00) i += 1;
      i += 1;
    }
    const data = content.subarray(i);
    if (data.length < 100) return undefined;
    const normalizedMime = mime.startsWith('image/') ? mime : (mime.toUpperCase() === 'PNG' ? 'image/png' : 'image/jpeg');
    return { mime: normalizedMime, data };
  } catch {
    return undefined;
  }
}

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64_ALPHABET[b0 >> 2];
    out += B64_ALPHABET[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < bytes.length ? B64_ALPHABET[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    out += i + 2 < bytes.length ? B64_ALPHABET[b2 & 63] : '=';
  }
  return out;
}

const B64_LOOKUP: Record<string, number> = {};
for (let i = 0; i < B64_ALPHABET.length; i++) B64_LOOKUP[B64_ALPHABET[i]] = i;

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array(Math.floor(clean.length * 3 / 4));
  let out = 0;
  for (let i = 0; i + 3 < clean.length; i += 4) {
    const n = (B64_LOOKUP[clean[i]] << 18) | (B64_LOOKUP[clean[i + 1]] << 12)
      | (B64_LOOKUP[clean[i + 2]] << 6) | B64_LOOKUP[clean[i + 3]];
    bytes[out++] = (n >> 16) & 0xff;
    bytes[out++] = (n >> 8) & 0xff;
    bytes[out++] = n & 0xff;
  }
  return bytes.subarray(0, out);
}

export async function readTrackMetadata(uri: string): Promise<TrackMetadata> {
  const [duration, head] = await Promise.all([readDuration(uri), readHeadBytes(uri)]);
  const tags = head ? parseId3(head) : null;
  const yearMatch = tags?.year?.match(/\d{4}/);
  let artworkUri: string | undefined;
  if (tags?.artwork) {
    const dataUri = `data:${tags.artwork.mime};base64,${bytesToBase64(tags.artwork.data)}`;
    if (dataUri.length <= ARTWORK_MAX_CHARS) artworkUri = dataUri;
  }
  return {
    title: tags?.title,
    artist: tags?.artist,
    album: tags?.album,
    year: yearMatch ? yearMatch[0] : undefined,
    artworkUri,
    duration,
  };
}
