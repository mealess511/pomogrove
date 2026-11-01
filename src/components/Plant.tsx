import { useId } from 'react';
import type { PlantType } from '../types';

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="logo-mark"
    >
      <rect width="64" height="64" rx="19" fill="#1E3A2C" />
      <path
        d="M32 18c-2.6-5.2-1.6-9.2 1.8-12 1 4.6 3.9 6.7 8.6 7-1.8 4.3-5.3 6.4-9.1 6.4"
        fill="#77B287"
      />
      <path
        d="M32 19c-6-7-12.7-6.8-17.6-2.2 4.3 4.2 9.7 5.8 17.6 2.2Z"
        fill="#8AC398"
      />
      <path
        d="M32 20c6.2-6.4 13-6 17.7-1.2-4.5 4-10 5.3-17.7 1.2Z"
        fill="#5E9A6D"
      />
      <path
        d="M32 53c-10.7 0-19-7.4-19-18.4 0-7.4 5.1-12.4 12.1-12.4 3 0 5.3.8 6.9 2.3 1.6-1.5 3.9-2.3 6.9-2.3 7 0 12.1 5 12.1 12.4C51 45.6 42.7 53 32 53Z"
        fill="#EC6248"
      />
      <path
        d="M21.8 30.8c2.3-4.2 6.4-5.8 10.5-3.8-2.8 2.9-6.4 4.3-10.5 3.8Z"
        fill="#F6A08B"
        opacity=".9"
      />
    </svg>
  );
}

interface PlantProps {
  type: PlantType;
  seed?: number;
  size?: number;
  label?: string;
}

function Tomato({ gid }: { gid: string }) {
  return (
    <>
      <path
        d="M60 124c-2-12-2-27 1-43"
        stroke="#3D6B4C"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M61 94c-10-8-19-8-27-1 9 4 18 4 27 1Z"
        fill="#5C946A"
      />
      <path
        d="M61 87c9-7 17-7 24-1-8 4-16 4-24 1Z"
        fill="#4F8760"
      />
      <circle cx="47" cy="90" r="15" fill={`url(#tomato-${gid})`} />
      <ellipse cx="42.5" cy="84.5" rx="4.6" ry="3" fill="#F8B5A4" opacity=".72" transform="rotate(-28 42.5 84.5)" />
      <circle cx="74" cy="99" r="10.5" fill={`url(#tomato-${gid})`} />
      <ellipse cx="71" cy="95.5" rx="3.2" ry="2" fill="#F8B5A4" opacity=".6" transform="rotate(-28 71 95.5)" />
      <path d="M47 77l3 5 5-2-3 5 4 3-6 1-1 5-3-4-5 2 3-5-4-3 6-1Z" fill="#3F7A55" />
      <path d="M74 90l2 3 4-1-3 3 2 3-4-1-3 3 1-4-3-2 4-1Z" fill="#3F7A55" />
    </>
  );
}

function Daisy({ gid }: { gid: string }) {
  const petals = Array.from({ length: 9 }, (_, i) => i * 40);
  return (
    <>
      <path
        d="M60 124c-4-18-3-40 1-58"
        stroke="#4A7C59"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M61 103c-11-6-19-4-24 4 9 1 17-1 24-4Z" fill="#5E986D" />
      <path d="M60 94c10-7 18-6 23 1-8 2-16 2-23-1Z" fill="#4E8A61" />
      {petals.map((angle) => (
        <ellipse
          key={angle}
          cx="60"
          cy="38"
          rx="5.8"
          ry="13"
          fill={`url(#petal-${gid})`}
          transform={`rotate(${angle} 60 51)`}
        />
      ))}
      <circle cx="60" cy="51" r="10" fill="#F0AE3C" />
      <circle cx="57" cy="48" r="2" fill="#D9902C" opacity=".6" />
      <circle cx="63" cy="53" r="1.6" fill="#D9902C" opacity=".6" />
      <circle cx="64" cy="47" r="1.2" fill="#D9902C" opacity=".5" />
      <path d="M66 64c6-8 11-10 16-9-3 6-8 9-16 9Z" fill="#5E986D" />
    </>
  );
}

function Tulip({ gid }: { gid: string }) {
  return (
    <>
      <path
        d="M60 124c-3-16-2-38 1-54"
        stroke="#4A7C59"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M61 109c-12-5-20-1-24 8 10 0 18-2 24-8Z" fill="#5A9168" />
      <path d="M60 101c11-7 18-6 22 2-8 1-15 0-22-2Z" fill="#4D7F5C" />
      <path
        d="M43 61c0-15 8-24 17-15 9-9 17 0 17 15 0 15-7 23-17 23s-17-8-17-23Z"
        fill={`url(#tulip-${gid})`}
      />
      <path d="M60 53c-5 8-6 18-4 30 3 1 6 1 8 0 2-12 1-22-4-30Z" fill="#D96A86" opacity=".7" />
      <path d="M50 47c3 10 4 20 3 29M70 47c-3 10-4 20-3 29" stroke="#C95572" strokeWidth="1.6" fill="none" opacity=".45" />
    </>
  );
}

