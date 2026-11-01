import { useMemo, useState } from 'react';
import {
  Check,
  Circle,
  Clock3,
  ListTodo,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Target,
} from 'lucide-react';
import type { Task } from '../types';
import { useAppStore } from '../store/useAppStore';
import { formatFocusMinutes } from '../lib/time';
import { summarize } from '../lib/stats';
import { Modal, Stepper, TomatoDots } from '../components/ui';
import { Plant } from '../components/Plant';

function TaskRow({ task }: { task: Task }) {
  const activeTaskId = useAppStore((state) => state.activeTaskId);
  const setActiveTask = useAppStore((state) => state.setActiveTask);
  const startTask = useAppStore((state) => state.startTask);
  const toggleTask = useAppStore((state) => state.toggleTask);
  const deleteTask = useAppStore((state) => state.deleteTask);
  const running = useAppStore((state) => state.timer.status === 'running');
  const active = task.id === activeTaskId && !task.done;

  return (
    <li className="task-row" data-active={active ? 'true' : 'false'} data-done={task.done ? 'true' : 'false'}>
      <button
        type="button"
        className="task-check"
        aria-label={task.done ? `恢复任务：${task.title}` : `完成任务：${task.title}`}
        onClick={() => toggleTask(task.id)}
      >
        {task.done ? <Check size={15} /> : <Circle size={15} />}
      </button>

      <button type="button" className="task-main" onClick={() => setActiveTask(task.id)}>
        <span className="task-title">{task.title}</span>
        <span className="task-meta">
          <TomatoDots total={task.estimate} filled={task.completed} max={6} />
          <span>
            {task.completed} / {task.estimate} 个番茄
          </span>
          {active && <span className="task-chip">进行中</span>}
        </span>
      </button>

      <div className="task-actions">
        {!task.done && (
          <button
            type="button"
            className="icon-button task-play"
            title={running ? '切换到这段专注' : '开始专注这个任务'}
            aria-label={`开始专注：${task.title}`}
            onClick={() => startTask(task.id)}
          >
            <Play size={15} fill="currentColor" />
          </button>
        )}
        <button
          type="button"
          className="icon-button task-delete"
          title="删除任务"
          aria-label={`删除任务：${task.title}`}
          onClick={() => deleteTask(task.id)}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </li>
  );
}

export function TasksPage() {
  const tasks = useAppStore((state) => state.tasks);
  const addTask = useAppStore((state) => state.addTask);
  const clearCompleted = useAppStore((state) => state.clearCompleted);
  const sessions = useAppStore((state) => state.sessions);
  const settings = useAppStore((state) => state.settings);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [estimate, setEstimate] = useState(2);

  const openTasks = useMemo(() => tasks.filter((task) => !task.done), [tasks]);
  const doneTasks = useMemo(() => tasks.filter((task) => task.done), [tasks]);
  const planned = openTasks.reduce((sum, task) => sum + Math.max(0, task.estimate - task.completed), 0);
  const stats = summarize(sessions, settings, Date.now());

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const id = addTask(trimmed, estimate);
    if (id) {
      setTitle('');
      setEstimate(2);
      setOpen(false);
    }
  };

  return (
    <section className="page tasks-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">把大事情拆小</p>
          <h2>今日任务</h2>
          <p className="page-sub">为每件事估个番茄数，专注时只想着眼前这一段。</p>
        </div>
        <button type="button" className="primary-button" onClick={() => setOpen(true)}>
          <Plus size={17} /> 新建任务
        </button>
      </header>

      <div className="task-stats">
        <div className="task-stat">
          <span className="task-stat-icon">
            <ListTodo size={18} />
          </span>
          <div>
            <strong>{openTasks.length}</strong>
            <span>件待完成</span>
          </div>
        </div>
        <div className="task-stat">
          <span className="task-stat-icon">
            <Target size={18} />
          </span>
          <div>
            <strong>{planned}</strong>
            <span>个番茄待投入</span>
          </div>
        </div>
        <div className="task-stat">
          <span className="task-stat-icon">
            <Clock3 size={18} />
          </span>
          <div>
            <strong>{formatFocusMinutes(stats.todayMinutes)}</strong>
            <span>今日已专注</span>
          </div>
        </div>
      </div>

      <div className="task-panel">
        <div className="task-panel-head">
          <h3>待完成</h3>
          <span>{openTasks.length} 件</span>
        </div>
        {openTasks.length > 0 ? (
          <ul className="task-list">
            {openTasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <Plant type="tomato" size={92} seed={3} />
            <h4>今天的地还是空的</h4>
            <p>写下一件想推进的小事，然后种下第一颗番茄。</p>
            <button type="button" className="ghost-button" onClick={() => setOpen(true)}>
              <Plus size={15} /> 写下第一件事
            </button>
          </div>
        )}
      </div>

      {doneTasks.length > 0 && (
        <div className="task-panel done-panel">
          <div className="task-panel-head">
            <h3>已完成</h3>
            <button type="button" className="text-button" onClick={clearCompleted}>
              清空已完成
            </button>
          </div>
          <ul className="task-list">
            {doneTasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="新建任务"
        subtitle="一件具体、能在一两个番茄内推进的小事。"
        footer={
          <>
            <button type="button" className="ghost-button" onClick={() => setOpen(false)}>
              取消
            </button>
            <button type="button" className="primary-button" disabled={!title.trim()} onClick={submit}>
              种下任务
            </button>
          </>
        }
      >
        <label className="field">
          <span>任务名称</span>
          <input
            value={title}
            autoFocus
            maxLength={80}
            placeholder="例如：整理完本周的项目笔记"
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit();
            }}
          />
        </label>
        <div className="estimate-field">
          <div>
            <span className="field-title">预计番茄数</span>
            <p className="field-hint">一个番茄 = {settings.focusMin} 分钟专注</p>
          </div>
          <Stepper
            value={estimate}
            min={1}
            max={12}
            unit="个"
            label="预计番茄数"
            onChange={setEstimate}
          />
        </div>
        <div className="inline-tip">
          <Sparkles size={15} />
          <p>估少了也没关系，做了多少就记多少。</p>
        </div>
      </Modal>
    </section>
  );
}
