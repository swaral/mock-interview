import { useEffect, useRef, useState } from 'react';
import { LEVELS } from '../lib/levels';
import { speak } from '../lib/speech';
import { getSpeechRecognition } from '../lib/useSpeechRecognition';

const TECH_OPTIONS = [15, 20, 30, 45, 60, 75, 90];
const HR_OPTIONS = [5, 10, 15];

export default function InterviewSetup({ cvAnalysis, onStart, onBack }) {
  const [level, setLevel] = useState(cvAnalysis.suggestedLevel || 'beginner');
  const [techMinutes, setTechMinutes] = useState(45);
  const [hrMinutes, setHrMinutes] = useState(15);
  const [devices, setDevices] = useState('idle'); // idle | on | error
  const [deviceError, setDeviceError] = useState('');
  const [micLevel, setMicLevel] = useState(0);
  const videoRef = useRef(null);
  const cleanupRef = useRef(() => {});
  const srSupported = !!getSpeechRecognition();

  useEffect(() => () => cleanupRef.current(), []);

  async function testDevices() {
    cleanupRef.current();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let raf;
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
        setMicLevel(Math.min(100, peak * 1.8));
        raf = requestAnimationFrame(tick);
      };
      tick();
      cleanupRef.current = () => {
        cancelAnimationFrame(raf);
        ctx.close().catch(() => {});
        stream.getTracks().forEach((t) => t.stop());
      };
      setDevices('on');
      setDeviceError('');
    } catch (e) {
      setDevices('error');
      setDeviceError(
        e.name === 'NotAllowedError'
          ? 'Camera/microphone permission was denied. Click the camera icon in the address bar to allow it.'
          : `Could not access camera/microphone (${e.name}).`,
      );
    }
  }

  function start() {
    cleanupRef.current();
    cleanupRef.current = () => {};
    onStart({ level, techMinutes, hrMinutes });
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Interview setup</h1>
        <p className="muted">Round 1 is a domain / technical interview. Round 2 is a separate HR interview.</p>
      </div>

      <section className="card">
        <h2>
          <span className="sec-num">1</span> Choose difficulty
        </h2>
        <div className="level-cards">
          {Object.values(LEVELS).map((L, i) => (
            <button key={L.key} type="button" className={`level-card ${level === L.key ? 'on' : ''}`} onClick={() => setLevel(L.key)} aria-pressed={level === L.key}>
              <div className="level-top">
                <strong>{L.label}</strong>
                {cvAnalysis.suggestedLevel === L.key && <span className="chip accent">Suggested</span>}
              </div>
              <div className="level-meter" aria-label={`Difficulty ${i + 1} of 3`}>
                {[0, 1, 2].map((b) => (
                  <i key={b} className={b <= i ? 'lit' : ''} />
                ))}
              </div>
              <span className="level-exp">{L.experience}</span>
              <span className="muted small">{L.blurb}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>
          <span className="sec-num">2</span> Duration
        </h2>
        <div className="grid2">
          <label className="field">
            <span>Technical round (max 90 min)</span>
            <select value={techMinutes} onChange={(e) => setTechMinutes(Number(e.target.value))}>
              {TECH_OPTIONS.map((m) => (
                <option key={m} value={m}>{m} minutes</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>HR round (max 15 min)</span>
            <select value={hrMinutes} onChange={(e) => setHrMinutes(Number(e.target.value))}>
              {HR_OPTIONS.map((m) => (
                <option key={m} value={m}>{m} minutes</option>
              ))}
            </select>
          </label>
        </div>
        <p className="small muted">
          The timer is a hard limit - the round ends automatically when time runs out. It can finish earlier if all questions are done.
          {cvAnalysis.isSoftwareRole && ' Your technical round includes FAANG-style coding problems in a built-in code editor.'}
        </p>
      </section>

      <section className="card">
        <h2>
          <span className="sec-num">3</span> Check camera, microphone &amp; voice
        </h2>
        <div className="device-check">
          <div className="device-video">
            <video ref={videoRef} muted playsInline className={devices === 'on' ? '' : 'hidden'} />
            {devices !== 'on' && <div className="video-placeholder">📷</div>}
          </div>
          <div className="device-info">
            <button className="btn ghost" onClick={testDevices}>{devices === 'on' ? 'Re-test' : 'Test camera & microphone'}</button>
            {devices === 'on' && (
              <div className="mic-meter">
                <span className="small">Mic level - say something:</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${micLevel}%`, background: 'var(--accent-2)' }} />
                </div>
              </div>
            )}
            {deviceError && <p className="warn">{deviceError}</p>}
            <button className="btn ghost" onClick={() => speak('Hello! Can you hear me clearly? Adjust your volume if needed.')}>🔊 Test interviewer voice</button>
            <ul className="checklist">
              <li className={srSupported ? 'ok' : 'bad'}>
                {srSupported ? 'Speech recognition available' : 'Speech recognition not supported in this browser - use Chrome or Edge (you can still type answers).'}
              </li>
              <li className="ok">Sit in a quiet, well-lit room and look at the screen.</li>
              <li className="ok">Use headphones if possible so the mic doesn't pick up the interviewer's voice.</li>
            </ul>
          </div>
        </div>
      </section>

      <div className="actions">
        <button className="btn ghost" onClick={onBack}>← Back to CV analysis</button>
        <button className="btn primary lg" onClick={start}>Start technical round →</button>
      </div>
    </div>
  );
}
