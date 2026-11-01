import { describe, expect, it } from 'vitest';
import type { FocusSession } from '../src/types';
import {
  hashString,
  plantTypeForSession,
  plantsForDay,
  PLANT_NAME,
} from '../src/lib/garden';

function session(id: string, endedAt: number): FocusSession {
  return {
    id,
    taskId: null,
    taskTitle: null,
    startedAt: endedAt - 25 * 60_000,
    endedAt,
    minutes: 25,
  };
}

describe('garden', () => {
  it('hashes ids deterministically to positive integers', () => {
    expect(hashString('seed')).toBe(hashString('seed'));
    expect(hashString('seed')).toBeGreaterThanOrEqual(0);
    expect(hashString('seed')).not.toBe(hashString('other'));
  });

  it('always plants a tomato first in the day', () => {
    expect(plantTypeForSession('any-id', 0)).toBe('tomato');
    expect(PLANT_NAME.tomato).toBe('小番茄');
  });

  it('keeps a session plant stable across renders', () => {
    const first = plantTypeForSession('session-42', 2);
    expect(plantTypeForSession('session-42', 2)).toBe(first);
  });

  it('sorts the day by end time and maps one plant per session', () => {
    const day = new Date(2026, 9, 29, 12).getTime();
    const result = plantsForDay(
      [session('late', day + 3_600_000), session('early', day), session('other', day - 86_400_000)],
      day,
    );
    expect(result).toHaveLength(2);
    expect(result[0].session.id).toBe('early');
    expect(result[1].session.id).toBe('late');
    expect(result[0].plant).toBe('tomato');
  });
});
