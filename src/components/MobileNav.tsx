import { ListTodo, Settings, Sprout, Timer } from 'lucide-react';
import type { AppView } from '../types';
import { useAppStore } from '../store/useAppStore';

const ITEMS: { id: AppView; label: string; icon: typeof Timer }[] = [
  { id: 'timer', label: '计时', icon: Timer },
  { id: 'tasks', label: '任务', icon: ListTodo },
  { id: 'garden', label: '花园', icon: Sprout },
  { id: 'settings', label: '设置', icon: Settings },
];

export function MobileNav() {
  const view = useAppStore((state) => state.view);
  const setView = useAppStore((state) => state.setView);
  return (
    <nav className="mobile-nav" aria-label="底部导航">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            className="mobile-nav-item"
            data-active={view === item.id ? 'true' : 'false'}
            onClick={() => setView(item.id)}
          >
            <Icon size={21} strokeWidth={1.9} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
