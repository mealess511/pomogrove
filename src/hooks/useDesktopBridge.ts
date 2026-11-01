import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { PHASE_LABEL } from '../types';
import { formatClock } from '../lib/time';

export function useDesktopBridge(): { maximized: boolean } {
  const [maximized, setMaximized] = useState(false);
  const alwaysOnTop = useAppStore((state) => state.settings.alwaysOnTop);
  const closeToTray = useAppStore((state) => state.settings.closeToTray);
  const autoLaunch = useAppStore((state) => state.settings.autoLaunch);

  useEffect(() => {
    const api = window.pomogrove;
    if (!api) return;
    void api.setAlwaysOnTop(alwaysOnTop);
  }, [alwaysOnTop]);

  useEffect(() => {
    const api = window.pomogrove;
    if (!api) return;
    void api.setCloseToTray(closeToTray);
  }, [closeToTray]);

  useEffect(() => {
    const api = window.pomogrove;
    if (!api) return;
    void api.setAutoLaunch(autoLaunch);
  }, [autoLaunch]);

  useEffect(() => {
    const api = window.pomogrove;
    if (!api) return;
    const unsubscribeWindow = api.onWindowState((state) => setMaximized(state.maximized));
    const unsubscribeTray = api.onTrayToggle(() => {
      const store = useAppStore.getState();
      if (store.timer.status === 'running') store.pauseTimer();
      else store.startTimer();
    });
    return () => {
      unsubscribeWindow();
      unsubscribeTray();
    };
  }, []);

  useEffect(() => {
    const api = window.pomogrove;
    if (!api) return;
    let lastLabel = '';
    const sync = () => {
      const timer = useAppStore.getState().timer;
      const label =
        timer.status === 'running'
          ? `${PHASE_LABEL[timer.phase]} ${formatClock(timer.remainingMs)}`
          : timer.status === 'paused'
            ? `${PHASE_LABEL[timer.phase]} · 已暂停`
            : '准备开始';
      if (label !== lastLabel) {
        lastLabel = label;
        api.updateTimerState({
          phase: timer.phase,
          status: timer.status,
          remainingMs: timer.remainingMs,
          label,
        });
      }
      const progress =
        timer.status === 'running'
          ? Math.min(1, Math.max(0, 1 - timer.remainingMs / timer.durationMs))
          : -1;
      void api.setProgress(progress);
    };
    sync();
    const interval = window.setInterval(sync, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return { maximized };
}
