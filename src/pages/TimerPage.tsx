import {
  ArrowRight,
  AudioLines,
  Check,
  CloudRain,
  Coffee,
  Flame,
  ListTodo,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Sparkles,
  Trees,
  Volume2,
  VolumeX,
  Waves,
} from 'lucide-react';
import { useState } from 'react';
import type { Ambience, Phase } from '../types';
import { AMBIENCE_LABEL, PHASE_EYEBROW, PHASE_HINT, PHASE_LABEL } from '../types';
import { useAppStore } from '../store/useAppStore';
import { formatClock, formatFocusMinutes } from '../lib/time';
import { summarize } from '../lib/stats';
import { TomatoDots } from '../components/ui';
import { MusicCard, MusicLibrary } from '../components/MusicLibrary';

const PHASES: Phase[] = ['focus', 'shortBreak', 'longBreak'];

const AMBIENCES: { id: Ambience; icon: typeof CloudRain }[] = [
  { id: 'none', icon: VolumeX },
  { id: 'rain', icon: CloudRain },
  { id: 'forest', icon: Trees },
  { id: 'cafe', icon: Coffee },
  { id: 'waves', icon: Waves },
  { id: 'white', icon: AudioLines },
];

const RING_RADIUS = 138;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function TimerPage() {
  const [musicOpen, setMusicOpen] = useState(false);
  const timer = useAppStore((state) => state.timer);
  const settings = useAppStore((state) => state.settings);
  const tasks = useAppStore((state) => state.tasks);
  const sessions = useAppStore((state) => state.sessions);
  const activeTaskId = useAppStore((state) => state.activeTaskId);
  const startTimer = useAppStore((state) => state.startTimer);
  const pauseTimer = useAppStore((state) => state.pauseTimer);
  const resetTimer = useAppStore((state) => state.resetTimer);
  const skipPhase = useAppStore((state) => state.skipPhase);
  const setPhase = useAppStore((state) => state.setPhase);
  const setView = useAppStore((state) => state.setView);
  const toggleTask = useAppStore((state) => state.toggleTask);
  const updateSettings = useAppStore((state) => state.updateSettings);

  const running = timer.status === 'running';
  const paused = timer.status === 'paused';
  const progress = Math.min(1, Math.max(0, timer.remainingMs / Math.max(1, timer.durationMs)));
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);
  const activeTask = tasks.find((task) => task.id === activeTaskId) ?? null;
  const stats = summarize(sessions, settings, Date.now());
  const cycle =
    timer.phase === 'longBreak'
      ? settings.longBreakEvery
      : timer.focusesSinceLongBreak % settings.longBreakEvery;

  const mainLabel = running
    ? '暂停'
    : paused
      ? '继续'
      : timer.phase === 'focus'
        ? '开始专注'
        : '开始休息';

  return (
    <section className="page timer-page">
      <div className="timer-layout">
        <div className="timer-main">
          <header className="page-head timer-head">
            <div>
              <p className="eyebrow">今天也慢慢来</p>
              <h2>把注意力，种在这里</h2>
              <p className="page-sub">一次只做一件事，二十五分钟就很好。</p>
            </div>
            <div className="timer-head-badge">
              <Flame size={15} />
              <span>连续 {stats.streak} 天</span>
            </div>
          </header>

          <div className="timer-card" data-phase={timer.phase} data-running={running}>
            <div className="phase-tabs" role="tablist" aria-label="计时阶段">
              {PHASES.map((phase) => (
                <button
                  key={phase}
                  type="button"
                  role="tab"
                  aria-selected={timer.phase === phase}
                  className="phase-tab"
                  data-active={timer.phase === phase ? 'true' : 'false'}
                  disabled={running}
                  onClick={() => setPhase(phase)}
                >
                  {PHASE_LABEL[phase]}
                </button>
              ))}
            </div>

            <div className="timer-ring-wrap">
              <svg className="timer-ring" viewBox="0 0 320 320" aria-hidden="true">
                <circle className="timer-ring-track" cx="160" cy="160" r={RING_RADIUS} />
                <circle
                  className="timer-ring-progress"
                  cx="160"
                  cy="160"
                  r={RING_RADIUS}
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 160 160)"
                />
              </svg>
              <div className="timer-ring-inner">
                <p className="timer-eyebrow">{PHASE_EYEBROW[timer.phase]}</p>
                <div className="timer-clock" data-status={timer.status}>
                  {formatClock(timer.remainingMs)}
                  {running && <span className="timer-live-dot" aria-hidden="true" />}
                </div>
                <p className="timer-phase-hint">
                  {paused ? '先深呼吸，准备好了再继续' : PHASE_HINT[timer.phase]}
                </p>
              </div>
            </div>

            <div className="timer-controls">
              <button type="button" className="round-button" aria-label="重置计时" onClick={resetTimer}>
                <RotateCcw size={19} />
              </button>
              <button
                type="button"
                className="primary-timer-button"
                data-running={running ? 'true' : 'false'}
                onClick={running ? pauseTimer : startTimer}
              >
                {running ? <Pause size={22} /> : <Play size={22} fill="currentColor" />}
                <span>{mainLabel}</span>
              </button>
              <button type="button" className="round-button" aria-label="跳过当前阶段" onClick={skipPhase}>
                <SkipForward size={19} />
              </button>
            </div>

            <div className="timer-cycle">
              <span>距离长休息</span>
              <TomatoDots total={settings.longBreakEvery} filled={cycle} max={8} />
              <span>{settings.longBreakEvery - cycle} 颗</span>
            </div>

            <p className="timer-keyboard-hint">
              <kbd>空格</kbd> 开始 / 暂停
              <span>·</span>
              <kbd>R</kbd> 重置
              <span>·</span>
              <kbd>S</kbd> 跳过
            </p>
          </div>

          <div className="ambience-row" aria-label="环境音">
            <span className="ambience-title">
              <Volume2 size={15} /> 环境音
            </span>
            <div className="ambience-options">
              {AMBIENCES.map((item) => {
                const Icon = item.icon;
                const active = settings.ambience === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="ambience-chip"
                    data-active={active ? 'true' : 'false'}
                    onClick={() => updateSettings({ ambience: active ? 'none' : item.id })}
                  >
                    <Icon size={14} />
                    {AMBIENCE_LABEL[item.id]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="timer-side">
          <div className="active-task-card">
            <div className="active-task-head">
              <span className="card-label">
                <ListTodo size={14} /> 当前任务
              </span>
              {activeTask && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => toggleTask(activeTask.id)}
                >
                  <Check size={14} /> 完成
                </button>
              )}
            </div>
            {activeTask ? (
              <>
                <h3>{activeTask.title}</h3>
                <p className="active-task-meta">
                  已完成 {activeTask.completed} / {activeTask.estimate} 个番茄
                </p>
                <div className="task-progress">
                  <span
                    style={{
                      width: `${Math.min(100, (activeTask.completed / Math.max(1, activeTask.estimate)) * 100)}%`,
                    }}
                  />
                </div>
                <button type="button" className="ghost-button" onClick={() => setView('tasks')}>
                  管理任务 <ArrowRight size={14} />
                </button>
              </>
            ) : (
              <>
                <h3 className="muted-heading">还没有选中的任务</h3>
                <p className="active-task-meta">先写下今天想推进的一件小事。</p>
                <button type="button" className="ghost-button" onClick={() => setView('tasks')}>
                  去挑选任务 <ArrowRight size={14} />
                </button>
              </>
            )}
          </div>

          <div className="today-summary-card">
            <span className="card-label">今日收成</span>
            <div className="summary-numbers">
              <div>
                <strong>{stats.todayCount}</strong>
                <span>颗番茄</span>
              </div>
              <div>
                <strong>{formatFocusMinutes(stats.todayMinutes)}</strong>
                <span>专注时长</span>
              </div>
            </div>
            <div className="goal-line">
              <span>目标 {settings.dailyGoal} 颗</span>
              <span>{Math.round(stats.goalPercent)}%</span>
            </div>
            <div className="progress-track">
              <span style={{ width: `${Math.min(100, stats.goalPercent)}%` }} />
            </div>
          </div>

          <MusicCard onOpen={() => setMusicOpen(true)} />

          <div className="tip-card">
            <Sparkles size={16} />
            <p>把手机放到看不见的地方，专注会容易很多。</p>
          </div>
        </aside>
      </div>
      <MusicLibrary open={musicOpen} onClose={() => setMusicOpen(false)} />
    </section>
  );
}
