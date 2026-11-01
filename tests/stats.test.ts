import { describe, expect, it } from 'vitest';
import type { FocusSession } from '../src/types';
import { DEFAULT_SETTINGS } from '../src/types';
import {
  achievements,
  heatmap,
  summarize,
  taskBreakdown,
  weeklyBars,
} from '../src/lib/stats';

function session(
  id: string,
  endedAt: number,
  minutes = 25,
  taskTitle: string | null = null,
): FocusSession {
  return {
    id,
    taskId: taskTitle ? `task-${id}` : null,
    taskTitle,
    startedAt: endedAt - minutes * 60_000,
    endedAt,
    minutes,
  };
}

describe('stats', () => {
  const now = new Date(2026, 9, 29, 18, 0).getTime(); // Thursday
  const day = (offset: number, hour = 10) =>
    new Date(2026, 9, 29 + offset, hour).getTime();

  const sessions = [
    session('a', day(0, 9)),
    session('b', day(0, 14), 25, '写完需求'),
    session('c', day(-1)),
    session('d', day(-2)),
    session('e', day(-10)),
  ];

  it('summarizes today, week, totals and streak', () => {
    const summary = summarize(sessions, DEFAULT_SETTINGS, now);
    expect(summary.todayMinutes).toBe(50);
    expect(summary.todayCount).toBe(2);
    expect(summary.weekMinutes).toBe(100);
    expect(summary.weekCount).toBe(4);
    expect(summary.totalCount).toBe(5);
    expect(summary.totalMinutes).toBe(125);
    expect(summary.streak).toBe(3);
    expect(summary.longestStreak).toBe(3);
    expect(summary.bestDayCount).toBe(2);
    expect(summary.goalPercent).toBe(25);
  });

  it('handles an empty garden', () => {
    const summary = summarize([], DEFAULT_SETTINGS, now);
    expect(summary.todayMinutes).toBe(0);
    expect(summary.streak).toBe(0);
    expect(summary.goalPercent).toBe(0);
  });

  it('builds seven weekly bars with today marked', () => {
    const bars = weeklyBars(sessions, now);
    expect(bars).toHaveLength(7);
    expect(bars[0].label).toBe('一');
    expect(bars[6].label).toBe('日');
    expect(bars.filter((bar) => bar.isToday)).toHaveLength(1);
    expect(bars[1].minutes).toBe(25);
    expect(bars[2].minutes).toBe(25);
    expect(bars[3].minutes).toBe(50);
  });

  it('builds eighty-four heatmap cells ending on the current week', () => {
    const cells = heatmap(sessions, now);
    expect(cells).toHaveLength(84);
    expect(cells[cells.length - 1].future).toBe(true);
    const today = cells.find(
      (cell) =>
        cell.date >= new Date(2026, 9, 29).getTime() &&
        cell.date < new Date(2026, 9, 30).getTime(),
    );
    expect(today?.minutes).toBe(50);
    expect(today?.level).toBe(3);
  });

  it('unlocks achievements from the summary', () => {
    const summary = summarize(sessions, DEFAULT_SETTINGS, now);
    const list = achievements(summary);
    expect(list.find((item) => item.id === 'first-seed')?.unlocked).toBe(true);
    expect(list.find((item) => item.id === 'streak-3')?.unlocked).toBe(true);
    expect(list.find((item) => item.id === 'total-100')?.unlocked).toBe(false);
  });

  it('breaks down time by task for the last thirty days', () => {
    const share = taskBreakdown(sessions, now);
    expect(share).toHaveLength(1);
    expect(share[0].title).toBe('写完需求');
    expect(share[0].minutes).toBe(25);
    expect(share[0].percent).toBe(100);
  });
});
