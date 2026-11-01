import { Copy, Maximize2, Minus, PictureInPicture2, Pin, PinOff, X } from 'lucide-react';
import { isDesktop } from '../lib/platform';
import { useAppStore } from '../store/useAppStore';
import { IconButton, TomatoDots } from './ui';

interface TitleBarProps {
  maximized: boolean;
  mini: boolean;
  onToggleMini: () => void;
}

export function TitleBar({ maximized, mini, onToggleMini }: TitleBarProps) {
  const pinned = useAppStore((state) => state.settings.alwaysOnTop);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const timer = useAppStore((state) => state.timer);
  const interval = useAppStore((state) => state.settings.longBreakEvery);
  const api = typeof window !== 'undefined' ? window.pomogrove : undefined;

  if (!isDesktop || !api) return null;

  const cycle = timer.focusesSinceLongBreak % interval;

  return (
    <header className="titlebar" onDoubleClick={() => void api.toggleMaximize()}>
      <div className="titlebar-brand">
        <span className="titlebar-dot" />
        <span>番茄小园</span>
        <span className="titlebar-sep">·</span>
        <span className="titlebar-sub">PomoGrove</span>
      </div>
      <div className="titlebar-center">
        <TomatoDots total={interval} filled={cycle} max={6} />
      </div>
      <div className="titlebar-actions" onDoubleClick={(event) => event.stopPropagation()}>
        <IconButton
          label={pinned ? '取消窗口置顶' : '窗口置顶'}
          className="titlebar-button"
          onClick={() => updateSettings({ alwaysOnTop: !pinned })}
        >
          {pinned ? <Pin size={14} /> : <PinOff size={14} />}
        </IconButton>
        <IconButton
          label={mini ? '退出迷你模式' : '迷你模式'}
          className="titlebar-button"
          onClick={onToggleMini}
        >
          <PictureInPicture2 size={14} />
        </IconButton>
        <IconButton label="最小化" className="titlebar-button" onClick={() => void api.minimize()}>
          <Minus size={15} />
        </IconButton>
        <IconButton
          label={maximized ? '还原' : '最大化'}
          className="titlebar-button"
          onClick={() => void api.toggleMaximize()}
        >
          {maximized ? <Copy size={13} /> : <Maximize2 size={13} />}
        </IconButton>
        <IconButton
          label="关闭"
          className="titlebar-button titlebar-close"
          onClick={() => void api.close()}
        >
          <X size={15} />
        </IconButton>
      </div>
    </header>
  );
}
