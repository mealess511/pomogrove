import { ArrowRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { PLANT_NAME, PLANT_RARITY } from '../lib/garden';
import { Plant } from './Plant';

export function Celebration() {
  const celebration = useAppStore((state) => state.celebration);
  const dismiss = useAppStore((state) => state.dismissCelebration);
  const setView = useAppStore((state) => state.setView);

  if (!celebration) return null;
  const plantName = PLANT_NAME[celebration.plant];
  const rare = PLANT_RARITY[celebration.plant] === 'rare';

  return (
    <div className="celebration-layer" role="dialog" aria-modal="true" aria-label="番茄成熟了">
      <div className="celebration-backdrop" onClick={dismiss} />
      <div className="celebration-card">
        <span className="celebration-spark spark-one" />
        <span className="celebration-spark spark-two" />
        <span className="celebration-spark spark-three" />
        <span className="celebration-spark spark-four" />
        <p className="celebration-kicker">一颗番茄成熟了</p>
        <h2>{celebration.minutes} 分钟的专注，被好好收下了</h2>
        <div className="celebration-plant">
          <Plant type={celebration.plant} size={168} seed={celebration.id.length} />
        </div>
        <p className="celebration-name">
          {rare ? '稀有植物 · ' : ''}
          {plantName}
        </p>
        <div className="celebration-stats">
          <div>
            <strong>{celebration.minutes}</strong>
            <span>分钟</span>
          </div>
          <div>
            <strong>{celebration.streak}</strong>
            <span>天连续</span>
          </div>
        </div>
        <div className="celebration-actions">
          <button type="button" className="primary-button" onClick={dismiss}>
            收下这颗番茄
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              dismiss();
              setView('garden');
            }}
          >
            去看看花园 <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
