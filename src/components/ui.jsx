import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function colorFor(pct) {
  return pct >= 75 ? 'var(--good)' : pct >= 50 ? 'var(--warn)' : 'var(--bad)';
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Animates a number from 0 to `target` (ease-out). */
export function useCountUp(target, duration = 1400, delay = 150) {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return undefined;
    }
    let raf;
    let start;
    const timer = setTimeout(() => {
      const tick = (t) => {
        start ??= t;
        const p = Math.min(1, (t - start) / duration);
        setValue(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);
  return value;
}

export function ScoreRing({ value, label, max = 100, size = 120 }) {
  const target = Math.max(0, Math.min(max, Number(value) || 0));
  const v = useCountUp(target);
  const pct = (v / max) * 100;
  const finalColor = colorFor((target / max) * 100);
  return (
    <div
      className="ring"
      style={{ width: size, height: size, background: `conic-gradient(${finalColor} ${pct * 3.6}deg, var(--track) 0)` }}
      role="img"
      aria-label={`${label}: ${Math.round(target)} out of ${max}`}
    >
      <div className="ring-inner">
        <strong style={{ fontSize: size / 3.6 }}>{Math.round(v)}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function AnimatedBar({ pct, color }) {
  const [w, setW] = useState(prefersReducedMotion() ? pct : 0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setW(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);
  return (
    <div className="bar-track">
      <div className="bar-fill" style={{ width: `${w}%`, background: color }} />
    </div>
  );
}

export function ScoreBars({ items, max = 100 }) {
  return (
    <div className="bars">
      {items
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([label, v]) => {
          const pct = Math.max(0, Math.min(100, ((Number(v) || 0) / max) * 100));
          return (
            <div className="bar-row" key={label}>
              <span className="bar-label">{label}</span>
              <AnimatedBar pct={pct} color={colorFor(pct)} />
              <span className="bar-value">
                {Math.round(v)}
                {max === 10 ? '/10' : ''}
              </span>
            </div>
          );
        })}
    </div>
  );
}

export function BulletList({ items, empty }) {
  if (!items?.length) return empty ? <p className="muted">{empty}</p> : null;
  return (
    <ul className="list">
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  );
}

export function Chips({ items, tone = '' }) {
  if (!items?.length) return null;
  return (
    <div className="chips">
      {items.map((x, i) => (
        <span key={i} className={`chip ${tone}`}>
          {x}
        </span>
      ))}
    </div>
  );
}

export function Spinner({ small }) {
  return <span className={`spinner ${small ? 'sm' : ''}`} aria-hidden="true" />;
}

/** One-shot celebratory confetti burst (canvas, no library). */
export function Confetti({ pieces = 160, duration = 3800 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();
    window.addEventListener('resize', resize);
    const colors = ['#ffb547', '#ff6b6b', '#de4ecf', '#3fe3ff', '#34d399'];
    const W = () => canvas.width;
    const parts = Array.from({ length: pieces }, (_, i) => {
      const fromLeft = i % 2 === 0;
      return {
        x: fromLeft ? 0 : W(),
        y: canvas.height * 0.65,
        vx: (fromLeft ? 1 : -1) * (6 + Math.random() * 9) * dpr,
        vy: -(10 + Math.random() * 12) * dpr,
        size: (5 + Math.random() * 6) * dpr,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: colors[i % colors.length],
      };
    });
    const start = performance.now();
    let raf;
    const frame = (t) => {
      const elapsed = t - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = Math.max(0, 1 - elapsed / duration);
      for (const p of parts) {
        p.vy += 0.32 * dpr;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      if (elapsed < duration) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [pieces, duration]);
  // Portal to <body> so animated (transformed) ancestors can't offset the fixed canvas.
  return createPortal(<canvas ref={ref} className="confetti" aria-hidden="true" />, document.body);
}

/** Small stroke icons used across the UI. */
export function Icon({ name }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  switch (name) {
    case 'mic':
      return (
        <svg {...common}>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        </svg>
      );
    case 'cv':
      return (
        <svg {...common}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5M9 13h6M9 17h4" />
        </svg>
      );
    case 'code':
      return (
        <svg {...common}>
          <path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />
        </svg>
      );
    case 'camera':
      return (
        <svg {...common}>
          <path d="M15 10l5-3v10l-5-3z" />
          <rect x="3" y="6" width="12" height="12" rx="2" />
        </svg>
      );
    case 'report':
      return (
        <svg {...common}>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );
    case 'upload':
      return (
        <svg {...common}>
          <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <path d="m5 12 5 5 9-10" />
        </svg>
      );
    default:
      return null;
  }
}
