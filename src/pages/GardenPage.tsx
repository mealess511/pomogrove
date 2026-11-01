import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  CalendarDays,
  Clock3,
  Flame,
  Lock,
  Sprout,
  Timer,
  Trophy,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import {
  achievements,
  heatmap,
  summarize,
  taskBreakdown,
  weeklyBars,
} from '../lib/stats';
import { plantsForDay, PLANT_NAME, PLANT_RARITY } from '../lib/garden';
import { dateLabel, formatFocusMinutes, timeLabel } from '../lib/time';
import { Plant } from '../components/Plant';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

export function GardenPage() {
  const sessions = useAppStore((state) => state.sessions);
  const settings = useAppStore((state) => state.settings);
  const setView = useAppStore((state) => state.setView);
  const now = Date.now();
  const stats = summarize(sessions, settings, now);
  const todayPlants = useMemo(() => plantsForDay(sessions, now), [sessions, now]);
  const bars = useMemo(() => weeklyBars(sessions, now), [sessions, now]);
  const cells = useMemo(() => heatmap(sessions, now), [sessions, now]);
  const shares = useMemo(() => taskBreakdown(sessions, now), [sessions, now]);
  const badges = achievements(stats);
  const [selected, setSelected] = useState<string | null>(null);

  const maxBar = Math.max(settings.focusMin, ...bars.map((bar) => bar.minutes));
  const weeks = Array.from({ length: 12 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
  const selectedPlant = todayPlants.find((item) => item.session.id === selected) ?? null;
  const unlocked = badges.filter((badge) => badge.unlocked).length;

  return (
    <section className="page garden-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">专注会留下痕迹</p>
          <h2>我的花园</h2>
          <p className="page-sub">每完成一段专注，就有一株小植物在这里长出来。</p>
        </div>
        <div className="garden-badge">
          <Trophy size={16} />
          <span>
            {unlocked} / {badges.length} 枚徽章
          </span>
        </div>
      </header>

      <div className="garden-hero">
        <div className="garden-scene">
          <div className="garden-sky" />
          <div className="garden-sun" />
          <div className="garden-cloud garden-cloud-one" />
          <div className="garden-cloud garden-cloud-two" />
          <div className="garden-hill garden-hill-back" />
          <div className="garden-hill garden-hill-front" />
          <div className="garden-ground" />
          <div className="garden-plants">
            {todayPlants.length === 0 ? (
              <div className="garden-empty">
                <Sprout size={30} />
                <p>今天的地还空着</p>
                <span>完成一段专注，种下第一株植物</span>
              </div>
            ) : (
              todayPlants.slice(0, 12).map(({ session, plant }) => (
                <button
                  key={session.id}
                  type="button"
                  className="garden-plant"
                  data-selected={selected === session.id ? 'true' : 'false'}
                  title={`${PLANT_NAME[plant]} · ${timeLabel(session.endedAt)}`}
                  onClick={() => setSelected(session.id)}
                >
                  <Plant
                    type={plant}
                    seed={session.id.length + session.endedAt}
                    size={104}
                    label={PLANT_NAME[plant]}
                  />
                </button>
              ))
            )}
            {todayPlants.length > 12 && (
              <span className="garden-more">还有 {todayPlants.length - 12} 株</span>
            )}
          </div>
          <div className="garden-scene-label">
            <span>今天</span>
            <strong>{todayPlants.length} 株</strong>
          </div>
        </div>

        <aside className="garden-side">
          <span className="card-label">
            <CalendarDays size={14} /> 今日花园
          </span>
          <h3>
            {todayPlants.length > 0
              ? `又长大了一点`
              : '等你种下第一株'}
          </h3>
          <p className="garden-side-copy">
            {selectedPlant
              ? `${PLANT_NAME[selectedPlant.plant]} · ${PLANT_RARITY[selectedPlant.plant] === 'rare' ? '稀有' : '常见'} · ${timeLabel(selectedPlant.session.endedAt)} 种下`
              : todayPlants.length > 0
                ? '点击花园里的小植物，看看它是什么。'
                : `下一个 ${settings.focusMin} 分钟，会变成一小片绿色。`}
          </p>

          <div className="week-mini" aria-label="本周专注">
            {bars.map((bar) => (
              <div key={bar.key} className="week-mini-col" title={`${dateLabel(bar.date)} · ${bar.minutes} 分钟`}>
                <div className="week-mini-track">
                  <span
                    data-today={bar.isToday ? 'true' : 'false'}
                    style={{ height: `${Math.max(4, (bar.minutes / maxBar) * 100)}%` }}
                  />
                </div>
                <small>{bar.label}</small>
              </div>
            ))}
          </div>

          <button type="button" className="primary-button garden-cta" onClick={() => setView('timer')}>
            继续种番茄 <ArrowRight size={15} />
          </button>
        </aside>
      </div>

      <div className="garden-stats">
        <div className="garden-stat">
          <span className="garden-stat-icon">
            <Sprout size={18} />
          </span>
          <div>
            <strong>{stats.totalCount}</strong>
            <span>累计植物</span>
          </div>
        </div>
        <div className="garden-stat">
          <span className="garden-stat-icon">
            <Clock3 size={18} />
          </span>
          <div>
            <strong>{formatFocusMinutes(stats.totalMinutes)}</strong>
            <span>累计专注</span>
          </div>
        </div>
        <div className="garden-stat">
          <span className="garden-stat-icon">
            <Flame size={18} />
          </span>
          <div>
            <strong>{stats.longestStreak}</strong>
            <span>最长连续天数</span>
          </div>
        </div>
        <div className="garden-stat">
          <span className="garden-stat-icon">
            <Timer size={18} />
          </span>
          <div>
            <strong>{stats.bestDayCount}</strong>
            <span>单日最多番茄</span>
          </div>
        </div>
      </div>

      <div className="garden-grid">
        <section className="panel achievements-panel">
          <div className="panel-head">
            <div>
              <h3>园丁徽章</h3>
              <p>慢慢来，每一枚都算数。</p>
            </div>
            <span className="panel-count">
              {unlocked} / {badges.length}
            </span>
          </div>
          <div className="achievement-grid">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className="achievement"
                data-unlocked={badge.unlocked ? 'true' : 'false'}
              >
                <span className="achievement-icon">
                  {badge.unlocked ? <Award size={19} /> : <Lock size={16} />}
                </span>
                <div className="achievement-copy">
                  <strong>{badge.title}</strong>
                  <span>{badge.description}</span>
                  <div className="achievement-progress">
                    <span style={{ width: `${(badge.value / badge.target) * 100}%` }} />
                  </div>
                </div>
                <span className="achievement-value">
                  {badge.value}/{badge.target}
                  {badge.unit}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel heatmap-panel">
          <div className="panel-head">
            <div>
              <h3>专注足迹</h3>
              <p>最近 12 周，每个小格子都是一天。</p>
            </div>
            <div className="heatmap-legend">
              <span>少</span>
              {[0, 1, 2, 3, 4].map((level) => (
                <i key={level} data-level={level} />
              ))}
              <span>多</span>
            </div>
          </div>
          <div className="heatmap">
            <div className="heatmap-weekdays">
              {WEEKDAYS.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="heatmap-weeks">
              {weeks.map((week, index) => (
                <div className="heatmap-week" key={week[0]?.key ?? index}>
                  {week.map((cell) => (
                    <span
                      key={cell.key}
                      className="heat-cell"
                      data-level={cell.level}
                      data-future={cell.future ? 'true' : 'false'}
                      title={`${dateLabel(cell.date)} · ${cell.count} 个番茄 · ${cell.minutes} 分钟`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <p className="heatmap-foot">
            本周已专注 <strong>{formatFocusMinutes(stats.weekMinutes)}</strong>，完成{' '}
            <strong>{stats.weekCount}</strong> 个番茄。
          </p>
        </section>
      </div>

      {shares.length > 0 && (
        <section className="panel share-panel">
          <div className="panel-head">
            <div>
              <h3>专注去向</h3>
              <p>最近 30 天，时间都花在了哪些事情上。</p>
            </div>
          </div>
          <div className="share-list">
            {shares.map((share) => (
              <div className="share-row" key={share.title}>
                <span className="share-title" title={share.title}>
                  {share.title}
                </span>
                <div className="share-track">
                  <span style={{ width: `${share.percent}%` }} />
                </div>
                <span className="share-meta">
                  {formatFocusMinutes(share.minutes)} · {share.count} 个
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
