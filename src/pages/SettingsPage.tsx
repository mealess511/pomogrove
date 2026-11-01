import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  Bell,
  Download,
  Info,
  Keyboard,
  Monitor,
  Moon,
  Pin,
  Power,
  ShieldCheck,
  Sun,
  Timer,
  Trash2,
  Upload,
  Vibrate,
  Volume2,
} from 'lucide-react';
import type { Ambience, CompletionSound, Settings, ThemeMode } from '../types';
import { AMBIENCE_LABEL } from '../types';
import { useAppStore } from '../store/useAppStore';
import { audio } from '../lib/audio';
import { isAndroid, isDesktop, platformName, requestNotifications } from '../lib/platform';
import { Kbd, Modal, Stepper, Toggle } from '../components/ui';

const THEMES: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: '浅色', icon: Sun },
  { id: 'dark', label: '深色', icon: Moon },
  { id: 'system', label: '跟随系统', icon: Monitor },
];

const SOUNDS: { id: CompletionSound; label: string }[] = [
  { id: 'chime', label: '轻柔风铃' },
  { id: 'bell', label: '木鱼钟声' },
  { id: 'none', label: '不提醒' },
];

const AMBIENCES: Ambience[] = ['none', 'rain', 'forest', 'cafe', 'waves', 'white'];

