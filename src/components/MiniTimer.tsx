import { useAppStore } from '../store/useAppStore';
import { PHASE_HINT, PHASE_LABEL } from '../types';
import { formatClock } from '../lib/time';
import { Play, Pause, RotateCcw, SkipForward, Maximize2 } from 'lucide-react';
import { TomatoDots } from './ui';

export function MiniTimer() {
  const timer = useAppStore((state) => state.timer);
  const settings = useAppStore((state) => state.settings);
  const tasks = useAppStore((state) => state.tasks);
  const activeTaskId = useAppStore((state) => state.activeTaskId);
  const startTimer = useAppStore((state) => state.startTimer);
  const pauseTimer = useAppStore((state) => state.pauseTimer);
  const resetTimer = useAppStore((state) => state.resetTimer);
  const skipPhase = useAppStore((state) => state.skipPhase);

  const running = timer.status === 'running';
  const activeTask = tasks.find((task) => task.id === activeTaskId) ?? null;
  const progress = 1 - Math.min(1, Math.max(0, timer.remainingMs / Math.max(1, timer.durationMs)));
  const cycle =
    timer.phase === 'longBreak'
      ? settings.longBreakEvery
      : timer.focusesSinceLongBreak % settings.longBreakEvery;

  return (
    <div className="mini-timer" data-phase={timer.phase}>
      <div className="mini-phase">
        <span className="mini-phase-dot" />
        {PHASE_LABEL[timer.phase]}
      </div>
      <div className="mini-clock">{formatClock(timer.remainingMs)}</div>
      <div className="mini-progress">
        <span style={{ width: `${progress * 100}%` }} />
      </div>
      <p className="mini-task">{activeTask ? activeTask.title : PHASE_HINT[timer.phase]}</p>
      <div className="mini-controls">
        <button type="button" className="round-button" aria-label="重置计时" onClick={resetTimer}>
          <RotateCcw size={18} />
        </button>
        <button
          type="button"
          className="primary-timer-button mini-primary"
          data-running={running ? 'true' : 'false'}
          onClick={running ? pauseTimer : startTimer}
        >
          {running ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
          <span>{running ? '暂停' : timer.status === 'paused' ? '继续' : '开始'}</span>
        </button>
        <button type="button" className="round-button" aria-label="跳过当前阶段" onClick={skipPhase}>
          <SkipForward size={18} />
        </button>
      </div>
      <div className="mini-footer">
        <TomatoDots total={settings.longBreakEvery} filled={cycle} max={6} />
        <Maximize2 size={13} />
      </div>
    </div>
  );
}
