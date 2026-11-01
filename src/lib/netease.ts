import type { MusicTrack, NeteasePlaylist } from '../types';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value !== null && typeof value === 'object' ? (value as UnknownRecord) : {};

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const secure = (url: string | null): string | null => {
  if (!url) return null;
  return url.startsWith('http://') ? `https://${url.slice(7)}` : url;
};

/** Accepts a raw playlist id, a share link, or a copied NetEase URL. */
export function parseNeteasePlaylistId(input: string): number | null {
  const value = input.trim();
  if (!value) return null;
  if (/^\d{3,12}$/.test(value)) return Number(value);
  const urlMatch =
    value.match(/[?&]id=(\d{3,12})/) ??
    value.match(/playlist\/(\d{3,12})/) ??
    value.match(/(\d{3,12})/);
  return urlMatch ? Number(urlMatch[1]) : null;
}

export function neteaseOuterUrl(songId: number): string {
  return `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;
}

/**
 * Normalizes the payload returned by /api/v6/playlist/detail (or the older
 * /api/playlist/detail). Kept pure so it can be unit-tested in Node.
 */
export function normalizeNeteasePlaylist(payload: unknown): NeteasePlaylist {
  const root = asRecord(payload);
  const playlist = asRecord(root.playlist ?? root.result ?? root);
  const playlistId = asNumber(playlist.id);
  const name = asString(playlist.name, '网易云歌单');
  const coverUrl = secure(
    asString(playlist.coverImgUrl ?? playlist.picUrl) || null,
  );
  const creatorRecord = asRecord(playlist.creator);
  const creator =
    asString(creatorRecord.nickname) ||
    asString(creatorRecord.name) ||
    '网易云音乐';

  const rawTracks = Array.isArray(playlist.tracks)
    ? playlist.tracks
    : Array.isArray(root.songs)
      ? root.songs
      : [];

  const seen = new Set<number>();
  const tracks: MusicTrack[] = [];

  for (const raw of rawTracks) {
    const track = asRecord(raw);
    const songId = asNumber(track.id);
    if (!songId || seen.has(songId)) continue;
    seen.add(songId);

    const artists = Array.isArray(track.ar)
      ? track.ar
      : Array.isArray(track.artists)
        ? track.artists
        : [];
    const artist = artists
      .map((item) => asString(asRecord(item).name))
      .filter(Boolean)
      .join(' / ');

    const albumRecord = asRecord(track.al ?? track.album);
    const trackCover = secure(asString(albumRecord.picUrl) || coverUrl);
    const durationMs = asNumber(track.dt ?? track.duration);

    tracks.push({
      id: `netease-${songId}`,
      source: 'netease',
      title: asString(track.name, '未知曲目'),
      artist: artist || '未知歌手',
      album: asString(albumRecord.name),
      durationMs: durationMs > 0 ? durationMs : 0,
      coverUrl: trackCover,
      blobId: null,
      songId,
      playlistId: playlistId || null,
    });
  }

  if (!tracks.length) {
    throw new Error('这个歌单里没有可读取的歌曲，请换一个公开歌单。');
  }

  return {
    id: playlistId,
    name,
    coverUrl,
    creator,
    tracks,
  };
}
