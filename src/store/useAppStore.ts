import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppView,
  Celebration,
  FocusSession,
  Phase,
  Settings,
  Task,
  TimerState,
  Toast,
} from '../types';
import { DEFAULT_SETTINGS, DEFAULT_TIMER } from '../types';
import {
  clamp,
  durationForPhase,
  nextBreakPhase,
  phaseAfterSkip,
} from '../lib/time';
import { dayKey } from '../lib/time';
import { plantTypeForSession, PLANT_NAME } from '../lib/garden';
import { summarize } from '../lib/stats';
import { audio } from '../lib/audio';
import {
  cancelEndNotification,
  hapticSuccess,
  hapticTap,
  isNative,
  notifyNow,
  phaseNotificationText,
  requestNotifications,
  scheduleEndNotification,
} from '../lib/platform';

export interface AppStore {
  settings: Settings;
  tasks: Task[];
  sessions: FocusSession[];
  activeTaskId: string | null;
  timer: TimerState;
  view: AppView;
  toasts: Toast[];
  celebration: Celebration | null;

  setView: (view: AppView) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  addTask: (title: string, estimate: number) => string | null;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  setActiveTask: (id: string | null) => void;
  startTask: (id: string) => void;
  clearCompleted: () => void;

  tick: (now: number) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  skipPhase: () => void;
  setPhase: (phase: Phase) => boolean;
  dismissCelebration: () => void;
  showToast: (message: string, tone?: Toast['tone']) => void;
  dismissToast: (id: string) => void;
  resetAll: () => void;
  importBackup: (raw: unknown) => boolean;
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeSettings(input?: Partial<Settings> | null): Settings {
  const merged = { ...DEFAULT_SETTINGS, ...(input ?? {}) };
  const theme = ['light', 'dark', 'system'].includes(merged.theme) ? merged.theme : 'system';
  const completionSound = ['chime', 'bell', 'none'].includes(merged.completionSound)
    ? merged.completionSound
    : 'chime';
  const ambience = ['none', 'rain', 'forest', 'cafe', 'waves', 'white'].includes(merged.ambience)
    ? merged.ambience
    : 'none';
  return {
    focusMin: clamp(Math.round(Number(merged.focusMin) || 25), 1, 120),
    shortBreakMin: clamp(Math.round(Number(merged.shortBreakMin) || 5), 1, 60),
    longBreakMin: clamp(Math.round(Number(merged.longBreakMin) || 15), 1, 60),
    longBreakEvery: clamp(Math.round(Number(merged.longBreakEvery) || 4), 2, 8),
    autoStartBreaks: Boolean(merged.autoStartBreaks),
    autoStartFocus: Boolean(merged.autoStartFocus),
    dailyGoal: clamp(Math.round(Number(merged.dailyGoal) || 8), 1, 24),
    theme,
    completionSound,
    volume: clamp(Number(merged.volume) || 0, 0, 1),
    ambience,
    ambienceVolume: clamp(Number(merged.ambienceVolume) || 0, 0, 1),
    notifications: Boolean(merged.notifications),
    vibration: Boolean(merged.vibration),
    keepAwake: Boolean(merged.keepAwake),
    alwaysOnTop: Boolean(merged.alwaysOnTop),
    autoLaunch: Boolean(merged.autoLaunch),
    closeToTray: Boolean(merged.closeToTray),
  };
}

function freshTimer(phase: Phase, settings: Settings, cycle: number): TimerState {
  const duration = durationForPhase(phase, settings);
  return {
    phase,
    status: 'idle',
    durationMs: duration,
    remainingMs: duration,
    endAt: null,
    startedAt: null,
    focusesSinceLongBreak: cycle,
  };
}

function normalizeTimer(input: TimerState | undefined, settings: Settings): TimerState {
  if (!input) return freshTimer('focus', settings, 0);
  const phase: Phase =
    input.phase === 'shortBreak' || input.phase === 'longBreak' ? input.phase : 'focus';
  const status =
    input.status === 'running' || input.status === 'paused' ? input.status : 'idle';
  const duration = Math.max(
    60_000,
    Number(input.durationMs) || durationForPhase(phase, settings),
  );
  const cycle = Math.max(0, Math.floor(Number(input.focusesSinceLongBreak) || 0));
  if (status === 'running' && input.endAt && Number.isFinite(input.endAt)) {
    return {
      phase,
      status,
      durationMs: duration,
      remainingMs: Math.max(0, input.endAt - Date.now()),
      endAt: input.endAt,
      startedAt: input.startedAt ?? null,
      focusesSinceLongBreak: cycle,
    };
  }
  const remaining = clamp(Number(input.remainingMs) || 0, 0, duration);
  return {
    phase,
    status: status === 'running' ? 'paused' : status,
    durationMs: duration,
    remainingMs: remaining > 0 ? remaining : duration,
    endAt: null,
    startedAt: input.startedAt ?? null,
    focusesSinceLongBreak: cycle,
  };
}

function sanitizeTask(value: unknown): Task | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<Task>;
  if (typeof item.title !== 'string' || !item.title.trim()) return null;
  return {
    id: typeof item.id === 'string' ? item.id : uid(),
    title: item.title.trim().slice(0, 120),
    estimate: clamp(Math.round(Number(item.estimate) || 1), 1, 24),
    completed: clamp(Math.round(Number(item.completed) || 0), 0, 999),
    done: Boolean(item.done),
    createdAt: Number(item.createdAt) || Date.now(),
    completedAt: item.done ? Number(item.completedAt) || Date.now() : null,
  };
}

