import type { Phase, Settings } from '../types';

const MINUTE = 60_000;

export function durationForPhase(phase: Phase, settings: Settings): number {
  if (phase === 'focus') return settings.focusMin * MINUTE;
  if (phase === 'shortBreak') return settings.shortBreakMin * MINUTE;
  return settings.longBreakMin * MINUTE;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** mm:ss, with mm growing beyond 99 if needed. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatFocusMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} 小时` : `${hours} 小时 ${rest} 分钟`;
}

export function formatCompactMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(ts: number, days: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export function dayKey(ts: number): string {
  const d = new Date(ts);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function weekStart(ts: number): number {
  const day = new Date(startOfDay(ts)).getDay();
  const offset = (day + 6) % 7;
  return addDays(startOfDay(ts), -offset);
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function weekdayShort(ts: number): string {
  return WEEKDAYS[new Date(ts).getDay()];
}

export function dateLabel(ts: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(ts);
}

export function timeLabel(ts: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(ts);
}

export function greeting(now: number): string {
  const hour = new Date(now).getHours();
  if (hour < 5) return '夜深了，也别太累';
  if (hour < 11) return '早上好，种下今天的专注';
  if (hour < 14) return '中午好，慢慢来就好';
  if (hour < 18) return '下午好，来一段专注时光';
  return '晚上好，收好今天的小收获';
}

export function nextBreakPhase(focusesAfter: number, interval: number): Phase {
  const every = clamp(interval, 2, 8);
  return focusesAfter >= every ? 'longBreak' : 'shortBreak';
}

export function phaseAfterSkip(phase: Phase): Phase {
  return phase === 'focus' ? 'shortBreak' : 'focus';
}

export function phaseAfterCompletion(
  phase: Phase,
  focusesSinceLongBreak: number,
  interval: number,
): Phase {
  if (phase === 'focus') return nextBreakPhase(focusesSinceLongBreak + 1, interval);
  return 'focus';
}

export function isBreak(phase: Phase): boolean {
  return phase !== 'focus';
}
