import { ListTodo, Settings, Sprout, Timer } from 'lucide-react';
import type { AppView } from '../types';
import { useAppStore } from '../store/useAppStore';
import { summarize } from '../lib/stats';
import { Logo } from './Plant';

const NAV: { id: AppView; label: string; hint: string; icon: typeof Timer }[] = [
  { id: 'timer', label: '计时', hint: '专注与休息', icon: Timer },
  { id: 'tasks', label: '任务', hint: '今天要做的事', icon: ListTodo },
  { id: 'garden', label: '花园', hint: '你的专注收成', icon: Sprout },
  { id: 'settings', label: '设置', hint: '按你的节奏来', icon: Settings },
];

export function Sidebar() {
  const view = useAppStore((state) => state.view);
  const setView = useAppStore((state) => state.setView);
  const tasks = useAppStore((state) => state.tasks);
  const sessions = useAppStore((state) => state.sessions);
  const settings = useAppStore((state) => state.settings);
  const stats = summarize(sessions, settings, Date.now());
  const openTasks = tasks.filter((task) => !task.done).length;

  return (
    <aside className="sidebar">
      <div className="brand">
        <Logo size={42} />
        <div className="brand-copy">
          <h1>番茄小园</h1>
          <p>一平方米的专注</p>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="主导航">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className="nav-item"
              data-active={view === item.id ? 'true' : 'false'}
              onClick={() => setView(item.id)}
            >
              <span className="nav-icon">
                <Icon size={19} strokeWidth={1.9} />
              </span>
              <span className="nav-copy">
                <span className="nav-label">{item.label}</span>
                <span className="nav-hint">{item.hint}</span>
              </span>
              {item.id === 'tasks' && openTasks > 0 && (
                <span className="nav-badge">{openTasks}</span>
              )}
              {item.id === 'garden' && stats.totalCount > 0 && (
                <span className="nav-badge nav-badge-soft">{stats.totalCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <div className="today-card">
          <div className="today-card-head">
            <span>今日专注</span>
            <span className="today-card-streak">
              {stats.streak > 0 ? `连续 ${stats.streak} 天` : '从今天开始'}
            </span>
          </div>
          <div className="today-card-count">
            <strong>{stats.todayCount}</strong>
            <span>/ {settings.dailyGoal} 个番茄</span>
          </div>
          <div className="progress-track" aria-hidden="true">
            <span style={{ width: `${Math.min(100, stats.goalPercent)}%` }} />
          </div>
          <p className="today-card-foot">
            {stats.todayMinutes > 0
              ? `已经专注 ${stats.todayMinutes} 分钟`
              : '种下今天的第一颗番茄吧'}
          </p>
        </div>
        <p className="sidebar-signature">PomoGrove · 本地运行，数据留在你手里</p>
      </div>
    </aside>
  );
}
