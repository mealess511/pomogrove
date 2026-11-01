import type { FocusSession, PlantType } from '../types';
import { dayKey } from './time';

const BASE_POOL: PlantType[] = ['tomato', 'daisy', 'tulip', 'fern', 'daisy', 'tulip'];

export const PLANT_NAME: Record<PlantType, string> = {
  tomato: '小番茄',
  daisy: '雏菊',
  tulip: '郁金香',
  fern: '蕨叶',
  sunflower: '向日葵',
  mushroom: '红菇',
};

export const PLANT_RARITY: Record<PlantType, 'common' | 'rare'> = {
  tomato: 'common',
  daisy: 'common',
  tulip: 'common',
  fern: 'common',
  sunflower: 'rare',
  mushroom: 'rare',
};

export function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/**
 * Deterministic so a session always grows the same plant.
 * The first focus of a day is always a tomato; rarer plants appear on busy days.
 */
export function plantTypeForSession(sessionId: string, indexInDay: number): PlantType {
  const hash = hashString(sessionId);
  if (indexInDay === 0) return 'tomato';
  if (indexInDay >= 5 && hash % 4 === 0) return 'sunflower';
  if (indexInDay >= 7 && hash % 5 === 0) return 'mushroom';
  return BASE_POOL[(hash + indexInDay) % BASE_POOL.length];
}

export function plantsForDay(
  sessions: FocusSession[],
  day: number,
): Array<{ session: FocusSession; plant: PlantType }> {
  const key = dayKey(day);
  return sessions
    .filter((s) => dayKey(s.endedAt) === key)
    .sort((a, b) => a.endedAt - b.endedAt)
    .map((session, index) => ({
      session,
      plant: plantTypeForSession(session.id, index),
    }));
}
