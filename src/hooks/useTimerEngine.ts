import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { PHASE_LABEL } from '../types';
import { formatClock } from '../lib/time';

/** Drives the countdown from an absolute end timestamp, so backgrounding never loses time. */
export function useTimerEngine(): void {
  useEffect(() => {
    const step = () => useAppStore.getState().tick(Date.now());
    step();
    const interval = window.setInterval(step, 250);
    const onVisibility = () => {
      if (!document.hidden) step();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    const updateTitle = () => {
      const timer = useAppStore.getState().timer;
      if (timer.status === 'running') {
        document.title = `${formatClock(timer.remainingMs)} · ${PHASE_LABEL[timer.phase]} | 番茄小园`;
      } else if (timer.status === 'paused') {
        document.title = `${formatClock(timer.remainingMs)} · 已暂停 | 番茄小园`;
      } else {
        document.title = '番茄小园 · 专注，种一座花园';
      }
    };
    updateTitle();
    const interval = window.setInterval(updateTitle, 500);
    return () => window.clearInterval(interval);
  }, []);
}
