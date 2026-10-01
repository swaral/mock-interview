import { useEffect, useRef, useState } from 'react';
import CameraPanel from './CameraPanel';
import CodeEditor, { starterCode } from './CodeEditor';
import { Spinner } from './ui';
import { cancelSpeech, speak } from '../lib/speech';
import { useSpeechRecognition } from '../lib/useSpeechRecognition';
import { evaluateAnswer } from '../lib/interviewAI';
import { speechMetrics } from '../lib/speechMetrics';
import { CATEGORY_LABELS, LEVELS } from '../lib/levels';

const MAX_FOLLOWUPS = { technical: 4, hr: 2 };

function fmt(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function InterviewRoom({ round, plan, maxMinutes, profile, cvAnalysis, level, settings, onComplete }) {
  const isTech = round === 'technical';
  const roundName = isTech ? 'technical round' : 'HR round';
  const firstName = (profile.name || '').trim().split(/\s+/)[0] || 'there';

  const [phase, setPhase] = useState('ready'); // ready | speaking | listening | evaluating | finished
  const [queue, setQueue] = useState(plan.questions);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [startTs, setStartTs] = useState(null);
  const [now, setNow] = useState(Date.now());

  const cameraRef = useRef(null);
  const answersRef = useRef([]);
  const qStartRef = useRef(0);
  const deadlineRef = useRef(0);
  const followUpsRef = useRef(0);
  const finishedRef = useRef(false);
  const submittingRef = useRef(false);
  const stateRef = useRef({});

  const stt = useSpeechRecognition({
    lang: settings.speechLang,
    onFinal: (chunk) => setAnswer((a) => (a.trim() ? `${a.trimEnd()} ` : '') + chunk.trim()),
  });

  // Async handlers read the latest state from here.
  stateRef.current = { phase, queue, idx, answer, code, language };

  const q = queue[idx];
  const isCoding = q?.type === 'coding';
  const remaining = startTs ? deadlineRef.current - now : maxMinutes * 60000;

  useEffect(() => {
    if (!startTs) return undefined;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [startTs]);

  useEffect(() => {
    if (startTs && remaining <= 0 && !finishedRef.current && !submittingRef.current) {
      if (stateRef.current.phase === 'listening') submitAnswer({ endReason: 'time' });
      else finish('time');
    }
  }, [remaining, startTs]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () => () => {
      finishedRef.current = true;
      cancelSpeech();
      stt.abort();
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Warn before closing the tab mid-interview.
  useEffect(() => {
    const h = (e) => {
      if (!finishedRef.current && startTs) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [startTs]);

  async function startRound() {
    const ts = Date.now();
    deadlineRef.current = ts + maxMinutes * 60000;
    setStartTs(ts);
    setNow(ts);
    cameraRef.current?.startRound();
    setPhase('speaking');
    const hasCoding = plan.questions.some((x) => x.type === 'coding');
    const intro = isTech
      ? `Hello ${firstName}, welcome to your technical interview. This round will take at most ${maxMinutes} minutes. Please look at the screen and answer out loud. ${hasCoding ? 'For coding questions, write your code in the editor and explain your thinking as you go. ' : ''}When you finish an answer, click Submit answer. Let's begin.`
      : `Hello again ${firstName}. This is your HR round, which will take at most ${maxMinutes} minutes. Relax and answer naturally. Let's start.`;
    await speak(intro);
    if (finishedRef.current) return;
    await askQuestion(0, stateRef.current.queue[0]);
  }

  async function askQuestion(i, question, prefix = '') {
    setIdx(i);
    setAnswer('');
    if (question.type === 'coding' && !question.isFollowUp) setCode(starterCode(stateRef.current.language));
    cameraRef.current?.setTrackGaze(question.type !== 'coding');
    setPhase('speaking');
    await speak(prefix ? `${prefix} ${question.question}` : question.question);
    if (finishedRef.current) return;
    qStartRef.current = Date.now();
    cameraRef.current?.resetQuestion();
    setPhase('listening');
    stt.start();
  }

  async function repeatQuestion() {
    const s = stateRef.current;
    if (s.phase !== 'listening') return;
    await stt.stop();
    setPhase('speaking');
    await speak(s.queue[s.idx].question);
    if (finishedRef.current) return;
    setPhase('listening');
    stt.start();
  }

  async function submitAnswer({ skipped = false, endReason = null } = {}) {
    if (stateRef.current.phase !== 'listening' || submittingRef.current) return;
    submittingRef.current = true;
    setPhase('evaluating');
    await stt.stop(); // flush the last recognised words
    await new Promise((r) => setTimeout(r, 60)); // let React commit the final transcript chunk

    const s = stateRef.current;
    const question = s.queue[s.idx];
    const durationSec = Math.max(1, (Date.now() - qStartRef.current) / 1000);
    const transcript = skipped ? '' : s.answer.trim();
    const coding = question.type === 'coding';
    const codeText = coding && !skipped ? s.code : '';
    const record = {
      id: question.id,
      round,
      category: question.category,
      type: question.type,
      question: question.question,
      codingPrompt: question.codingPrompt || '',
      askedAt: question.askedAt || [],
      cvReference: question.cvReference || '',
      idealPoints: question.idealPoints || [],
      isFollowUp: !!question.isFollowUp,
      answer: transcript,
      code: codeText,
      language: coding ? s.language : '',
      skipped,
      durationSec: Math.round(durationSec),
      camera: cameraRef.current?.questionSummary() || null,
      speech: speechMetrics(transcript, durationSec, coding),
      evaluation: null,
    };
    answersRef.current.push(record);

    if (endReason) {
      submittingRef.current = false;
      finish(endReason);
      return;
    }

    const empty = !transcript && (!coding || codeText.trim() === starterCode(s.language).trim() || !codeText.trim());
    let ev = null;
    if (skipped || empty) {
      ev = {
        score: 0,
        verdict: 'no_answer',
        feedback: skipped ? 'Question skipped.' : 'No answer was given.',
        missedPoints: question.idealPoints || [],
        followUp: null,
        ack: skipped ? "No problem, let's move on." : "Okay, let's move on.",
      };
    } else {
      try {
        ev = await evaluateAnswer({ question, answer: transcript, code: codeText, language: s.language, level, round, cvAnalysis, durationSec });
      } catch (e) {
        console.warn('Evaluation failed - will be covered in the final report', e);
      }
    }
    record.evaluation = ev;
    submittingRef.current = false;
    if (finishedRef.current) return;

    const left = deadlineRef.current - Date.now();
    let nextQueue = s.queue;
    if (ev?.followUp && !question.isFollowUp && followUpsRef.current < MAX_FOLLOWUPS[round] && left > 4 * 60000) {
      followUpsRef.current += 1;
      const fu = {
        id: `${question.id}-f`,
        type: question.type,
        category: 'follow_up',
        question: ev.followUp,
        codingPrompt: question.codingPrompt,
        cvReference: question.cvReference,
        askedAt: [],
        idealPoints: [],
        isFollowUp: true,
      };
      nextQueue = [...s.queue.slice(0, s.idx + 1), fu, ...s.queue.slice(s.idx + 1)];
      setQueue(nextQueue);
    }

    let next = s.idx + 1;
    // Don't start a new coding problem with too little time left.
    while (next < nextQueue.length && nextQueue[next].type === 'coding' && !nextQueue[next].isFollowUp && left < 8 * 60000) next++;
    if (next >= nextQueue.length || left < 45000) {
      finish('completed');
      return;
    }
    await askQuestion(next, nextQueue[next], ev?.ack || 'Okay.');
  }

  async function finish(reason) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    stt.abort();
    cancelSpeech();
    setPhase('finished');
    const endedAt = Date.now();
    const closing =
      reason === 'time'
        ? `Time is up. That concludes your ${roundName}. Thank you, ${firstName}.`
        : `That concludes your ${roundName}. Thank you, ${firstName}.`;
    await speak(closing);
    onComplete({
      round,
      answers: answersRef.current,
      camera: cameraRef.current?.roundSummary() || null,
      plannedQuestions: plan.questions.length,
      maxMinutes,
      durationSec: Math.round((endedAt - (deadlineRef.current - maxMinutes * 60000)) / 1000),
      endReason: reason,
    });
  }

  function endEarly() {
    if (!window.confirm(`End the ${roundName} now? Your answers so far will still be evaluated.`)) return;
    if (stateRef.current.phase === 'listening') submitAnswer({ endReason: 'ended_early' });
    else finish('ended_early');
  }

  function changeLanguage(lang) {
    if (code.trim() === starterCode(language).trim() || !code.trim()) setCode(starterCode(lang));
    setLanguage(lang);
  }

  const L = LEVELS[level];

  return (
    <div className="room">
      <div className="card room-top">
        <div className="room-title">
          <span className="badge accent">{isTech ? 'Round 1 · Technical' : 'Round 2 · HR'}</span>
          <span className="muted small">
            {L.label} · {L.experience}
          </span>
        </div>
        <div className="room-meta">
          {startTs && (
            <span className="muted">
              Question {Math.min(idx + 1, queue.length)} / {queue.length}
            </span>
          )}
          <span className={`timer ${remaining < 5 * 60000 ? 'low' : ''}`}>⏱ {fmt(remaining)}</span>
          {startTs && phase !== 'finished' && (
            <button className="btn danger sm" onClick={endEarly}>End round</button>
          )}
        </div>
      </div>

      <div className="room-grid">
        <div className="room-main">
          <div className={`card interviewer ${phase === 'speaking' ? 'speaking' : ''}`}>
            <div className="avatar">{isTech ? '🧑‍💻' : '🧑‍💼'}</div>
            <div className="interviewer-body">
              <div className="interviewer-name">
                {isTech ? 'Technical Interviewer' : 'HR Interviewer'}
                {phase === 'speaking' && (
                  <span className="wave">
                    <i />
                    <i />
                    <i />
                  </span>
                )}
              </div>
              {phase === 'ready' ? (
                <div>
                  <p className="question-text">Ready when you are.</p>
                  <ul className="list small">
                    <li>The interviewer speaks each question aloud; answer by speaking. Your words appear on the right, and you can edit or type too.</li>
                    <li>Click <b>Submit answer</b> (or press Ctrl/⌘ + Enter) when you are done.</li>
                    <li>This round lasts at most {maxMinutes} minutes and may include follow-up questions.</li>
                    {isTech && plan.questions.some((x) => x.type === 'coding') && <li>Coding questions open a code editor. Explain your approach out loud while you code.</li>}
                  </ul>
                </div>
              ) : (
                <p className="question-text" key={q?.id} aria-label={q?.question}>
                  {(q?.question || '').split(' ').map((w, i) => (
                    <span key={i}>
                      <span className="w" aria-hidden="true" style={{ animationDelay: `${Math.min(i * 35, 1400)}ms` }}>
                        {w}
                      </span>{' '}
                    </span>
                  ))}
                </p>
              )}
              {q && phase !== 'ready' && (
                <div className="chips">
                  {q.isFollowUp && <span className="chip accent">Follow-up</span>}
                  <span className="chip">{CATEGORY_LABELS[q.category] || q.category}</span>
                  {q.askedAt?.length > 0 && <span className="chip good">Asked at: {q.askedAt.join(', ')}</span>}
                  {q.cvReference && <span className="chip subtle">CV: {q.cvReference}</span>}
                </div>
              )}
            </div>
          </div>

          {isCoding && phase !== 'ready' && (
            <>
              <div className="card problem">
                <h4>Problem</h4>
                <pre className="problem-text">{q.codingPrompt || q.question}</pre>
              </div>
              <CodeEditor code={code} language={language} onCode={setCode} onLanguage={changeLanguage} readOnly={phase === 'evaluating' || phase === 'finished'} />
            </>
          )}
        </div>

        <div className="room-side">
          <CameraPanel ref={cameraRef} />
          <div className="card answer-card">
            <div className="answer-head">
              <strong>Your answer</strong>
              {phase === 'listening' && stt.listening && (
                <span className="rec">
                  <i /> Listening
                  <span className="eq" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                </span>
              )}
            </div>
            {!stt.supported && <p className="warn small">Speech recognition isn't available in this browser (use Chrome or Edge). Type your answers instead.</p>}
            {stt.error && <p className="warn small">{stt.error}</p>}
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={phase !== 'listening'}
              placeholder={phase === 'listening' ? 'Start speaking… (you can also type here)' : ''}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  submitAnswer();
                }
              }}
            />
            {stt.interim && <p className="interim">{stt.interim}</p>}
            <div className="controls">
              {phase === 'ready' && (
                <button className="btn primary lg" onClick={startRound}>Start {roundName}</button>
              )}
              {phase === 'speaking' && (
                <button className="btn ghost" onClick={cancelSpeech}>Skip reading ⏭</button>
              )}
              {phase === 'listening' && (
                <>
                  <button className="btn primary" onClick={() => submitAnswer()}>Submit answer ✓</button>
                  <button className="btn ghost" onClick={repeatQuestion}>Repeat 🔁</button>
                  <button className="btn ghost" onClick={() => submitAnswer({ skipped: true })}>Skip</button>
                </>
              )}
              {phase === 'evaluating' && (
                <span className="muted">
                  <Spinner small /> Interviewer is noting your answer…
                </span>
              )}
              {phase === 'finished' && (
                <span className="muted">
                  <Spinner small /> Wrapping up the round…
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
