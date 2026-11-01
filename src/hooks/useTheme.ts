import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { configureNativeUi } from '../lib/platform';

export function useTheme(): void {
  const theme = useAppStore((state) => state.settings.theme);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      const meta = document.querySelector('meta[name="theme-color"]');
      meta?.setAttribute('content', dark ? '#0F1713' : '#F7F1E7');
      void configureNativeUi(dark);
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}
