import { describe, expect, it } from 'vitest';
import {
  neteaseOuterUrl,
  normalizeNeteasePlaylist,
  parseNeteasePlaylistId,
} from '../src/lib/netease';

describe('parseNeteasePlaylistId', () => {
  it('accepts a bare playlist id', () => {
    expect(parseNeteasePlaylistId('3778678')).toBe(3778678);
  });

  it('accepts a full playlist link', () => {
    expect(
      parseNeteasePlaylistId('https://music.163.com/playlist?id=3778678&userid=1'),
    ).toBe(3778678);
  });

  it('accepts the share path form', () => {
    expect(
      parseNeteasePlaylistId('https://music.163.com/#/playlist/3778678/123'),
    ).toBe(3778678);
  });

  it('rejects unrelated text', () => {
    expect(parseNeteasePlaylistId('我的歌单')).toBeNull();
  });
});

describe('normalizeNeteasePlaylist', () => {
  const payload = {
    code: 200,
    playlist: {
      id: 3778678,
      name: '热歌榜',
      coverImgUrl: 'http://p1.music.126.net/cover.jpg',
      creator: { nickname: '网易云音乐' },
      tracks: [
        {
          id: 1973665667,
          name: '海屿你',
          ar: [{ name: '马也_Crabbit' }, { name: '陈奕迅' }],
          al: { name: '海屿你', picUrl: 'http://p2.music.126.net/song.jpg' },
          dt: 295940,
        },
        {
          id: 347230,
          name: '不能播的歌',
          artists: [{ name: '某歌手' }],
          album: { name: '某专辑' },
          duration: 120000,
        },
        { id: 1973665667, name: '重复歌曲' },
        { id: 0, name: '无效歌曲' },
      ],
    },
  };

  it('normalizes playlist metadata and tracks', () => {
    const playlist = normalizeNeteasePlaylist(payload);
    expect(playlist.id).toBe(3778678);
    expect(playlist.name).toBe('热歌榜');
    expect(playlist.creator).toBe('网易云音乐');
    expect(playlist.coverUrl).toBe('https://p1.music.126.net/cover.jpg');
    expect(playlist.tracks).toHaveLength(2);
    expect(playlist.tracks[0]).toMatchObject({
      id: 'netease-1973665667',
      source: 'netease',
      title: '海屿你',
      artist: '马也_Crabbit / 陈奕迅',
      album: '海屿你',
      durationMs: 295940,
      coverUrl: 'https://p2.music.126.net/song.jpg',
      songId: 1973665667,
      playlistId: 3778678,
    });
  });

  it('supports the older artists/album shape and falls back to playlist cover', () => {
    const playlist = normalizeNeteasePlaylist(payload);
    expect(playlist.tracks[1].artist).toBe('某歌手');
    expect(playlist.tracks[1].album).toBe('某专辑');
    expect(playlist.tracks[1].coverUrl).toBe('https://p1.music.126.net/cover.jpg');
    expect(playlist.tracks[1].durationMs).toBe(120000);
  });

  it('throws when no playable tracks are present', () => {
    expect(() =>
      normalizeNeteasePlaylist({ playlist: { id: 1, name: '空', tracks: [] } }),
    ).toThrow('没有可读取的歌曲');
  });
});

describe('neteaseOuterUrl', () => {
  it('builds the public outer player endpoint', () => {
    expect(neteaseOuterUrl(1973665667)).toBe(
      'https://music.163.com/song/media/outer/url?id=1973665667.mp3',
    );
  });
});
