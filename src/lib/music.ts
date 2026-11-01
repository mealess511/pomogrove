import type { MusicTrack, NeteasePlaylist } from '../types';
import { isAndroid } from './platform';
import {
  neteaseOuterUrl,
  normalizeNeteasePlaylist,
  parseNeteasePlaylistId,
} from './netease';

const DB_NAME = 'pomogrove.music';
const DB_VERSION = 1;
const META_STORE = 'meta';
const BLOB_STORE = 'blobs';
const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|webm)$/i;
const STREAM_TTL = 10 * 60_000;

export interface LocalAudioMeta {
  id: string;
  title: string;
  fileName: string;
  mime: string;
  size: number;
  durationMs: number;
  addedAt: number;
}

interface StoredBlob {
  id: string;
  blob: Blob;
}

const streamCache = new Map<number, { url: string; savedAt: number }>();

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('当前环境不支持本地音频存储。'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('无法打开本地音频仓库。'));
  });
}

function waitForTransaction(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('本地音频写入失败。'));
    tx.onabort = () => reject(tx.error ?? new Error('本地音频写入被取消。'));
  });
}

function probeDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    let settled = false;
    const finish = (duration: number | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      audio.removeAttribute('src');
      URL.revokeObjectURL(url);
      if (duration === null) reject(new Error('无法读取这个音频，请换一个文件。'));
      else resolve(duration);
    };
    const timer = window.setTimeout(() => finish(null), 10_000);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      finish(duration > 0 ? Math.round(duration * 1000) : 0);
    };
    audio.onerror = () => finish(null);
    audio.src = url;
  });
}

function inferMime(file: File): string {
  if (file.type) return file.type;
  if (/\.flac$/i.test(file.name)) return 'audio/flac';
  if (/\.m4a$/i.test(file.name)) return 'audio/mp4';
  if (/\.wav$/i.test(file.name)) return 'audio/wav';
  if (/\.ogg|\.oga$/i.test(file.name)) return 'audio/ogg';
  if (/\.opus$/i.test(file.name)) return 'audio/opus';
  return 'audio/mpeg';
}

export function isAudioFile(file: File): boolean {
  return file.type.startsWith('audio/') || AUDIO_EXT.test(file.name);
}

export function localMetaToTrack(meta: LocalAudioMeta): MusicTrack {
  return {
    id: meta.id,
    source: 'local',
    title: meta.title,
    artist: '本地文件',
    album: '',
    durationMs: meta.durationMs,
    coverUrl: null,
    blobId: meta.id,
    songId: null,
    playlistId: null,
  };
}

export async function listLocalAudio(): Promise<LocalAudioMeta[]> {
  const db = await openDatabase();
  try {
    return await new Promise<LocalAudioMeta[]>((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const request = tx.objectStore(META_STORE).getAll();
      request.onsuccess = () => {
        const rows = (request.result as LocalAudioMeta[]) ?? [];
        resolve(rows.sort((a, b) => a.addedAt - b.addedAt));
      };
      request.onerror = () =>
        reject(request.error ?? new Error('无法读取本地音频列表。'));
    });
  } finally {
    db.close();
  }
}

export async function saveLocalAudio(file: File): Promise<MusicTrack> {
  if (!isAudioFile(file)) {
    throw new Error(`不是支持的音频文件：${file.name}`);
  }
  if (file.size > 300 * 1024 * 1024) {
    throw new Error(`音频太大（上限 300 MB）：${file.name}`);
  }

  const existing = await listLocalAudio();
  if (existing.some((item) => item.fileName === file.name && item.size === file.size)) {
    throw new Error(`已经在音乐库里了：${file.name}`);
  }

  const durationMs = await probeDuration(file);
  const id = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const title = file.name.replace(AUDIO_EXT, '').trim() || file.name;
  const meta: LocalAudioMeta = {
    id,
    title,
    fileName: file.name,
    mime: inferMime(file),
    size: file.size,
    durationMs,
    addedAt: Date.now(),
  };

  const db = await openDatabase();
  try {
    const tx = db.transaction([META_STORE, BLOB_STORE], 'readwrite');
    tx.objectStore(META_STORE).put(meta);
    tx.objectStore(BLOB_STORE).put({ id, blob: file } satisfies StoredBlob);
    await waitForTransaction(tx);
  } finally {
    db.close();
  }

  return localMetaToTrack(meta);
}

