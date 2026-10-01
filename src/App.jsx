import { useEffect, useState } from 'react';
import { loadSettings, saveSettings } from './lib/settings';
import { checkSharedAI, configureGemini, setForceOffline } from './lib/gemini';
import { configureTTS } from './lib/speech';
import { prepareCV } from './lib/cvParser';
import { analyzeCV, generateFinalReport, generateHRPlan, generateTechnicalPlan } from './lib/interviewAI';
import Stepper from './components/Stepper';
import SettingsModal from './components/SettingsModal';
import ProfileForm, { initialProfile } from './components/ProfileForm';
import CVAnalysis from './components/CVAnalysis';
import InterviewSetup from './components/InterviewSetup';
import InterviewRoom from './components/InterviewRoom';
import RoundBreak from './components/RoundBreak';
import Report from './components/Report';
import { Icon } from './components/ui';

// Configure services synchronously on load so the first render already uses saved settings.
const bootSettings = loadSettings();
configureGemini({ apiKey: bootSettings.apiKey, model: bootSettings.model });
configureTTS({ voiceURI: bootSettings.voiceURI, rate: bootSettings.speechRate, lang: bootSettings.speechLang });

export default function App() {
  const [settings, setSettings] = useState(bootSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [step, setStep] = useState('profile');
  const [profile, setProfile] = useState(initialProfile);
  const [cvFile, setCvFile] = useState(null);
  const [cv, setCv] = useState(null);
  const [cvAnalysis, setCvAnalysis] = useState(null);
  const [config, setConfig] = useState(null);
  const [techPlan, setTechPlan] = useState(null);
  const [techResult, setTechResult] = useState(null);
  const [hrPlan, setHrPlan] = useState(null);
  const [hrPlanError, setHrPlanError] = useState('');
  const [hrResult, setHrResult] = useState(null);
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [offlineFallback, setOfflineFallback] = useState(false);
  const [sharedAI, setSharedAI] = useState(false); // the hosting site provides AI with its own server-side key

  const mode = (settings.apiKey || sharedAI) && !offlineFallback ? 'gemini' : 'offline';

  useEffect(() => {
    checkSharedAI().then((available) => {
      configureGemini({ shared: available });
      setSharedAI(available);
    });
  }, []);

  function setOfflineMode(v) {
    setForceOffline(v);
    setOfflineFallback(v);
  }

  useEffect(() => {
    configureGemini({ apiKey: settings.apiKey, model: settings.model });
    configureTTS({ voiceURI: settings.voiceURI, rate: settings.speechRate, lang: settings.speechLang });
  }, [settings]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  // Soft spotlight that follows the mouse (desktop pointers only).
  useEffect(() => {
    if (!window.matchMedia?.('(pointer: fine)').matches) return undefined;
    let raf = 0;
    const move = (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        document.documentElement.style.setProperty('--mx', `${e.clientX}px`);
        document.documentElement.style.setProperty('--my', `${e.clientY}px`);
      });
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      cancelAnimationFrame(raf);
    };
  }, []);

  async function run(label, fn) {
    setError(null);
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      // Gemini overloaded / rate-limited / unreachable -> offer to carry on offline.
      const geminiDown = mode === 'gemini' && [0, 429, 500, 502, 503, 504].includes(e?.status);
      setError({ message: e?.message || String(e), retry: () => run(label, fn), geminiDown });
    } finally {
      setBusy(null);
    }
  }

  function saveAndClose(next) {
    configureGemini({ apiKey: next.apiKey, model: next.model });
    setOfflineMode(false);
    setSettings(next);
    saveSettings(next);
    setShowSettings(false);
  }

  function handleProfile(p, file) {
    setProfile(p);
    setCvFile(file);
    run(mode === 'gemini' ? 'Reading and analysing your CV with AI…' : 'Reading and analysing your CV…', async () => {
      const prepared = await prepareCV(file);
      const analysis = await analyzeCV(p, prepared);
      setCv(prepared);
      setCvAnalysis(analysis);
      setStep('cv');
    });
  }

  function handleStart(cfg) {
    run('Preparing your personalised technical interview…', async () => {
      const plan = await generateTechnicalPlan({ profile, cvAnalysis, cv, level: cfg.level, minutes: cfg.techMinutes });
      setConfig(cfg);
      setTechPlan(plan);
      setStep('technical');
    });
  }

  function loadHrPlan(cfg = config) {
    setHrPlan(null);
    setHrPlanError('');
    generateHRPlan({ profile, cvAnalysis, cv, level: cfg.level, minutes: cfg.hrMinutes })
      .then(setHrPlan)
      .catch((e) => setHrPlanError(e.message || String(e)));
  }

  function handleTechDone(result) {
    setTechResult(result);
    setStep('break');
    loadHrPlan();
  }

  function buildReport(tech, hr) {
    run('Analysing your performance and writing your detailed report…', async () => {
      const r = await generateFinalReport({ profile, cvAnalysis, cv, config, techResult: tech, hrResult: hr });
      setReport(r);
      setStep('report');
    });
  }

  function handleHRDone(result) {
    setHrResult(result);
    buildReport(techResult, result);
  }

  function restart() {
    if (step !== 'report' && !window.confirm('Start over? Current progress will be lost.')) return;
    setStep('profile');
    setCv(null);
    setCvAnalysis(null);
    setConfig(null);
    setTechPlan(null);
    setTechResult(null);
    setHrPlan(null);
    setHrPlanError('');
    setHrResult(null);
    setReport(null);
    setError(null);
  }

  const inInterview = step === 'technical' || step === 'hr';

  return (
    <>
    <div className="backdrop" aria-hidden="true">
      <span className="blob b1" />
      <span className="blob b2" />
      <span className="blob b3" />
      <div className="grid-overlay" />
    </div>
    <div className="spotlight" aria-hidden="true" />
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="logo">
            <Icon name="mic" />
          </span>
          <span>Mock Interview AI</span>
        </div>
        {!inInterview && <Stepper step={step} />}
        <div className="header-actions">
          {offlineFallback ? (
            <button className="mode-pill offline" title="Gemini was busy. Click to try Gemini again." onClick={() => setOfflineMode(false)}>
              Offline (Gemini busy) · retry AI
            </button>
          ) : (
            <span className={`mode-pill ${mode}`} title={mode === 'gemini' ? (settings.apiKey ? settings.model : 'AI provided by this site') : 'No API key - built-in question bank and estimated scoring'}>
              {mode === 'gemini' ? (settings.apiKey ? `AI: ${settings.model}` : 'AI: enabled') : 'Offline mode'}
            </span>
          )}
          {!inInterview && step !== 'profile' && (
            <button className="btn ghost sm" onClick={restart}>Restart</button>
          )}
          {!inInterview && (
            <button className="btn ghost sm" onClick={() => setShowSettings(true)}>⚙ Settings</button>
          )}
        </div>
      </header>

      <main className="main">
        {error && (
          <div className="banner error">
            <span>{error.message}</span>
            <span className="row">
              {error.retry && <button className="btn sm" onClick={error.retry}>Retry</button>}
              {error.geminiDown && (
                <button
                  className="btn sm primary"
                  onClick={() => {
                    setOfflineMode(true);
                    error.retry();
                  }}
                >
                  Continue in Offline mode
                </button>
              )}
              <button className="btn ghost sm" onClick={() => setError(null)}>Dismiss</button>
            </span>
          </div>
        )}

        <div className="step-anim" key={step}>
        {step === 'profile' && <ProfileForm initial={profile} initialFile={cvFile} onSubmit={handleProfile} mode={mode} />}

        {step === 'cv' && cvAnalysis && (
          <CVAnalysis analysis={cvAnalysis} profile={profile} fileName={cv?.fileName} onBack={() => setStep('profile')} onContinue={() => setStep('setup')} />
        )}

        {step === 'setup' && <InterviewSetup cvAnalysis={cvAnalysis} onBack={() => setStep('cv')} onStart={handleStart} />}

        {step === 'technical' && techPlan && (
          <InterviewRoom
            key="technical"
            round="technical"
            plan={techPlan}
            maxMinutes={config.techMinutes}
            profile={profile}
            cvAnalysis={cvAnalysis}
            level={config.level}
            settings={settings}
            onComplete={handleTechDone}
          />
        )}

        {step === 'break' && techResult && (
          <RoundBreak
            techResult={techResult}
            hrMinutes={config.hrMinutes}
            hrPlan={hrPlan}
            hrPlanError={hrPlanError}
            onRetryPlan={() => loadHrPlan()}
            onStartHR={() => setStep('hr')}
            onSkipHR={() => buildReport(techResult, null)}
          />
        )}

        {step === 'hr' && hrPlan && (
          <InterviewRoom
            key="hr"
            round="hr"
            plan={hrPlan}
            maxMinutes={config.hrMinutes}
            profile={profile}
            cvAnalysis={cvAnalysis}
            level={config.level}
            settings={settings}
            onComplete={handleHRDone}
          />
        )}

        {step === 'report' && report && (
          <Report report={report} profile={profile} cvAnalysis={cvAnalysis} config={config} techResult={techResult} hrResult={hrResult} onRestart={restart} />
        )}
        </div>
      </main>

      {busy && <BusyOverlay label={busy} hint={mode === 'gemini' ? 'This usually takes 10-40 seconds.' : 'Just a moment…'} />}

      {showSettings && <SettingsModal settings={settings} onSave={saveAndClose} onClose={() => setShowSettings(false)} />}
    </div>
    </>
  );
}

const TIPS = [
  'Tip: answer with Situation, Task, Action, Result (STAR) for behavioural questions.',
  'Tip: say your approach out loud before you start coding.',
  'Tip: interviewers probe your CV first. Know every line of it.',
  'Tip: state time and space complexity without being asked.',
  'Tip: a short pause beats a filler word. Breathe, then answer.',
  'Tip: look at the camera, not at your own video.',
];

function BusyOverlay({ label, hint }) {
  const [seconds, setSeconds] = useState(0);
  const [tip, setTip] = useState(() => Math.floor(Math.random() * TIPS.length));
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    const r = setInterval(() => setTip((i) => (i + 1) % TIPS.length), 4500);
    return () => {
      clearInterval(t);
      clearInterval(r);
    };
  }, []);
  return (
    <div className="overlay" role="status" aria-live="polite">
      <div className="overlay-box">
        <div className="orbit" aria-hidden="true" />
        <p>{label}</p>
        <small className="muted">{hint}</small>
        <div className="tip" key={tip}>
          {TIPS[tip]}
        </div>
        <div className="elapsed">{seconds}s</div>
      </div>
    </div>
  );
}
