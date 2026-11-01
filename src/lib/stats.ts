import type { FocusSession, Settings } from '../types';
import {
  addDays,
  dayKey,
  formatCompactMinutes,
  startOfDay,
  weekStart,
  weekdayShort,
} from './time';

export interface DayRecord {
  key: string;
  date: number;
  minutes: number;
  count: number;
}

export interface WeekBar extends DayRecord {
  label: string;
  isToday: boolean;
}

export interface Summary {
  todayMinutes: number;
  todayCount: number;
  weekMinutes: number;
  weekCount: number;
  totalCount: number;
  totalMinutes: number;
  streak: number;
  longestStreak: number;
  bestDayCount: number;
  goalPercent: number;
}

export interface HeatCell {
  key: string;
  date: number;
  minutes: number;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  value: number;
  target: number;
  unit: string;
  unlocked: boolean;
}

export interface TaskShare {
  title: string;
  minutes: number;
  count: number;
  percent: number;
}

function buildDayMap(sessions: FocusSession[]): Map<string, DayRecord> {
  const map = new Map<string, DayRecord>();
  for (const session of sessions) {
    const key = dayKey(session.endedAt);
    const existing = map.get(key);
    if (existing) {
      existing.minutes += session.minutes;
      existing.count += 1;
    } else {
      map.set(key, {
        key,
        date: startOfDay(session.endedAt),
        minutes: session.minutes,
        count: 1,
      });
    }
  }
  return map;
}

function computeLongestStreak(map: Map<string, DayRecord>): number {
  if (map.size === 0) return 0;
  const days = [...map.values()].map((d) => d.date).sort((a, b) => a - b);
  let longest = 1;
  let current = 1;
  for (let i = 1; i < days.length; i += 1) {
    if (dayKey(addDays(days[i - 1], 1)) === dayKey(days[i])) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

function computeCurrentStreak(map: Map<string, DayRecord>, now: number): number {
  let cursor = startOfDay(now);
  if (!map.has(dayKey(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (map.has(dayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function summarize(
  sessions: FocusSession[],
  settings: Settings,
  now: number,
): Summary {
  const map = buildDayMap(sessions);
  const today = map.get(dayKey(now));
  const weekFrom = weekStart(now);
  let weekMinutes = 0;
  let weekCount = 0;
  for (let i = 0; i < 7; i += 1) {
    const record = map.get(dayKey(addDays(weekFrom, i)));
    if (record) {
      weekMinutes += record.minutes;
      weekCount += record.count;
    }
  }
  const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);
  const totalCount = sessions.length;
  const goalMinutes = Math.max(1, settings.dailyGoal) * settings.focusMin;
  const bestDayCount = Math.max(0, ...[...map.values()].map((d) => d.count));
  return {
    todayMinutes: today?.minutes ?? 0,
    todayCount: today?.count ?? 0,
    weekMinutes,
    weekCount,
    totalCount,
    totalMinutes,
    streak: computeCurrentStreak(map, now),
    longestStreak: computeLongestStreak(map),
    bestDayCount,
    goalPercent: Math.min(100, Math.round(((today?.minutes ?? 0) / goalMinutes) * 100)),
  };
}

export function weeklyBars(sessions: FocusSession[], now: number): WeekBar[] {
  const map = buildDayMap(sessions);
  const from = weekStart(now);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(from, i);
    const record = map.get(dayKey(date));
    return {
      key: dayKey(date),
      date,
      minutes: record?.minutes ?? 0,
      count: record?.count ?? 0,
      label: weekdayShort(date),
      isToday: dayKey(date) === dayKey(now),
    };
  });
}

export function heatmap(sessions: FocusSession[], now: number): HeatCell[] {
  const map = buildDayMap(sessions);
  const end = startOfDay(now);
  const from = addDays(weekStart(now), -11 * 7);
  return Array.from({ length: 84 }, (_, i) => {
    const date = addDays(from, i);
    const record = map.get(dayKey(date));
    const minutes = record?.minutes ?? 0;
    const level: HeatCell['level'] =
      minutes <= 0 ? 0 : minutes < 25 ? 1 : minutes < 50 ? 2 : minutes < 100 ? 3 : 4;
    return {
      key: dayKey(date),
      date,
      minutes,
      count: record?.count ?? 0,
      level,
      future: date > end,
    };
  });
}

export function achievements(summary: Summary): Achievement[] {
  return [
    {
      id: 'first-seed',
      title: '第一颗种子',
      description: '完成第 1 个番茄',
      value: Math.min(summary.totalCount, 1),
      target: 1,
      unit: '个',
      unlocked: summary.totalCount >= 1,
    },
    {
      id: 'streak-3',
      title: '三日园丁',
      description: '连续专注 3 天',
      value: Math.min(summary.longestStreak, 3),
      target: 3,
      unit: '天',
      unlocked: summary.longestStreak >= 3,
    },
    {
      id: 'day-8',
      title: '满园春色',
      description: '单日完成 8 个番茄',
      value: Math.min(summary.bestDayCount, 8),
      target: 8,
      unit: '个',
      unlocked: summary.bestDayCount >= 8,
    },
    {
      id: 'week-7',
      title: '一周不断',
      description: '连续专注 7 天',
      value: Math.min(summary.longestStreak, 7),
      target: 7,
      unit: '天',
      unlocked: summary.longestStreak >= 7,
    },
    {
      id: 'total-100',
      title: '百颗番茄',
      description: '累计完成 100 个番茄',
      value: Math.min(summary.totalCount, 100),
      target: 100,
      unit: '个',
      unlocked: summary.totalCount >= 100,
    },
    {
      id: 'minutes-1000',
      title: '千分专注',
      description: '累计专注 1000 分钟',
      value: Math.min(summary.totalMinutes, 1000),
      target: 1000,
      unit: '分',
      unlocked: summary.totalMinutes >= 1000,
    },
  ];
}

export function taskBreakdown(sessions: FocusSession[], now: number): TaskShare[] {
  const from = addDays(now, -30);
  const recent = sessions.filter((s) => s.endedAt >= from && s.taskTitle);
  const totals = new Map<string, { minutes: number; count: number }>();
  for (const session of recent) {
    const title = session.taskTitle as string;
    const current = totals.get(title);
    if (current) {
      current.minutes += session.minutes;
      current.count += 1;
    } else {
      totals.set(title, { minutes: session.minutes, count: 1 });
    }
  }
  const total = [...totals.values()].reduce((sum, item) => sum + item.minutes, 0);
  return [...totals.entries()]
    .map(([title, value]) => ({
      title,
      minutes: value.minutes,
      count: value.count,
      percent: total > 0 ? Math.round((value.minutes / total) * 100) : 0,
    }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5);
}

export function weekHeadline(minutes: number): string {
  if (minutes === 0) return '新的一周，从第一颗番茄开始';
  return `本周已专注 ${formatCompactMinutes(minutes)}`;
}
