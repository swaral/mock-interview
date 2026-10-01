import { useEffect, useState } from 'react';
import { listModels } from '../lib/gemini';
import { loadVoices, speak } from '../lib/speech';

const LANGS = [
  ['en-IN', 'English (India)'],
  ['en-US', 'English (US)'],
  ['en-GB', 'English (UK)'],
  ['en-AU', 'English (Australia)'],
];

export default function SettingsModal({ settings, onSave, onClose }) {
  const [draft, setDraft] = useState(settings);
  const [models, setModels] = useState([]);
  const [modelStatus, setModelStatus] = useState('');
  const [voices, setVoices] = useState([]);
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  useEffect(() => {
    loadVoices().then((v) => setVoices(v.filter((x) => /^en/i.test(x.lang))));
    if (settings.apiKey) testKey(settings.apiKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function testKey(key = draft.apiKey) {
    const k = key.trim();
    if (!k) return setModelStatus('No key entered - the app will run in Offline mode.');
    setModelStatus('Checking key…');
    try {
      const list = await listModels(k);
      setModels(list);
      setModelStatus(`✓ Key works - ${list.length} models available.`);
      setDraft((d) => {
        if (list.some((m) => m.id === d.model)) return d;
        const pref = list.find((m) => /flash/i.test(m.id) && !/lite|preview|exp/i.test(m.id)) || list[0];
        return pref ? { ...d, model: pref.id } : d;
      });
    } catch (e) {
      setModels([]);
      setModelStatus(`✗ ${e.message}`);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>

        <h3 className="section-title">AI engine (optional)</h3>
        <label className="field">
          <span>Gemini API key</span>
          <input type="password" value={draft.apiKey} onChange={(e) => set('apiKey', e.target.value)} placeholder="Optional - leave empty to use this site's AI (or Offline mode)" autoComplete="off" />
          <small className="muted">
            Free key: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>. Leave it empty to use this site's shared AI when the site provides one; otherwise the app uses Offline mode
            (built-in FAANG question bank + CV keywords, estimated scoring).
          </small>
        </label>
        <div className="row">
          <label className="check">
            <input type="checkbox" checked={draft.rememberKey} onChange={(e) => set('rememberKey', e.target.checked)} /> Remember key on this computer
          </label>
          <button className="btn ghost sm" onClick={() => testKey()}>Test key</button>
        </div>
        {modelStatus && <p className="small muted">{modelStatus}</p>}
        {draft.apiKey.trim() && (
          <label className="field">
            <span>Model</span>
            {models.length ? (
              <select value={draft.model} onChange={(e) => set('model', e.target.value)}>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.label} ({m.id})</option>
                ))}
              </select>
            ) : (
              <input value={draft.model} onChange={(e) => set('model', e.target.value)} />
            )}
          </label>
        )}

        <h3 className="section-title">Voice</h3>
        <div className="grid2">
          <label className="field">
            <span>Your accent (speech recognition)</span>
            <select value={draft.speechLang} onChange={(e) => set('speechLang', e.target.value)}>
              {LANGS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Interviewer voice</span>
            <select value={draft.voiceURI} onChange={(e) => set('voiceURI', e.target.value)}>
              <option value="">Automatic</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Speaking speed: {Number(draft.speechRate).toFixed(2)}x</span>
          <input type="range" min="0.7" max="1.3" step="0.05" value={draft.speechRate} onChange={(e) => set('speechRate', Number(e.target.value))} />
        </label>
        <button
          className="btn ghost sm"
          onClick={() => speak('Hello! I will be your interviewer today. Let us begin when you are ready.', { voiceURI: draft.voiceURI, rate: draft.speechRate, lang: draft.speechLang })}
        >
          🔊 Test voice
        </button>

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => onSave({ ...draft, apiKey: draft.apiKey.trim() })}>Save</button>
        </div>
      </div>
    </div>
  );
}
