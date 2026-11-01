import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const store = useAppStore.getState();
      if (event.code === 'Space') {
        event.preventDefault();
        if (store.timer.status === 'running') store.pauseTimer();
        else store.startTimer();
        return;
      }
      if (event.key === 'r' || event.key === 'R') {
        store.resetTimer();
        return;
      }
      if (event.key === 's' || event.key === 'S') {
        store.skipPhase();
        return;
      }
      if (event.key === '1') store.setPhase('focus');
      if (event.key === '2') store.setPhase('shortBreak');
      if (event.key === '3') store.setPhase('longBreak');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