export function SettingsPage() {
  const settings = useAppStore((state) => state.settings);
  const tasks = useAppStore((state) => state.tasks);
  const sessions = useAppStore((state) => state.sessions);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const showToast = useAppStore((state) => state.showToast);
  const importBackup = useAppStore((state) => state.importBackup);
  const resetAll = useAppStore((state) => state.resetAll);
  const fileRef = useRef<HTMLInputElement>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const patch = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    updateSettings({ [key]: value } as Partial<Settings>);
  };

  const toggleNotifications = async (next: boolean) => {
    if (next) {
      const granted = await requestNotifications();
      if (!granted) {
        showToast('系统还没有允许通知，去系统设置里打开吧', 'warn');
        return;
      }
    }
    patch('notifications', next);
  };

  const exportData = async () => {
    const payload = {
      app: 'pomogrove',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      tasks,
      sessions,
      activeTaskId: useAppStore.getState().activeTaskId,
    };
    const text = JSON.stringify(payload, null, 2);

    // Android WebView 不接受 <a download>，优先走系统分享，退回复制到剪贴板。
    if (isAndroid) {
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: '番茄小园备份', text });
          showToast('备份已交给系统分享', 'success');
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
        }
      }
      try {
        await navigator.clipboard.writeText(text);
        showToast('备份已复制到剪贴板，粘贴到笔记里保存吧', 'success');
        return;
      } catch {
        showToast('当前系统不支持直接分享备份，请改用 Windows 版导出', 'warn');
        return;
      }
    }

    const blob = new Blob([text], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `pomogrove-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showToast('备份已导出，收好这份花园档案', 'success');
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      const ok = importBackup(parsed);
      if (!ok) showToast('这个文件看起来不是番茄小园的备份', 'warn');
    } catch {
      showToast('文件读取失败，请换一个备份试试', 'warn');
    }
  };

  const testSound = () => {
    void audio.unlock();
    void audio.playCompletion(settings.completionSound, settings.volume);
  };

  return (
    <section className="page settings-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">按你的节奏来</p>
          <h2>设置</h2>
          <p className="page-sub">番茄没有唯一正确的长度，适合你的才最好。</p>
        </div>
        <div className="garden-badge">
          <ShieldCheck size={16} />
          <span>数据只存放在本机</span>
        </div>
      </header>

      <div className="settings-layout">
        <section className="settings-section">
          <div className="settings-section-head">
            <span className="settings-section-icon">
              <Timer size={17} />
            </span>
            <div>
              <h3>计时节奏</h3>
              <p>经典的 25 / 5 / 15，也可以调成你自己的。</p>
            </div>
          </div>
          <div className="duration-grid">
            <div className="duration-field">
              <span>专注</span>
              <Stepper
                value={settings.focusMin}
                min={1}
                max={120}
                unit="分"
                label="专注时长"
                onChange={(value) => patch('focusMin', value)}
              />
            </div>
            <div className="duration-field">
              <span>短休息</span>
              <Stepper
                value={settings.shortBreakMin}
                min={1}
                max={60}
                unit="分"
                label="短休息时长"
                onChange={(value) => patch('shortBreakMin', value)}
              />
            </div>
            <div className="duration-field">
              <span>长休息</span>
              <Stepper
                value={settings.longBreakMin}
                min={1}
                max={60}
                unit="分"
                label="长休息时长"
                onChange={(value) => patch('longBreakMin', value)}
              />
            </div>
            <div className="duration-field">
              <span>长休息间隔</span>
              <Stepper
                value={settings.longBreakEvery}
                min={2}
                max={8}
                unit="个"
                label="长休息间隔"
                onChange={(value) => patch('longBreakEvery', value)}
              />
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-copy">
              <span className="setting-title">自动开始休息</span>
              <p>专注结束后，直接进入休息倒计时。</p>
            </div>
            <Toggle
              checked={settings.autoStartBreaks}
              label="自动开始休息"
              onChange={(value) => patch('autoStartBreaks', value)}
            />
          </div>
          <div className="setting-row">
            <div className="setting-copy">
              <span className="setting-title">自动开始下一段专注</span>
              <p>休息结束后自动继续，适合不想被打断的节奏。</p>
            </div>
            <Toggle
              checked={settings.autoStartFocus}
              label="自动开始下一段专注"
              onChange={(value) => patch('autoStartFocus', value)}
            />
          </div>
          <div className="setting-row">
            <div className="setting-copy">
              <span className="setting-title">每日目标</span>
              <p>一天想种下多少颗番茄？只用来提示进度。</p>
            </div>
            <Stepper
              value={settings.dailyGoal}
              min={1}
              max={24}
              unit="个"
              label="每日目标"
              onChange={(value) => patch('dailyGoal', value)}
            />
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-head">
            <span className="settings-section-icon">
              <Bell size={17} />
            </span>
            <div>
              <h3>提醒与声音</h3>
              <p>结束的时候，用你喜欢的方式知道。</p>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-copy">
              <span className="setting-title">结束提醒</span>
              <p>专注和休息结束时发送系统通知。</p>
            </div>
            <Toggle
              checked={settings.notifications}
              label="结束提醒"
              onChange={(value) => void toggleNotifications(value)}
            />
          </div>

          <div className="setting-block">
            <span className="setting-title">完成音效</span>
            <div className="segmented">
              {SOUNDS.map((sound) => (
                <button
                  key={sound.id}
                  type="button"
                  className="segment"
                  data-active={settings.completionSound === sound.id ? 'true' : 'false'}
                  onClick={() => patch('completionSound', sound.id)}
                >
                  {sound.label}
                </button>
              ))}
            </div>
            <div className="volume-row">
              <Volume2 size={16} />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.volume}
                aria-label="完成音效音量"
                onChange={(event) => patch('volume', Number(event.target.value))}
              />
              <span>{Math.round(settings.volume * 100)}%</span>
              <button
                type="button"
                className="text-button"
                disabled={settings.completionSound === 'none'}
                onClick={testSound}
              >
                试听
              </button>
            </div>
          </div>

          <div className="setting-block">
            <span className="setting-title">专注时的环境音</span>
            <p className="setting-hint">只在专注进行时播放，休息时自动停下。</p>
            <div className="ambience-grid">
              {AMBIENCES.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="ambience-option"
                  data-active={settings.ambience === id ? 'true' : 'false'}
                  onClick={() => patch('ambience', id)}
                >
                  {AMBIENCE_LABEL[id]}
                </button>
              ))}
            </div>
            {settings.ambience !== 'none' && (
              <div className="volume-row">
                <Volume2 size={16} />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.ambienceVolume}
                  aria-label="环境音音量"
                  onChange={(event) => patch('ambienceVolume', Number(event.target.value))}
                />
                <span>{Math.round(settings.ambienceVolume * 100)}%</span>
              </div>
            )}
          </div>

          <div className="setting-row">
            <div className="setting-copy">
              <span className="setting-title">
                <Vibrate size={14} /> 触感反馈
              </span>
              <p>完成时轻轻震动一下，安卓设备上更明显。</p>
            </div>
            <Toggle
              checked={settings.vibration}
              label="触感反馈"
              onChange={(value) => patch('vibration', value)}
            />
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-head">
            <span className="settings-section-icon">
              <Sun size={17} />
            </span>
            <div>
              <h3>外观</h3>
              <p>白天是奶油色，夜里是森林色。</p>
            </div>
          </div>
          <div className="theme-grid">
            {THEMES.map((theme) => {
              const Icon = theme.icon;
              return (
                <button
                  key={theme.id}
                  type="button"
                  className="theme-option"
                  data-active={settings.theme === theme.id ? 'true' : 'false'}
                  onClick={() => patch('theme', theme.id)}
                >
                  <Icon size={18} />
                  <span>{theme.label}</span>
                </button>
              );
            })}
          </div>
          <div className="setting-row">
            <div className="setting-copy">
              <span className="setting-title">专注时保持屏幕常亮</span>
              <p>只在计时进行时生效，避免电脑或手机中途熄屏。</p>
            </div>
            <Toggle
              checked={settings.keepAwake}
              label="保持屏幕常亮"
              onChange={(value) => patch('keepAwake', value)}
            />
          </div>
        </section>

        {isDesktop && (
          <section className="settings-section">
            <div className="settings-section-head">
              <span className="settings-section-icon">
                <Monitor size={17} />
              </span>
              <div>
                <h3>Windows 桌面</h3>
                <p>把番茄小园放在顺手的位置。</p>
              </div>
            </div>
            <div className="setting-row">
              <div className="setting-copy">
                <span className="setting-title">
                  <Pin size={14} /> 窗口置顶
                </span>
                <p>让计时器一直浮在其他窗口上面。</p>
              </div>
              <Toggle
                checked={settings.alwaysOnTop}
                label="窗口置顶"
                onChange={(value) => patch('alwaysOnTop', value)}
              />
            </div>
            <div className="setting-row">
              <div className="setting-copy">
                <span className="setting-title">
                  <Power size={14} /> 开机自动启动
                </span>
                <p>登录 Windows 后自动打开番茄小园。</p>
              </div>
              <Toggle
                checked={settings.autoLaunch}
                label="开机自动启动"
                onChange={(value) => patch('autoLaunch', value)}
              />
            </div>
            <div className="setting-row">
              <div className="setting-copy">
                <span className="setting-title">关闭时留在托盘</span>
                <p>点关闭按钮时收进系统托盘，计时不会中断。</p>
              </div>
              <Toggle
                checked={settings.closeToTray}
                label="关闭时留在托盘"
                onChange={(value) => patch('closeToTray', value)}
              />
            </div>
            <div className="shortcut-tip">
              <Keyboard size={15} />
              <span>
                平时按 <Kbd>Ctrl</Kbd> + <Kbd>Alt</Kbd> + <Kbd>P</Kbd> 可以随时呼出窗口。
              </span>
            </div>
          </section>
        )}

        <section className="settings-section">
          <div className="settings-section-head">
            <span className="settings-section-icon">
              <Download size={17} />
            </span>
            <div>
              <h3>数据</h3>
              <p>{sessions.length} 段专注 · {tasks.length} 个任务，都在这台设备上。</p>
            </div>
          </div>
          <div className="data-actions">
            <button type="button" className="secondary-button" onClick={exportData}>
              <Download size={16} /> 导出备份
            </button>
            <button type="button" className="secondary-button" onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> 导入备份
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(event) => void importFile(event)}
            />
            <button type="button" className="danger-button" onClick={() => setResetOpen(true)}>
              <Trash2 size={16} /> 清空所有数据
            </button>
          </div>
          <p className="data-note">
            备份是一个 JSON 文件，包含设置、任务和全部专注记录，可以换设备继续使用。
          </p>
        </section>

        <section className="settings-section">
          <div className="settings-section-head">
            <span className="settings-section-icon">
              <Keyboard size={17} />
            </span>
            <div>
              <h3>快捷键</h3>
              <p>手不用离开键盘。</p>
            </div>
          </div>
          <div className="shortcut-grid">
            <span>
              <Kbd>空格</Kbd> 开始 / 暂停
            </span>
            <span>
              <Kbd>R</Kbd> 重置计时
            </span>
            <span>
              <Kbd>S</Kbd> 跳过当前阶段
            </span>
            <span>
              <Kbd>1</Kbd> <Kbd>2</Kbd> <Kbd>3</Kbd> 切换阶段
            </span>
          </div>
        </section>

        <section className="settings-section about-section">
          <div className="settings-section-head">
            <span className="settings-section-icon">
              <Info size={17} />
            </span>
            <div>
              <h3>关于番茄小园</h3>
              <p>PomoGrove 1.0.0 · {platformName} · 用专注种一小片花园。</p>
            </div>
          </div>
          <p className="about-text">
            灵感来自番茄工作法，也来自那些让人愿意坐下来做事的工具。没有账号、没有排行榜，只有你的节奏和一座慢慢长大的花园。
          </p>
        </section>
      </div>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="清空所有数据？"
        subtitle="这个动作不能撤销，花园会回到最初的样子。"
        footer={
          <>
            <button type="button" className="ghost-button" onClick={() => setResetOpen(false)}>
              再想想
            </button>
            <button
              type="button"
              className="danger-button"
              onClick={() => {
                resetAll();
                setResetOpen(false);
              }}
            >
              确认清空
            </button>
          </>
        }
      >
        <p className="modal-warning">
          将删除 {tasks.length} 个任务和 {sessions.length} 段专注记录，设置也会恢复默认。建议先导出一份备份。
        </p>
      </Modal>
    </section>
  );
}
