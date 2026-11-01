import { describe, expect, it } from 'vitest';
import {
  durationForPhase,
  formatClock,
  formatCompactMinutes,
  formatFocusMinutes,
  nextBreakPhase,
  phaseAfterCompletion,
  phaseAfterSkip,
  weekStart,
} from '../src/lib/time';
import { DEFAULT_SETTINGS } from '../src/types';

describe('time helpers', () => {
  it('formats the clock by rounding partial seconds up', () => {
    expect(formatClock(25 * 60_000)).toBe('25:00');
    expect(formatClock(59_001)).toBe('01:00');
    expect(formatClock(1_000)).toBe('00:01');
    expect(formatClock(-500)).toBe('00:00');
  });

  it('formats focus minutes for humans', () => {
    expect(formatFocusMinutes(25)).toBe('25 分钟');
    expect(formatFocusMinutes(60)).toBe('1 小时');
    expect(formatFocusMinutes(95)).toBe('1 小时 35 分钟');
    expect(formatCompactMinutes(95)).toBe('1h 35m');
  });

  it('derives phase duration from settings', () => {
    expect(durationForPhase('focus', DEFAULT_SETTINGS)).toBe(25 * 60_000);
    expect(durationForPhase('shortBreak', DEFAULT_SETTINGS)).toBe(5 * 60_000);
    expect(durationForPhase('longBreak', DEFAULT_SETTINGS)).toBe(15 * 60_000);
  });

  it('chooses a long break only after the configured cycle', () => {
    expect(nextBreakPhase(3, 4)).toBe('shortBreak');
    expect(nextBreakPhase(4, 4)).toBe('longBreak');
    expect(nextBreakPhase(4, 99)).toBe('shortBreak');
    expect(nextBreakPhase(8, 99)).toBe('longBreak');
  });

  it('moves to the next phase after completion or skip', () => {
    expect(phaseAfterCompletion('focus', 0, 4)).toBe('shortBreak');
    expect(phaseAfterCompletion('focus', 3, 4)).toBe('longBreak');
    expect(phaseAfterCompletion('shortBreak', 1, 4)).toBe('focus');
    expect(phaseAfterSkip('focus')).toBe('shortBreak');
    expect(phaseAfterSkip('longBreak')).toBe('focus');
  });

  it('starts the week on Monday', () => {
    const thursday = new Date(2026, 9, 29, 10, 30).getTime();
    const monday = weekStart(thursday);
    const date = new Date(monday);
    expect(date.getDay()).toBe(1);
    expect(date.getDate()).toBe(26);
    expect(date.getHours()).toBe(0);
  });
});