export async function readLocalAudio(id: string): Promise<Blob | null> {
  const db = await openDatabase();
  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(BLOB_STORE, 'readonly');
      const request = tx.objectStore(BLOB_STORE).get(id);
      request.onsuccess = () => {
        const row = request.result as StoredBlob | undefined;
        resolve(row?.blob ?? null);
      };
      request.onerror = () =>
        reject(request.error ?? new Error('无法读取本地音频。'));
    });
  } finally {
    db.close();
  }
}

export async function removeLocalAudio(id: string): Promise<void> {
  const db = await openDatabase();
  try {
    const tx = db.transaction([META_STORE, BLOB_STORE], 'readwrite');
    tx.objectStore(META_STORE).delete(id);
    tx.objectStore(BLOB_STORE).delete(id);
    await waitForTransaction(tx);
  } finally {
    db.close();
  }
}

function headerValue(
  headers: Record<string, string> | undefined,
  name: string,
): string {
  if (!headers) return '';
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) return value;
  }
  return '';
}

const NETEASE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Referer: 'https://music.163.com/',
  Accept: 'application/json, text/plain, */*',
};

export async function fetchNeteasePlaylist(input: string): Promise<NeteasePlaylist> {
  const id = parseNeteasePlaylistId(input);
  if (!id) {
    throw new Error('没有认出歌单 ID，请粘贴歌单链接或一串数字。');
  }

  let payload: unknown;
  if (window.pomogrove?.neteasePlaylist) {
    payload = await window.pomogrove.neteasePlaylist(id);
  } else if (isAndroid) {
    const { CapacitorHttp } = await import('@capacitor/core');
    const response = await CapacitorHttp.get({
      url: `https://music.163.com/api/v6/playlist/detail?id=${id}&n=1000`,
      headers: NETEASE_HEADERS,
      connectTimeout: 15_000,
      readTimeout: 30_000,
    });
    payload =
      typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
  } else {
    // Browser builds are blocked by NetEase's CORS policy. Android uses the
    // native HTTP bridge and Windows uses the Electron main process instead.
    throw new Error('浏览器版无法直接读取网易云歌单，请使用 Windows 或 Android 客户端。');
  }

  return normalizeNeteasePlaylist(payload);
}

export async function resolveNeteaseStream(songId: number): Promise<string> {
  const cached = streamCache.get(songId);
  if (cached && Date.now() - cached.savedAt < STREAM_TTL) return cached.url;

  const fallback = neteaseOuterUrl(songId);
  let resolved: string | null = null;

  if (window.pomogrove?.neteaseStream) {
    resolved = await window.pomogrove.neteaseStream(songId);
  } else if (isAndroid) {
    try {
      const { CapacitorHttp } = await import('@capacitor/core');
      let current = fallback;
      for (let hop = 0; hop < 5; hop += 1) {
        const response = await CapacitorHttp.request({
          url: current,
          method: 'HEAD',
          headers: NETEASE_HEADERS,
          disableRedirects: true,
          connectTimeout: 12_000,
          readTimeout: 12_000,
        });
        const location = headerValue(response.headers, 'location');
        if (response.status >= 300 && response.status < 400 && location) {
          current = new URL(location, current).toString();
          if (current.startsWith('http:')) {
            current = `https://${current.slice(7)}`;
          }
          continue;
        }
        const contentType = headerValue(response.headers, 'content-type');
        if (
          response.status >= 200 &&
          response.status < 400 &&
          (contentType.includes('audio') ||
            /\.(mp3|m4a|flac|aac|ogg)(\?|$)/i.test(current))
        ) {
          resolved = current;
        }
        break;
      }
    } catch {
      resolved = fallback;
    }
  } else {
    resolved = fallback;
  }

  if (!resolved) {
    throw new Error('这首暂时无法播放，可能需要会员或已下架。');
  }

  const secureUrl = resolved.replace(/^http:/, 'https:');
  streamCache.set(songId, { url: secureUrl, savedAt: Date.now() });
  return secureUrl;
}

export function formatTrackTime(ms: number): string {
  if (!ms || !Number.isFinite(ms)) return '--:--';
  const total = Math.max(0, Math.round(ms / 1000));
  const seconds = total % 60;
  return `${Math.floor(total / 60)}:${String(seconds).padStart(2, '0')}`;
}
