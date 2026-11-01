import { useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties, DragEvent } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Disc3,
  Link2,
  ListMusic,
  Loader2,
  Music2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { MusicTrack } from '../types';
import { useAppStore } from '../store/useAppStore';
import { useMusicStore } from '../store/useMusicStore';
import { formatTrackTime } from '../lib/music';
import { Modal } from './ui';

type MusicTab = 'local' | 'netease';

function Cover({
  track,
  size,
  className,
}: {
  track: MusicTrack | null;
  size: number;
  className?: string;
}) {
  return (
    <span className={`music-cover ${className ?? ''}`} style={{ width: size, height: size }}>
      {track?.coverUrl ? (
        <img src={track.coverUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <Music2 size={Math.round(size * 0.42)} />
      )}
    </span>
  );
}

export function MusicCard({ onOpen }: { onOpen: () => void }) {
  const tracks = useMusicStore((state) => state.tracks);
  const currentId = useMusicStore((state) => state.currentId);
  const playing = useMusicStore((state) => state.playing);
  const loading = useMusicStore((state) => state.loading);
  const playlistName = useMusicStore((state) => state.playlistName);
  const toggle = useMusicStore((state) => state.toggle);

  const current = tracks.find((track) => track.id === currentId) ?? null;

  return (
    <div className="music-card">
      <div className="music-card-head">
        <span className="card-label">
          <Music2 size={14} /> 专注音乐
        </span>
        <span className="music-count">{tracks.length ? `${tracks.length} 首` : '未导入'}</span>
      </div>

      {current ? (
        <div className="music-now">
          <Cover track={current} size={46} />
          <div className="music-now-text">
            <strong>{current.title}</strong>
            <span>{current.artist}</span>
          </div>
          <button
            type="button"
            className="music-play-button"
            aria-label={playing ? '暂停音乐' : '播放音乐'}
            onClick={toggle}
          >
            {loading ? (
              <Loader2 size={18} className="spin" />
            ) : playing ? (
              <Pause size={18} />
            ) : (
              <Play size={18} fill="currentColor" />
            )}
          </button>
        </div>
      ) : (
        <p className="music-empty-line">
          把喜欢的音乐放进来，专注的时候慢慢听。
        </p>
      )}

      <div className="music-card-foot">
        <button type="button" className="ghost-button" onClick={onOpen}>
          <ListMusic size={14} /> 音乐库 <ArrowRight size={14} />
        </button>
        {playlistName && <span className="music-playlist-tag">{playlistName}</span>}
      </div>
    </div>
  );
}

export function MusicLibrary({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<MusicTab>('local');
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const showToast = useAppStore((state) => state.showToast);

  const tracks = useMusicStore((state) => state.tracks);
  const currentId = useMusicStore((state) => state.currentId);
  const playing = useMusicStore((state) => state.playing);
  const loading = useMusicStore((state) => state.loading);
  const importing = useMusicStore((state) => state.importing);
  const progressMs = useMusicStore((state) => state.progressMs);
  const durationMs = useMusicStore((state) => state.durationMs);
  const volume = useMusicStore((state) => state.volume);
  const repeat = useMusicStore((state) => state.repeat);
  const shuffle = useMusicStore((state) => state.shuffle);
  const error = useMusicStore((state) => state.error);
  const playlistName = useMusicStore((state) => state.playlistName);

  const importLocalFiles = useMusicStore((state) => state.importLocalFiles);
  const importPlaylist = useMusicStore((state) => state.importPlaylist);
  const removeTrack = useMusicStore((state) => state.removeTrack);
  const clearNetease = useMusicStore((state) => state.clearNetease);
  const playTrack = useMusicStore((state) => state.playTrack);
  const toggle = useMusicStore((state) => state.toggle);
  const next = useMusicStore((state) => state.next);
  const prev = useMusicStore((state) => state.prev);
  const seek = useMusicStore((state) => state.seek);
  const setVolume = useMusicStore((state) => state.setVolume);
  const cycleRepeat = useMusicStore((state) => state.cycleRepeat);
  const toggleShuffle = useMusicStore((state) => state.toggleShuffle);

  const localTracks = tracks.filter((track) => track.source === 'local');
  const neteaseTracks = tracks.filter((track) => track.source === 'netease');
  const current = tracks.find((track) => track.id === currentId) ?? null;
  const progressPercent = durationMs > 0 ? Math.min(100, (progressMs / durationMs) * 100) : 0;

  const handleFiles = async (files: File[]) => {
    if (!files.length) return;
    const result = await importLocalFiles(files);
    if (result.added > 0) {
      showToast(
        `已加入 ${result.added} 首本地音乐${result.skipped ? `，跳过 ${result.skipped} 首` : ''}`,
        'success',
      );
    } else {
      const message = useMusicStore.getState().error ?? '没有可导入的音频文件';
      showToast(message, 'warn');
    }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    void handleFiles(files);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    void handleFiles(Array.from(event.dataTransfer.files));
  };

  const submitPlaylist = async () => {
    if (!input.trim() || importing) return;
    const ok = await importPlaylist(input);
    if (ok) {
      const name = useMusicStore.getState().playlistName ?? '歌单';
      showToast(`已导入「${name}」`, 'success');
      setInput('');
      setTab('netease');
    } else {
      showToast(useMusicStore.getState().error ?? '歌单导入失败', 'warn');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="专注音乐"
      subtitle="本地音频留在这台设备；网易云只播放公开可听曲目。"
      wide
    >
      <div className="music-tabs" role="tablist" aria-label="音乐来源">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'local'}
          className="music-tab"
          data-active={tab === 'local' ? 'true' : 'false'}
          onClick={() => setTab('local')}
        >
          <Upload size={14} /> 本地音频 <span>{localTracks.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'netease'}
          className="music-tab"
          data-active={tab === 'netease' ? 'true' : 'false'}
          onClick={() => setTab('netease')}
        >
          <Link2 size={14} /> 网易云歌单 <span>{neteaseTracks.length}</span>
        </button>
      </div>

      {current && (
        <div className="music-player">
          <div className="music-player-info">
            <Cover track={current} size={54} />
            <div>
              <strong>{current.title}</strong>
              <span>
                {current.artist}
                {current.album ? ` · ${current.album}` : ''}
              </span>
            </div>
          </div>

          <div className="music-progress">
            <input
              type="range"
              min={0}
              max={Math.max(1, durationMs)}
              step={1000}
              value={Math.min(progressMs, Math.max(1, durationMs))}
              aria-label="播放进度"
              style={{ '--music-progress': `${progressPercent}%` } as CSSProperties}
              onChange={(event) => seek(Number(event.target.value))}
            />
            <div className="music-times">
              <span>{formatTrackTime(progressMs)}</span>
              <span>{formatTrackTime(durationMs)}</span>
            </div>
          </div>

          <div className="music-controls">
            <button
              type="button"
              className="music-control"
              data-active={shuffle ? 'true' : 'false'}
              aria-label="随机播放"
              onClick={toggleShuffle}
            >
              <Shuffle size={16} />
            </button>
            <button type="button" className="music-control" aria-label="上一首" onClick={prev}>
              <SkipBack size={18} />
            </button>
            <button
              type="button"
              className="music-control music-control-main"
              aria-label={playing ? '暂停' : '播放'}
              onClick={toggle}
            >
              {loading ? (
                <Loader2 size={20} className="spin" />
              ) : playing ? (
                <Pause size={20} />
              ) : (
                <Play size={20} fill="currentColor" />
              )}
            </button>
            <button type="button" className="music-control" aria-label="下一首" onClick={() => next()}>
              <SkipForward size={18} />
            </button>
            <button
              type="button"
              className="music-control"
              data-active={repeat !== 'off' ? 'true' : 'false'}
              aria-label={
                repeat === 'off' ? '不循环' : repeat === 'all' ? '列表循环' : '单曲循环'
              }
              title={repeat === 'off' ? '不循环' : repeat === 'all' ? '列表循环' : '单曲循环'}
              onClick={cycleRepeat}
            >
              {repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
            </button>
            <div className="music-volume">
              {volume > 0 ? <Volume2 size={15} /> : <VolumeX size={15} />}
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                aria-label="音乐音量"
                onChange={(event) => setVolume(Number(event.target.value))}
              />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="music-error" role="alert">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {tab === 'local' ? (
        <>
          <div
            className="music-dropzone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
          >
            <Upload size={22} />
            <div>
              <strong>把音频拖到这里，或者选择文件</strong>
              <p>MP3 / M4A / WAV / FLAC / OGG，单文件不超过 300 MB。</p>
            </div>
            <button type="button" className="ghost-button" onClick={() => inputRef.current?.click()}>
              选择文件
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,.mp3,.m4a,.wav,.ogg,.flac,.aac,.opus"
            multiple
            hidden
            onChange={onFileChange}
          />

          {localTracks.length ? (
            <div className="music-tracklist">
              {localTracks.map((track, index) => (
                <div
                  key={track.id}
                  className="music-track"
                  data-active={track.id === currentId ? 'true' : 'false'}
                >
                  <button
                    type="button"
                    className="music-track-main"
                    aria-label={`播放 ${track.title}`}
                    onClick={() => void playTrack(track.id)}
                  >
                    <span className="music-track-index">
                      {track.id === currentId && playing ? <Volume2 size={14} /> : index + 1}
                    </span>
                    <span className="music-track-text">
                      <strong>{track.title}</strong>
                      <small>{track.artist}</small>
                    </span>
                    <span className="music-track-time">{formatTrackTime(track.durationMs)}</span>
                  </button>
                  <button
                    type="button"
                    className="music-track-delete"
                    aria-label={`删除 ${track.title}`}
                    onClick={() => void removeTrack(track.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="music-empty">
              <Disc3 size={26} />
              <p>还没有本地音频。导入后，它们只保存在这台设备上。</p>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="music-input-row">
            <input
              type="text"
              value={input}
              placeholder="粘贴歌单链接或 ID，例如 3778678"
              aria-label="网易云歌单链接或 ID"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void submitPlaylist();
              }}
            />
            <button
              type="button"
              className="primary-button"
              disabled={importing || !input.trim()}
              onClick={() => void submitPlaylist()}
            >
              {importing ? <Loader2 size={15} className="spin" /> : <Link2 size={15} />}
              {importing ? '读取中' : '导入歌单'}
            </button>
          </div>

          {playlistName && (
            <div className="music-playlist-head">
              <div>
                <span className="card-label">已导入</span>
                <strong>{playlistName}</strong>
                <p>{neteaseTracks.length} 首 · 仅保存在本机</p>
              </div>
              <button
                type="button"
                className="text-button danger"
                onClick={() => {
                  if (window.confirm('移除歌单里的歌曲？本地音频会保留。')) {
                    clearNetease();
                    showToast('已移除网易云歌单');
                  }
                }}
              >
                移除歌单
              </button>
            </div>
          )}

          <p className="music-note">
            只播放网易云公开可听的曲目；VIP、地区限制或已下架的歌曲会提示无法播放。请支持正版音乐。
          </p>

          {neteaseTracks.length ? (
            <div className="music-tracklist">
              {neteaseTracks.map((track, index) => (
                <div
                  key={track.id}
                  className="music-track"
                  data-active={track.id === currentId ? 'true' : 'false'}
                >
                  <button
                    type="button"
                    className="music-track-main"
                    aria-label={`播放 ${track.title}`}
                    onClick={() => void playTrack(track.id)}
                  >
                    <span className="music-track-index">
                      {track.id === currentId && playing ? <Volume2 size={14} /> : index + 1}
                    </span>
                    <span className="music-track-text">
                      <strong>{track.title}</strong>
                      <small>{track.artist}</small>
                    </span>
                    <span className="music-track-time">{formatTrackTime(track.durationMs)}</span>
                  </button>
                  <button
                    type="button"
                    className="music-track-delete"
                    aria-label={`删除 ${track.title}`}
                    onClick={() => void removeTrack(track.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="music-empty">
              <Link2 size={26} />
              <p>粘贴一个公开歌单，音乐就会出现在这里。</p>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
