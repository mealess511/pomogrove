import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import type { AppView } from './types';
import { useAppStore } from './store/useAppStore';
import { useMusicStore } from './store/useMusicStore';
import { useTimerEngine } from './hooks/useTimerEngine';
import { useTheme } from './hooks/useTheme';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAmbience } from './hooks/useAmbience';
import { useDesktopBridge } from './hooks/useDesktopBridge';
import { useWakeLock } from './hooks/useWakeLock';
import { hideSplash, onBackButton } from './lib/platform';
import { Sidebar } from './components/Sidebar';
import { TitleBar } from './components/TitleBar';
import { MobileNav } from './components/MobileNav';
import { MiniTimer } from './components/MiniTimer';
import { Celebration } from './components/Celebration';
import { ToastStack } from './components/ToastStack';
import { TimerPage } from './pages/TimerPage';
import { TasksPage } from './pages/TasksPage';
import { GardenPage } from './pages/GardenPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  const view = useAppStore((state) => state.view);
  const setView = useAppStore((state) => state.setView);
  const hydrateLocalMusic = useMusicStore((state) => state.hydrateLocal);
  const [mini, setMini] = useState(false);
  const { maximized } = useDesktopBridge();

  useTimerEngine();
  useTheme();
  useKeyboardShortcuts();
  useAmbience();
  useWakeLock();

  useEffect(() => {
    void hydrateLocalMusic();
  }, [hydrateLocalMusic]);

  useEffect(() => {
    void hideSplash();
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    void onBackButton(() => {
      const state = useAppStore.getState();
      if (state.celebration) {
        state.dismissCelebration();
        return true;
      }
      if (state.view !== 'timer') {
        state.setView('timer');
        return true;
      }
      return false;
    }).then((dispose) => {
      if (cancelled) dispose();
      else cleanup = dispose;
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  const toggleMini = () => {
    setMini((current) => {
      const next = !current;
      void window.pomogrove?.setMiniMode(next);
      if (next) setView('timer');
      return next;
    });
  };

  const pages: Record<AppView, ReactElement> = {
    timer: <TimerPage />,
    tasks: <TasksPage />,
    garden: <GardenPage />,
    settings: <SettingsPage />,
  };

  return (
    <div className="app" data-mini={mini ? 'true' : 'false'}>
      <TitleBar maximized={maximized} mini={mini} onToggleMini={toggleMini} />
      <div className="app-body">
        {!mini && <Sidebar />}
        <main className="app-main" data-view={mini ? 'mini' : view}>
          {mini ? <MiniTimer /> : <div className="view" key={view}>{pages[view]}</div>}
        </main>
      </div>
      {!mini && <MobileNav />}
      <Celebration />
      <ToastStack />
    </div>
  );
}
