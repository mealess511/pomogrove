import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { audio } from '../lib/audio';

/** Ambience only plays while a focus session is actively running. */
export function useAmbience(): void {
  const status = useAppStore((state) => state.timer.status);
  const phase = useAppStore((state) => state.timer.phase);
  const ambience = useAppStore((state) => state.settings.ambience);
  const volume = useAppStore((state) => state.settings.ambienceVolume);

  useEffect(() => {
    if (status === 'running' && phase === 'focus' && ambience !== 'none') {
      audio.setAmbience(ambience, volume);
    } else {
      audio.stopAmbience();
    }
    return () => {
      audio.stopAmbience();
    };
  }, [status, phase, ambience, volume]);
}
