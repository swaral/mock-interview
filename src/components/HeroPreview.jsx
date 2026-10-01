import { useEffect, useState } from 'react';
import { ScoreRing, prefersReducedMotion } from './ui';

// A looping sample of what the interview room does. Clearly labelled as a sample.
const SAMPLES = [
  { tag: 'From your CV', q: 'In your attendance project, why did you choose OpenCV over a cloud vision API?' },
  { tag: 'Asked at Amazon', q: 'Design an LRU cache that supports get and put in O(1) time.' },
  { tag: 'HR round', q: 'Tell me about a time you disagreed with a teammate. What did you do?' },
  { tag: 'Asked at Google', q: 'How would you design a URL shortener that handles a billion links?' },
];

function useTypewriter() {
  const [i, setI] = useState(0);
  const [n, setN] = useState(prefersReducedMotion() ? SAMPLES[0].q.length : 0);
  useEffect(() => {
    const full = SAMPLES[i].q;
    if (prefersReducedMotion()) {
      const t = setTimeout(() => {
        const next = (i + 1) % SAMPLES.length;
        setI(next);
        setN(SAMPLES[next].q.length);
      }, 4200);
      return () => clearTimeout(t);
    }
    if (n < full.length) {
      const t = setTimeout(() => setN(n + 1), 32);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setI((i + 1) % SAMPLES.length);
      setN(0);
    }, 2600);
    return () => clearTimeout(t);
  }, [i, n]);
  return { sample: SAMPLES[i], text: SAMPLES[i].q.slice(0, n), typing: n < SAMPLES[i].q.length };
}

export default function HeroPreview() {
  const { sample, text } = useTypewriter();
  return (
    <div className="preview" aria-label="Sample of the interview room">
      <div className="preview-top">
        <span className="live-dot">Live interview</span>
        <span>Sample preview</span>
      </div>
      <div className="preview-q">
        <div className="preview-avatar" aria-hidden="true">
          🧑‍💻
        </div>
        <div>
          <span className="preview-tag" key={sample.tag}>
            {sample.tag}
          </span>
          <div className="preview-text">
            {text}
            <span className="caret" />
          </div>
        </div>
      </div>
      <div className="preview-wave" aria-hidden="true">
        {Array.from({ length: 36 }, (_, k) => (
          <i key={k} />
        ))}
      </div>
      <div className="preview-stats">
        <ScoreRing value={82} label="Confidence" size={78} />
        <div className="preview-bars">
          <div>
            <span>
              Eye contact <b>86%</b>
            </span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: '86%', background: 'var(--good)' }} />
            </div>
          </div>
          <div>
            <span>
              Answer coverage <b>7/10</b>
            </span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: '70%', background: 'var(--warn)' }} />
            </div>
          </div>
        </div>
      </div>
      <p className="preview-note">Example numbers. Your real scores appear in your report.</p>
    </div>
  );
}
