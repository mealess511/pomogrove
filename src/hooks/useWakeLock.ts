import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export function useWakeLock(): void {
  const active = useAppStore(
    (state) => state.settings.keepAwake && state.timer.status === 'running',
  );

  useEffect(() => {
    const api = window.pomogrove;
    void api?.setKeepAwake(active);
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      if (cancelled || document.hidden) return;
      try {
        sentinel = await navigator.wakeLock.request('screen');
      } catch {
        /* wake lock may be denied by the browser */
      }
    };
    const onVisibility = () => {
      if (!document.hidden && !sentinel) void acquire();
    };
    void acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void sentinel?.release().catch(() => undefined);
    };
  }, [active]);
}