function Fern() {
  const fronds = [-48, -26, -8, 12, 32, 50];
  return (
    <>
      {fronds.map((angle, index) => (
        <g key={angle} transform={`translate(60 124) rotate(${angle})`}>
          <path
            d={`M0 0C${index % 2 === 0 ? -6 : 6} -18 ${index % 2 === 0 ? 4 : -4} -38 0 -55`}
            stroke={index % 2 === 0 ? '#4F8A61' : '#3F7452'}
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
          {[10, 20, 30, 40, 49].map((y, leafIndex) => (
            <g key={y}>
              <ellipse
                cx={leafIndex % 2 === 0 ? -6 : 6}
                cy={-y}
                rx="7.5"
                ry="2.8"
                fill={leafIndex % 2 === 0 ? '#6AA77A' : '#5A966B'}
                transform={`rotate(${leafIndex % 2 === 0 ? -24 : 24} ${leafIndex % 2 === 0 ? -6 : 6} ${-y})`}
              />
              <ellipse
                cx={leafIndex % 2 === 0 ? 5 : -5}
                cy={-y + 4}
                rx="5.5"
                ry="2.2"
                fill="#79B488"
                transform={`rotate(${leafIndex % 2 === 0 ? 22 : -22} ${leafIndex % 2 === 0 ? 5 : -5} ${-y + 4})`}
              />
            </g>
          ))}
        </g>
      ))}
      <path d="M48 126c5-2 19-2 25 0" stroke="#3F7452" strokeWidth="2" opacity=".4" fill="none" />
    </>
  );
}

function Sunflower({ gid }: { gid: string }) {
  const petals = Array.from({ length: 14 }, (_, i) => i * (360 / 14));
  return (
    <>
      <path
        d="M60 124c-4-22-3-48 1-68"
        stroke="#47764F"
        strokeWidth="4.4"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M61 104c-13-6-22-2-27 7 11 2 20-1 27-7Z" fill="#5C9568" />
      <path d="M60 92c12-8 21-5 26 4-10 1-19 0-26-4Z" fill="#4E8660" />
      {petals.map((angle) => (
        <ellipse
          key={angle}
          cx="60"
          cy="31"
          rx="5.4"
          ry="12.5"
          fill={`url(#sun-${gid})`}
          transform={`rotate(${angle} 60 47)`}
        />
      ))}
      <circle cx="60" cy="47" r="13.5" fill="#6B4A2E" />
      <circle cx="60" cy="47" r="9" fill="#573A23" />
      {[
        [56, 43],
        [64, 45],
        [59, 51],
        [63, 50],
        [57, 48],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="#8A6440" />
      ))}
    </>
  );
}

function Mushroom() {
  return (
    <>
      <path
        d="M55 122c0-12 1-22 5-31h8c4 9 5 19 4 31Z"
        fill="#F1E3C8"
      />
      <path d="M55 122c4-3 22-3 26 0-4 3-21 3-26 0Z" fill="#D8C6A6" />
      <path
        d="M30 84c0-20 13-33 31-33s31 13 31 33c0 6-5 9-12 9H42c-7 0-12-3-12-9Z"
        fill="#D96B4E"
      />
      <path d="M39 76c2-14 10-22 22-22 8 0 15 4 19 10-13-4-28-1-41 12Z" fill="#EE8B6D" opacity=".7" />
      <circle cx="46" cy="79" r="4.4" fill="#F7E8CC" />
      <circle cx="66" cy="68" r="3.4" fill="#F7E8CC" />
      <circle cx="78" cy="82" r="4.8" fill="#F7E8CC" />
      <path d="M37 92c2-3 6-3 8 0M81 94c2-3 6-2 8 1" stroke="#4D7F5C" strokeWidth="2" fill="none" />
    </>
  );
}

function Ground({ seed }: { seed: number }) {
  return (
    <>
      <ellipse cx="60" cy="128" rx="31" ry="5.2" fill="#2E4A37" opacity=".13" />
      <path d="M29 128c8-3 19-4 31-4s23 1 31 4" stroke="#2E4A37" strokeWidth="1.4" opacity=".18" fill="none" />
      {[36, 48, 72, 84].map((x, index) => (
        <path
          key={x}
          d={`M${x} 126c${index % 2 === 0 ? -2 : 2}-4 ${index % 2 === 0 ? -3 : 3}-7 ${index % 2 === 0 ? -5 : 5}-8`}
          stroke="#5E8F68"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity={0.42 + ((seed + index) % 3) * 0.12}
          fill="none"
        />
      ))}
    </>
  );
}

export function Plant({ type, seed = 0, size = 110, label }: PlantProps) {
  const rawId = useId().replace(/:/g, '');
  const gid = `${rawId}${seed % 97}`;
  const flip = seed % 2 === 0;
  return (
    <svg
      width={size}
      height={size * 1.16}
      viewBox="0 0 120 140"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="plant-svg"
    >
      <defs>
        <radialGradient id={`tomato-${gid}`} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#F37A5F" />
          <stop offset="62%" stopColor="#E4573D" />
          <stop offset="100%" stopColor="#C9432E" />
        </radialGradient>
        <linearGradient id={`petal-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFDF5" />
          <stop offset="100%" stopColor="#F3E7CE" />
        </linearGradient>
        <linearGradient id={`tulip-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F3A0B2" />
          <stop offset="100%" stopColor="#D96A86" />
        </linearGradient>
        <linearGradient id={`sun-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F7C85C" />
          <stop offset="100%" stopColor="#E9A93B" />
        </linearGradient>
      </defs>
      <Ground seed={seed} />
      <g transform={flip ? 'translate(120 0) scale(-1 1)' : undefined}>
        <g
          className="plant-sway"
          style={{ animationDelay: `-${(seed % 9) * 0.55}s` }}
        >
          {type === 'tomato' && <Tomato gid={gid} />}
          {type === 'daisy' && <Daisy gid={gid} />}
          {type === 'tulip' && <Tulip gid={gid} />}
          {type === 'fern' && <Fern />}
          {type === 'sunflower' && <Sunflower gid={gid} />}
          {type === 'mushroom' && <Mushroom />}
        </g>
      </g>
    </svg>
  );
}