function sanitizeSession(value: unknown): FocusSession | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<FocusSession>;
  const endedAt = Number(item.endedAt);
  const minutes = Number(item.minutes);
  if (!Number.isFinite(endedAt) || !Number.isFinite(minutes)) return null;
  return {
    id: typeof item.id === 'string' ? item.id : uid(),
    taskId: typeof item.taskId === 'string' ? item.taskId : null,
    taskTitle: typeof item.taskTitle === 'string' ? item.taskTitle.slice(0, 120) : null,
    startedAt: Number(item.startedAt) || endedAt - minutes * 60_000,
    endedAt,
    minutes: clamp(Math.round(minutes), 1, 240),
  };
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      tasks: [],
      sessions: [],
      activeTaskId: null,
      timer: DEFAULT_TIMER,
      view: 'timer',
      toasts: [],
      celebration: null,

      setView: (view) => set({ view }),

      updateSettings: (patch) => {
        const settings = normalizeSettings({ ...get().settings, ...patch });
        const timer = { ...get().timer };
        if (timer.status === 'idle') {
          const duration = durationForPhase(timer.phase, settings);
          timer.durationMs = duration;
          timer.remainingMs = duration;
        }
        set({ settings, timer });
      },

      addTask: (title, estimate) => {
        const trimmed = title.trim();
        if (!trimmed) return null;
        const task: Task = {
          id: uid(),
          title: trimmed.slice(0, 120),
          estimate: clamp(Math.round(estimate) || 1, 1, 24),
          completed: 0,
          done: false,
          createdAt: Date.now(),
          completedAt: null,
        };
        set((state) => ({
          tasks: [task, ...state.tasks],
          activeTaskId: state.activeTaskId ?? task.id,
        }));
        get().showToast(`已加入「${task.title}」`, 'success');
        return task.id;
      },

      deleteTask: (id) => {
        set((state) => {
          const tasks = state.tasks.filter((task) => task.id !== id);
          const activeTaskId =
            state.activeTaskId === id
              ? (tasks.find((task) => !task.done)?.id ?? null)
              : state.activeTaskId;
          return { tasks, activeTaskId };
        });
      },

      toggleTask: (id) => {
        set((state) => {
          const tasks = state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  done: !task.done,
                  completedAt: task.done ? null : Date.now(),
                }
              : task,
          );
          const activeTaskId =
            state.activeTaskId === id && tasks.find((task) => task.id === id)?.done
              ? (tasks.find((task) => !task.done)?.id ?? null)
              : state.activeTaskId;
          return { tasks, activeTaskId };
        });
      },

      setActiveTask: (id) => set({ activeTaskId: id }),

      startTask: (id) => {
        const state = get();
        const task = state.tasks.find((item) => item.id === id);
        if (!task) return;
        if (state.timer.status === 'running' && state.timer.phase === 'focus') {
          state.showToast('先暂停手头的专注，再切换到新任务', 'warn');
          return;
        }
        const focuses = state.timer.focusesSinceLongBreak;
        set({
          activeTaskId: id,
          timer: freshTimer('focus', state.settings, focuses),
          view: 'timer',
        });
        get().startTimer();
      },

      clearCompleted: () => {
        set((state) => {
          const tasks = state.tasks.filter((task) => !task.done);
          const activeTaskId =
            state.activeTaskId && tasks.some((task) => task.id === state.activeTaskId)
              ? state.activeTaskId
              : (tasks.find((task) => !task.done)?.id ?? null);
          return { tasks, activeTaskId };
        });
      },

      tick: (now) => {
        const timer = get().timer;
        if (timer.status !== 'running' || !timer.endAt) return;
        if (now >= timer.endAt) {
          finishPhase(set, get, timer.endAt);
          return;
        }
        const remaining = timer.endAt - now;
        if (Math.abs(remaining - timer.remainingMs) > 200) {
          set({ timer: { ...timer, remainingMs: remaining } });
        }
      },

      startTimer: () => {
        const state = get();
        if (state.timer.status === 'running') return;
        let timer = state.timer;
        if (timer.remainingMs <= 500) {
          timer = freshTimer(timer.phase, state.settings, timer.focusesSinceLongBreak);
        }
        const now = Date.now();
        const endAt = now + timer.remainingMs;
        set({
          timer: {
            ...timer,
            status: 'running',
            endAt,
            startedAt: timer.startedAt ?? now,
          },
        });
        void audio.unlock();
        void hapticTap(state.settings);
        if (state.settings.notifications) {
          if (!isNative) void requestNotifications();
          void scheduleEndNotification(
            endAt,
            timer.phase,
            Math.round(timer.durationMs / 60_000),
            state.settings,
          );
        }
      },

      pauseTimer: () => {
        const state = get();
        if (state.timer.status !== 'running' || !state.timer.endAt) return;
        const remaining = Math.max(0, state.timer.endAt - Date.now());
        set({
          timer: {
            ...state.timer,
            status: 'paused',
            remainingMs: remaining,
            endAt: null,
          },
        });
        void cancelEndNotification();
      },

      resetTimer: () => {
        const state = get();
        const duration = durationForPhase(state.timer.phase, state.settings);
        set({
          timer: {
            ...state.timer,
            status: 'idle',
            durationMs: duration,
            remainingMs: duration,
            endAt: null,
            startedAt: null,
          },
        });
        void cancelEndNotification();
      },

      skipPhase: () => {
        const state = get();
        const next = phaseAfterSkip(state.timer.phase);
        const cycle =
          state.timer.phase === 'longBreak' ? 0 : state.timer.focusesSinceLongBreak;
        set({ timer: freshTimer(next, state.settings, cycle) });
        void cancelEndNotification();
        state.showToast(
          next === 'focus' ? '已跳过休息，准备继续专注' : '已跳过本次专注',
        );
      },

      setPhase: (phase) => {
        const state = get();
        if (state.timer.phase === phase && state.timer.status === 'idle') return true;
        if (state.timer.status === 'running') {
          state.showToast('请先暂停或重置当前计时', 'warn');
          return false;
        }
        const cycle =
          state.timer.phase === 'longBreak' && phase === 'focus'
            ? 0
            : state.timer.focusesSinceLongBreak;
        set({ timer: freshTimer(phase, state.settings, cycle) });
        void cancelEndNotification();
        return true;
      },

      dismissCelebration: () => set({ celebration: null }),

      showToast: (message, tone = 'default') => {
        const id = uid();
        set((state) => ({
          toasts: [...state.toasts.slice(-2), { id, message, tone }],
        }));
        setTimeout(() => {
          set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
        }, 4200);
      },

      dismissToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),

      resetAll: () => {
        void cancelEndNotification();
        audio.stopAmbience();
        set({
          settings: DEFAULT_SETTINGS,
          tasks: [],
          sessions: [],
          activeTaskId: null,
          timer: DEFAULT_TIMER,
          view: 'timer',
          toasts: [],
          celebration: null,
        });
        get().showToast('数据已清空，花园重新开始', 'success');
      },

      importBackup: (raw) => {
        try {
          if (!raw || typeof raw !== 'object') return false;
          const data = raw as {
            settings?: Partial<Settings>;
            tasks?: unknown[];
            sessions?: unknown[];
            activeTaskId?: string | null;
          };
          if (!Array.isArray(data.tasks) || !Array.isArray(data.sessions)) return false;
          const tasks = data.tasks
            .map(sanitizeTask)
            .filter((task): task is Task => task !== null);
          const sessions = data.sessions
            .map(sanitizeSession)
            .filter((session): session is FocusSession => session !== null);
          const settings = normalizeSettings(data.settings ?? get().settings);
          const activeTaskId =
            typeof data.activeTaskId === 'string' &&
            tasks.some((task) => task.id === data.activeTaskId && !task.done)
              ? data.activeTaskId
              : (tasks.find((task) => !task.done)?.id ?? null);
          set({
            settings,
            tasks,
            sessions,
            activeTaskId,
            timer: freshTimer('focus', settings, 0),
            view: 'timer',
            celebration: null,
          });
          get().showToast('数据已导入，花园恢复如初', 'success');
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'pomogrove.store.v1',
      version: 1,
      partialize: (state) => ({
        settings: state.settings,
        tasks: state.tasks,
        sessions: state.sessions,
        activeTaskId: state.activeTaskId,
        timer: state.timer,
        view: state.view,
      }),
      merge: (persisted, current) => {
        const data = (persisted ?? {}) as Partial<AppStore>;
        const settings = normalizeSettings(data.settings);
        return {
          ...current,
          settings,
          tasks: Array.isArray(data.tasks)
            ? data.tasks.map(sanitizeTask).filter((task): task is Task => task !== null)
            : [],
          sessions: Array.isArray(data.sessions)
            ? data.sessions
                .map(sanitizeSession)
                .filter((session): session is FocusSession => session !== null)
            : [],
          activeTaskId: typeof data.activeTaskId === 'string' ? data.activeTaskId : null,
          timer: normalizeTimer(data.timer, settings),
          view:
            data.view === 'tasks' || data.view === 'garden' || data.view === 'settings'
              ? data.view
              : 'timer',
          toasts: [],
          celebration: null,
        };
      },
    },
  ),
);

