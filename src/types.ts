export type Phase = 'focus' | 'shortBreak' | 'longBreak';
export type TimerStatus = 'idle' | 'running' | 'paused';
export type AppView = 'timer' | 'tasks' | 'garden' | 'settings';
export type ThemeMode = 'light' | 'dark' | 'system';
export type Ambience = 'none' | 'rain' | 'forest' | 'cafe' | 'waves' | 'white';
export type CompletionSound = 'chime' | 'bell' | 'none';
export type PlantType = 'tomato' | 'daisy' | 'tulip' | 'fern' | 'sunflower' | 'mushroom';
export type MusicSource = 'local' | 'netease';
export type RepeatMode = 'off' | 'all' | 'one';

export interface MusicTrack {
  id: string;
  source: MusicSource;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  coverUrl: string | null;
  /** Local audio only: IndexedDB key for the stored blob. */
  blobId: string | null;
  /** NetEase only. */
  songId: number | null;
  playlistId: number | null;
}

export interface NeteasePlaylist {
  id: number;
  name: string;
  coverUrl: string | null;
  creator: string;
  tracks: MusicTrack[];
}

export interface Task {
  id: string;
  title: string;
  estimate: number;
  completed: number;
  done: boolean;
  createdAt: number;
  completedAt: number | null;
}

export interface FocusSession {
  id: string;
  taskId: string | null;
  taskTitle: string | null;
  startedAt: number;
  endedAt: number;
  minutes: number;
}

export interface Settings {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  longBreakEvery: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  dailyGoal: number;
  theme: ThemeMode;
  completionSound: CompletionSound;
  volume: number;
  ambience: Ambience;
  ambienceVolume: number;
  notifications: boolean;
  vibration: boolean;
  keepAwake: boolean;
  alwaysOnTop: boolean;
  autoLaunch: boolean;
  closeToTray: boolean;
}

export interface TimerState {
  phase: Phase;
  status: TimerStatus;
  durationMs: number;
  remainingMs: number;
  endAt: number | null;
  startedAt: number | null;
  focusesSinceLongBreak: number;
}

export interface Celebration {
  id: string;
  minutes: number;
  plant: PlantType;
  streak: number;
}

export interface Toast {
  id: string;
  message: string;
  tone: 'default' | 'success' | 'warn';
}

export interface DesktopTimerState {
  phase: Phase;
  status: TimerStatus;
  remainingMs: number;
  label: string;
}

export const DEFAULT_SETTINGS: Settings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  longBreakEvery: 4,
  autoStartBreaks: true,
  autoStartFocus: false,
  dailyGoal: 8,
  theme: 'system',
  completionSound: 'chime',
  volume: 0.65,
  ambience: 'none',
  ambienceVolume: 0.35,
  notifications: true,
  vibration: true,
  keepAwake: false,
  alwaysOnTop: false,
  autoLaunch: false,
  closeToTray: false,
};

export const DEFAULT_TIMER: TimerState = {
  phase: 'focus',
  status: 'idle',
  durationMs: 25 * 60_000,
  remainingMs: 25 * 60_000,
  endAt: null,
  startedAt: null,
  focusesSinceLongBreak: 0,
};

export const PHASE_LABEL: Record<Phase, string> = {
  focus: '专注',
  shortBreak: '短休息',
  longBreak: '长休息',
};

export const PHASE_EYEBROW: Record<Phase, string> = {
  focus: '保持专注',
  shortBreak: '松一口气',
  longBreak: '好好休息',
};

export const PHASE_HINT: Record<Phase, string> = {
  focus: '一次只做一件事',
  shortBreak: '站起来，看看远处',
  longBreak: '去倒杯水，散散步',
};

export const AMBIENCE_LABEL: Record<Ambience, string> = {
  none: '安静',
  rain: '雨声',
  forest: '森林',
  cafe: '咖啡馆',
  waves: '海浪',
  white: '白噪音',
};
