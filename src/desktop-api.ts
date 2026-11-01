import type { Phase } from './types';

export interface DesktopTimerPayload {
  phase: Phase;
  status: 'idle' | 'running' | 'paused';
  remainingMs: number;
  label: string;
}

export interface DesktopApi {
  platform: string;
  version: string;
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  close: () => Promise<void>;
  setAlwaysOnTop: (value: boolean) => Promise<void>;
  setMiniMode: (value: boolean) => Promise<void>;
  setCloseToTray: (value: boolean) => Promise<void>;
  setAutoLaunch: (value: boolean) => Promise<void>;
  setKeepAwake: (value: boolean) => Promise<void>;
  notify: (payload: { title: string; body: string }) => Promise<void>;
  setProgress: (value: number) => Promise<void>;
  updateTimerState: (state: DesktopTimerPayload) => void;
  neteasePlaylist: (id: number) => Promise<unknown>;
  neteaseStream: (songId: number) => Promise<string | null>;
  onTrayToggle: (callback: () => void) => () => void;
  onWindowState: (callback: (state: { maximized: boolean }) => void) => () => void;
}