function finishPhase(
  set: (partial: Partial<AppStore>) => void,
  get: () => AppStore,
  endedAt: number,
): void {
  const state = get();
  const timer = state.timer;
  if (timer.status !== 'running') return;
  const finishedPhase = timer.phase;
  const minutes = Math.max(1, Math.round(timer.durationMs / 60_000));
  const settings = state.settings;
  const wasFocus = finishedPhase === 'focus';
  let nextPhase: Phase;
  let cycle = timer.focusesSinceLongBreak;
  let tasks = state.tasks;
  const sessions = [...state.sessions];
  let taskTitle: string | null = null;
  let celebration: Celebration | null = null;

  if (wasFocus) {
    const activeTask = state.tasks.find((task) => task.id === state.activeTaskId) ?? null;
    taskTitle = activeTask?.title ?? null;
    const session: FocusSession = {
      id: uid(),
      taskId: activeTask?.id ?? null,
      taskTitle,
      startedAt: timer.startedAt ?? endedAt - timer.durationMs,
      endedAt,
      minutes,
    };
    const plantsBefore = sessions.filter(
      (item) => dayKey(item.endedAt) === dayKey(endedAt),
    ).length;
    sessions.push(session);
    cycle += 1;
    nextPhase = nextBreakPhase(cycle, settings.longBreakEvery);
    if (activeTask) {
      tasks = state.tasks.map((task) =>
        task.id === activeTask.id
          ? { ...task, completed: task.completed + 1 }
          : task,
      );
    }
    const streak = summarize(sessions, settings, endedAt).streak;
    celebration = {
      id: uid(),
      minutes,
      plant: plantTypeForSession(session.id, plantsBefore),
      streak,
    };
  } else {
    nextPhase = 'focus';
    if (finishedPhase === 'longBreak') cycle = 0;
  }

  const duration = durationForPhase(nextPhase, settings);
  const autoStart = wasFocus ? settings.autoStartBreaks : settings.autoStartFocus;
  const nextStartAt = Math.max(endedAt, Date.now());
  const nextEndAt = autoStart ? nextStartAt + duration : null;
  set({
    sessions,
    tasks,
    celebration,
    timer: {
      phase: nextPhase,
      status: autoStart ? 'running' : 'idle',
      durationMs: duration,
      remainingMs: duration,
      endAt: nextEndAt,
      startedAt: autoStart ? nextStartAt : null,
      focusesSinceLongBreak: cycle,
    },
  });

  const text = phaseNotificationText(finishedPhase, minutes, settings);
  if (!isNative) void notifyNow(text.title, text.body);
  void audio.playCompletion(settings.completionSound, settings.volume);
  void hapticSuccess(settings);
  if (celebration) {
    const plantName = PLANT_NAME[celebration.plant];
    get().showToast(`专注完成，种下一株${plantName}`, 'success');
    const celebrationId = celebration.id;
    setTimeout(() => {
      if (get().celebration?.id === celebrationId) set({ celebration: null });
    }, 8000);
  } else {
    get().showToast('休息结束，准备开始下一颗番茄', 'success');
  }

  if (settings.notifications) {
    if (autoStart && nextEndAt) {
      void scheduleEndNotification(
        nextEndAt,
        nextPhase,
        Math.round(duration / 60_000),
        settings,
      );
    } else {
      void cancelEndNotification();
    }
  }
}
