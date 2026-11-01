import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MusicTrack, RepeatMode } from '../types';
import {
  fetchNeteasePlaylist,
  listLocalAudio,
  localMetaToTrack,
  readLocalAudio,
  removeLocalAudio,
  resolveNeteaseStream,
  saveLocalAudio,
} from '../lib/music';

export interface MusicStore {
  tracks: MusicTrack[];
  currentId: string | null;
  playing: boolean;
  loading: boolean;
  importing: boolean;
  progressMs: number;
  durationMs: number;
  volume: number;
  repeat: RepeatMode;
  shuffle: boolean;
  error: string | null;
  playlistName: string | null;
  playlistCover: string | null;
  hydrated: boolean;

  hydrateLocal: () => Promise<void>;
  importLocalFiles: (files: File[]) => Promise<{ added: number; skipped: number }>;
  importPlaylist: (input: string) => Promise<boolean>;
  removeTrack: (id: string) => Promise<void>;
  clearNetease: () => void;
  playTrack: (id: string) => Promise<void>;
  toggle: () => void;
  next: (auto?: boolean) => void;
  prev: () => void;
  seek: (ms: number) => void;
  setVolume: (value: number) => void;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  clearError: () => void;
}

let audio: HTMLAudioElement | null = null;
let objectUrl: string | null = null;
let playToken = 0;
let hydrating = false;

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : '音乐操作失败，请稍后再试。';
}

function stopElement(): void {
  if (!audio) return;
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
}

function updateMediaSession(track: MusicTrack): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  const cover = track.coverUrl;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album || '番茄小园',
      artwork: cover ? [{ src: cover, sizes: '512x512' }] : [],
    });
    navigator.mediaSession.setActionHandler('play', () => {
      useMusicStore.getState().toggle();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      audio?.pause();
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      useMusicStore.getState().prev();
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      useMusicStore.getState().next();
    });
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (typeof details.seekTime === 'number') {
        useMusicStore.getState().seek(details.seekTime * 1000);
      }
    });
  } catch {
    /* Media Session is a progressive enhancement. */
  }
}

function ensureAudio(): HTMLAudioElement {
  if (audio) return audio;
  const element = new Audio();
  element.preload = 'metadata';
  audio = element;

  element.addEventListener('timeupdate', () => {
    useMusicStore.setState({ progressMs: element.currentTime * 1000 });
  });
  element.addEventListener('durationchange', () => {
    if (Number.isFinite(element.duration) && element.duration > 0) {
      useMusicStore.setState({ durationMs: element.duration * 1000 });
    }
  });
  element.addEventListener('play', () => {
    useMusicStore.setState({ playing: true, loading: false });
  });
  element.addEventListener('pause', () => {
    useMusicStore.setState({ playing: false });
  });
  element.addEventListener('playing', () => {
    useMusicStore.setState({ playing: true, loading: false });
  });
  element.addEventListener('ended', () => {
    const state = useMusicStore.getState();
    if (state.repeat === 'one') {
      element.currentTime = 0;
      void element.play().catch(() => undefined);
      return;
    }
    state.next(true);
  });
  element.addEventListener('error', () => {
    if (!element.src) return;
    useMusicStore.setState({
      playing: false,
      loading: false,
      error: '音频加载失败，可能是格式不支持或歌曲已下架。',
    });
  });
  return element;
}

function sanitizeTrack(value: unknown): MusicTrack | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<MusicTrack>;
  if (typeof row.id !== 'string' || typeof row.title !== 'string') return null;
  if (row.source !== 'local' && row.source !== 'netease') return null;
  return {
    id: row.id,
    source: row.source,
    title: row.title,
    artist: typeof row.artist === 'string' ? row.artist : '未知歌手',
    album: typeof row.album === 'string' ? row.album : '',
    durationMs: typeof row.durationMs === 'number' ? row.durationMs : 0,
    coverUrl: typeof row.coverUrl === 'string' ? row.coverUrl : null,
    blobId: typeof row.blobId === 'string' ? row.blobId : null,
    songId: typeof row.songId === 'number' ? row.songId : null,
    playlistId: typeof row.playlistId === 'number' ? row.playlistId : null,
  };
}

export const useMusicStore = create<MusicStore>()(
  persist(
    (set, get) => ({
      tracks: [],
      currentId: null,
      playing: false,
      loading: false,
      importing: false,
      progressMs: 0,
      durationMs: 0,
      volume: 0.55,
      repeat: 'all',
      shuffle: false,
      error: null,
      playlistName: null,
      playlistCover: null,
      hydrated: false,

      hydrateLocal: async () => {
        if (get().hydrated || hydrating) return;
        hydrating = true;
        try {
          const metas = await listLocalAudio();
          const local = metas.map(localMetaToTrack);
          set((state) => {
            const netease = state.tracks.filter((track) => track.source === 'netease');
            const tracks = [...local, ...netease];
            return {
              tracks,
              hydrated: true,
              currentId: tracks.some((track) => track.id === state.currentId)
                ? state.currentId
                : null,
            };
          });
        } catch {
          set({ hydrated: true });
        } finally {
          hydrating = false;
        }
      },

      importLocalFiles: async (files) => {
        let added = 0;
        let skipped = 0;
        let firstError: string | null = null;
        for (const file of files) {
          try {
            const track = await saveLocalAudio(file);
            set((state) => ({
              tracks: [...state.tracks, track],
              currentId: state.currentId ?? track.id,
            }));
            added += 1;
          } catch (error) {
            skipped += 1;
            firstError ??= messageOf(error);
          }
        }
        set({ error: firstError });
        return { added, skipped };
      },

      importPlaylist: async (input) => {
        set({ importing: true, error: null });
        try {
          const playlist = await fetchNeteasePlaylist(input);
          set((state) => {
            const local = state.tracks.filter((track) => track.source === 'local');
            const tracks = [...local, ...playlist.tracks];
            const currentExists = tracks.some((track) => track.id === state.currentId);
            if (!currentExists) {
              stopElement();
              playToken += 1;
            }
            return {
              tracks,
              playlistName: playlist.name,
              playlistCover: playlist.coverUrl,
              currentId: currentExists ? state.currentId : null,
              importing: false,
              playing: currentExists ? state.playing : false,
              progressMs: currentExists ? state.progressMs : 0,
              durationMs: currentExists ? state.durationMs : 0,
            };
          });
          return true;
        } catch (error) {
          set({ importing: false, error: messageOf(error) });
          return false;
        }
      },

      removeTrack: async (id) => {
        const track = get().tracks.find((item) => item.id === id);
        if (!track) return;
        if (get().currentId === id) {
          stopElement();
          playToken += 1;
          set({
            currentId: null,
            playing: false,
            loading: false,
            progressMs: 0,
            durationMs: 0,
          });
        }
        set((state) => ({ tracks: state.tracks.filter((item) => item.id !== id) }));
        if (track.source === 'local' && track.blobId) {
          try {
            await removeLocalAudio(track.blobId);
          } catch {
            set({ error: '音频文件删除失败，列表已经更新。' });
          }
        }
        if (track.source === 'netease' && !get().tracks.some((item) => item.source === 'netease')) {
          set({ playlistName: null, playlistCover: null });
        }
      },

      clearNetease: () => {
        const state = get();
        const current = state.tracks.find((track) => track.id === state.currentId);
        if (current?.source === 'netease') {
          stopElement();
          playToken += 1;
          set({
            currentId: null,
            playing: false,
            loading: false,
            progressMs: 0,
            durationMs: 0,
          });
        }
        set((currentState) => ({
          tracks: currentState.tracks.filter((track) => track.source !== 'netease'),
          playlistName: null,
          playlistCover: null,
        }));
      },

      playTrack: async (id) => {
        const track = get().tracks.find((item) => item.id === id);
        if (!track) return;
        const token = ++playToken;
        set({ currentId: id, loading: true, error: null, playing: false });
        try {
          let source: string;
          let nextObjectUrl: string | null = null;
          if (track.source === 'local') {
            if (!track.blobId) throw new Error('这个本地音频已经丢失，请重新导入。');
            const blob = await readLocalAudio(track.blobId);
            if (!blob) throw new Error('本地音频文件不存在，请重新导入。');
            if (token !== playToken) return;
            nextObjectUrl = URL.createObjectURL(blob);
            source = nextObjectUrl;
          } else {
            if (!track.songId) throw new Error('这首歌缺少网易云 ID。');
            source = await resolveNeteaseStream(track.songId);
          }
          if (token !== playToken) {
            if (nextObjectUrl) URL.revokeObjectURL(nextObjectUrl);
            return;
          }
          const element = ensureAudio();
          element.pause();
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          objectUrl = nextObjectUrl;
          element.src = source;
          element.volume = get().volume;
          element.currentTime = 0;
          set({ progressMs: 0, durationMs: track.durationMs || 0 });
          updateMediaSession(track);
          await element.play();
          if (token === playToken) set({ playing: true, loading: false });
        } catch (error) {
          if (token !== playToken) return;
          set({ playing: false, loading: false, error: messageOf(error) });
        }
      },

      toggle: () => {
        const state = get();
        if (state.playing) {
          audio?.pause();
          return;
        }
        if (state.currentId && audio?.src) {
          if (audio.ended) audio.currentTime = 0;
          audio.volume = state.volume;
          void audio.play().catch((error) => {
            set({ playing: false, error: messageOf(error) });
          });
          return;
        }
        const target = state.currentId
          ? state.tracks.find((track) => track.id === state.currentId)
          : state.tracks[0];
        if (target) void state.playTrack(target.id);
      },

      next: (auto = false) => {
        const { tracks, currentId, shuffle, repeat } = get();
        if (!tracks.length) return;
        const currentIndex = tracks.findIndex((track) => track.id === currentId);
        let nextIndex = currentIndex + 1;
        if (shuffle && tracks.length > 1) {
          do {
            nextIndex = Math.floor(Math.random() * tracks.length);
          } while (nextIndex === currentIndex);
        } else if (nextIndex >= tracks.length) {
          if (auto && repeat === 'all') nextIndex = 0;
          else if (auto) {
            audio?.pause();
            set({ playing: false });
            return;
          } else nextIndex = 0;
        }
        if (nextIndex < 0) nextIndex = 0;
        void get().playTrack(tracks[nextIndex].id);
      },

      prev: () => {
        const { tracks, currentId, shuffle } = get();
        if (!tracks.length) return;
        const currentIndex = tracks.findIndex((track) => track.id === currentId);
        let prevIndex = currentIndex - 1;
        if (shuffle && tracks.length > 1) {
          do {
            prevIndex = Math.floor(Math.random() * tracks.length);
          } while (prevIndex === currentIndex);
        } else if (prevIndex < 0) {
          prevIndex = tracks.length - 1;
        }
        void get().playTrack(tracks[prevIndex].id);
      },

      seek: (ms) => {
        if (!audio || !Number.isFinite(audio.duration)) return;
        const seconds = Math.min(Math.max(ms, 0), audio.duration * 1000) / 1000;
        audio.currentTime = seconds;
        set({ progressMs: seconds * 1000 });
      },

      setVolume: (value) => {
        const volume = Math.min(1, Math.max(0, value));
        if (audio) audio.volume = volume;
        set({ volume });
      },

      cycleRepeat: () => {
        const current = get().repeat;
        const next: RepeatMode =
          current === 'off' ? 'all' : current === 'all' ? 'one' : 'off';
        set({ repeat: next });
      },

      toggleShuffle: () => {
        set((state) => ({ shuffle: !state.shuffle }));
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'pomogrove.music.v1',
      version: 1,
      partialize: (state) => ({
        tracks: state.tracks,
        currentId: state.currentId,
        volume: state.volume,
        repeat: state.repeat,
        shuffle: state.shuffle,
        playlistName: state.playlistName,
        playlistCover: state.playlistCover,
      }),
      merge: (persisted, current) => {
        const data = (persisted ?? {}) as Partial<MusicStore>;
        const tracks = Array.isArray(data.tracks)
          ? data.tracks
              .map(sanitizeTrack)
              .filter((track): track is MusicTrack => track !== null)
          : [];
        const currentId =
          typeof data.currentId === 'string' &&
          tracks.some((track) => track.id === data.currentId)
            ? data.currentId
            : null;
        return {
          ...current,
          tracks,
          currentId,
          volume:
            typeof data.volume === 'number'
              ? Math.min(1, Math.max(0, data.volume))
              : current.volume,
          repeat:
            data.repeat === 'off' || data.repeat === 'one' || data.repeat === 'all'
              ? data.repeat
              : current.repeat,
          shuffle: Boolean(data.shuffle),
          playlistName:
            typeof data.playlistName === 'string' ? data.playlistName : null,
          playlistCover:
            typeof data.playlistCover === 'string' ? data.playlistCover : null,
        };
      },
    },
  ),
);
