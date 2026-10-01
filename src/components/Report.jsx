import { useState } from 'react';
import { BulletList, Confetti, ScoreBars, ScoreRing } from './ui';
import { CATEGORY_LABELS, LEVELS } from '../lib/levels';
import { educationRows } from '../lib/education';
import { aggregateSpeech } from '../lib/speechMetrics';
import { downloadReportPDF } from '../lib/pdfReport';

function verdictClass(v = '') {
  if (/strong hire|^hire/i.test(v)) return 'good';
  if (/lean hire/i.test(v)) return 'warn';
  return 'bad';
}

function RoundCard({ title, data }) {
  if (!data) return null;
  return (
    <div className="card">
      <h3>{title}</h3>
      <p>{data.summary}</p>
      <div className="grid2">
        <div>
          <h4 className="good-t">Strengths</h4>
          <BulletList items={data.strengths} empty="-" />
        </div>
        <div>
          <h4 className="warn-t">To improve</h4>
          <BulletList items={data.weaknesses} empty="-" />
        </div>
      </div>
    </div>
  );
}

function CameraTable({ tech, hr }) {
  if (!tech && !hr) return <p className="muted">Camera data was not available.</p>;
  const rows = [
    ['Eye contact', (c) => (c.eyeContactPct != null ? `${c.eyeContactPct}%` : '-')],
    ['Face visible', (c) => `${c.facePresentPct}%`],
    ['Multiple faces', (c) => `${c.multipleFacesPct}%`],
    ['Smiling', (c) => `${c.smilePct}%`],
    ['Tension (frown / pressed lips)', (c) => `${c.tensionPct}%`],
    ['Blink rate', (c) => (c.blinkRatePerMin != null ? `${c.blinkRatePerMin}/min` : '-')],
    ['Head movement', (c) => c.headMovement],
    ['Confidence (est.)', (c) => `${c.confidenceScore}/100`],
  ];
  return (
    <table className="table">
      <thead>
        <tr>
          <th />
          {tech && <th className="num">Technical</th>}
          {hr && <th className="num">HR</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, fn]) => (
          <tr key={label}>
            <td>{label}</td>
            {tech && <td className="num">{fn(tech)}</td>}
            {hr && <td className="num">{fn(hr)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function QuestionReview({ a, r, index }) {
  const score = a.skipped ? 0 : r?.score ?? a.evaluation?.score;
  const pct = score != null ? score * 10 : null;
  return (
    <details className="qreview">
      <summary>
        <span className={`qscore ${pct == null ? '' : pct >= 70 ? 'good' : pct >= 50 ? 'warn' : 'bad'}`}>{score != null ? `${score}/10` : '-'}</span>
        <span className="qtitle">
          <span className="muted small">
            Q{index + 1} · {a.round === 'technical' ? 'Technical' : 'HR'} · {CATEGORY_LABELS[a.category] || a.category}
          </span>
          {a.question}
        </span>
      </summary>
      <div className="qbody">
        {a.codingPrompt && <pre className="problem-text">{a.codingPrompt}</pre>}
        <h4>Your answer</h4>
        <p className={a.answer ? '' : 'muted'}>{a.skipped ? 'Skipped' : a.answer || 'No spoken answer recorded.'}</p>
        {a.code && <pre className="code">{a.code}</pre>}
        {(r?.feedback || a.evaluation?.feedback) && (
          <>
            <h4>Feedback</h4>
            <p>{r?.feedback || a.evaluation.feedback}</p>
          </>
        )}
        {a.evaluation?.codeReview && <p className="small muted">Code review: {a.evaluation.codeReview}</p>}
        {a.evaluation?.missedPoints?.length > 0 && (
          <>
            <h4>Missed points</h4>
            <BulletList items={a.evaluation.missedPoints} />
          </>
        )}
        {r?.idealAnswer && (
          <>
            <h4 className="good-t">Ideal answer</h4>
            <p>{r.idealAnswer}</p>
          </>
        )}
        <p className="small muted">
          Time: {a.durationSec}s{a.speech?.wpm ? ` · ${a.speech.wpm} wpm` : ''}
          {a.speech?.fillerCount ? ` · ${a.speech.fillerCount} filler words` : ''}
          {a.camera?.eyeContactPct != null ? ` · eye contact ${a.camera.eyeContactPct}%` : ''}
          {a.askedAt?.length ? ` · asked at ${a.askedAt.join(', ')}` : ''}
        </p>
      </div>
    </details>
  );
}

export default function Report({ report, profile, cvAnalysis, config, techResult, hrResult, onRestart }) {
  const [pdfError, setPdfError] = useState('');
  const answers = [...(techResult?.answers || []), ...(hrResult?.answers || [])];
  const reviews = Object.fromEntries((report.questionReviews || []).map((r) => [r.id, r]));
  const sc = report.scores || {};
  const speech = aggregateSpeech(answers);
  const L = LEVELS[config.level];
  const cs = cvAnalysis.scores || {};

  function download() {
    try {
      setPdfError('');
      downloadReportPDF({ report, profile, cvAnalysis, config, techResult, hrResult });
    } catch (e) {
      console.error(e);
      setPdfError(`Could not create the PDF: ${e.message}`);
    }
  }

  return (
    <div className="page report">
      {(report.overallScore >= 70 || verdictClass(report.verdict) === 'good') && <Confetti />}
      <div className="card hero">
        <ScoreRing value={report.overallScore} label="Overall" size={150} />
        <div className="hero-body">
          <div className="row">
            <h1>Interview report - {profile.name}</h1>
            <span className={`verdict ${verdictClass(report.verdict)}`}>{report.verdict}</span>
          </div>
          <div className="chips">
            <span className="chip">{L.label} · {L.experience}</span>
            <span className="chip">{cvAnalysis.domain}</span>
            <span className="chip">Technical: {Math.round((techResult?.durationSec || 0) / 60)} / {config.techMinutes} min</span>
            {hrResult ? <span className="chip">HR: {Math.round(hrResult.durationSec / 60)} / {config.hrMinutes} min</span> : <span className="chip warn">HR skipped</span>}
            {report.mode === 'offline' && <span className="chip warn">Offline estimate</span>}
          </div>
          <p>{report.summary}</p>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h3>Performance scores</h3>
          <ScoreBars
            items={[
              ['Technical knowledge', sc.technicalKnowledge],
              ['Problem solving', sc.problemSolving],
              ['Coding', sc.coding],
              ['Communication', sc.communication],
              ['HR / Behavioural', sc.hr],
              ['Body language', sc.bodyLanguage],
              ['CV alignment', sc.cvAlignment],
            ]}
          />
        </div>
        <div className="card">
          <h3>Body language (webcam)</h3>
          <CameraTable tech={techResult?.camera} hr={hrResult?.camera} />
        </div>
      </div>

      <RoundCard title="Round 1 - Technical" data={report.technicalRound} />
      <RoundCard title="Round 2 - HR" data={report.hrRound} />

      <div className="card">
        <h3>Question-by-question review</h3>
        <p className="small muted">Click a question to see your answer, feedback and the ideal answer.</p>
        {answers.map((a, i) => (
          <QuestionReview key={`${a.id}-${i}`} a={a} r={reviews[a.id]} index={i} />
        ))}
        {!answers.length && <p className="muted">No questions were answered.</p>}
      </div>

      <div className="grid2">
        <div className="card">
          <h3>Communication</h3>
          <p>{report.communication?.summary}</p>
          <div className="stat-row">
            <div><strong>{speech.avgWordsPerAnswer}</strong><span>words / answer</span></div>
            <div><strong>{speech.avgWpm ?? '-'}</strong><span>words / min</span></div>
            <div><strong>{speech.fillerCount}</strong><span>filler words</span></div>
            <div><strong>{speech.skipped}</strong><span>skipped</span></div>
          </div>
          <BulletList items={report.communication?.tips} />
        </div>
        <div className="card">
          <h3>Body-language tips</h3>
          <p>{report.bodyLanguage?.summary}</p>
          <BulletList items={report.bodyLanguage?.tips} />
        </div>
      </div>

      <div className="card">
        <h3>How was your CV?</h3>
        <div className="grid2">
          <div>
            <ScoreBars
              items={[
                ['CV overall', cs.overall],
                ['ATS friendliness', cs.ats],
                ['Clarity', cs.clarity],
                ['Impact', cs.impact],
                ['Formatting', cs.formatting],
                ['Relevance', cs.relevance],
              ]}
            />
          </div>
          <div>
            <p>{report.cvReview?.summary || cvAnalysis.summary}</p>
            {report.cvReview?.consistencyWithAnswers && (
              <p>
                <b>Did your answers back up your CV?</b> {report.cvReview.consistencyWithAnswers}
              </p>
            )}
          </div>
        </div>
        <h4>Top fixes for your CV</h4>
        <BulletList items={report.cvReview?.topFixes?.length ? report.cvReview.topFixes : cvAnalysis.improvements?.map((i) => `${i.section}: ${i.suggestion}`)} empty="-" />
      </div>

      <div className="grid2">
        <div className="card">
          <h3>Academic profile</h3>
          <table className="table">
            <tbody>
              {educationRows(profile).map((r) => (
                <tr key={r.key}>
                  <td>{r.label}</td>
                  <td className="muted">{r.detail}</td>
                  <td className="num">{r.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small">{report.academicProfile}</p>
        </div>
        <div className="card">
          <h3>Next steps</h3>
          <BulletList items={report.nextSteps} empty="-" />
        </div>
      </div>

      {report.studyPlan?.length > 0 && (
        <div className="card">
          <h3>Personal study plan</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Topic</th>
                <th>Why</th>
                <th>Resources</th>
              </tr>
            </thead>
            <tbody>
              {report.studyPlan.map((s, i) => (
                <tr key={i}>
                  <td><b>{s.topic}</b></td>
                  <td>{s.why}</td>
                  <td className="small">{s.resources}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pdfError && <p className="warn">{pdfError}</p>}
      <div className="actions">
        <button className="btn ghost" onClick={onRestart}>Start a new interview</button>
        <button className="btn primary lg" onClick={download}>⬇ Download PDF report</button>
      </div>
    </div>
  );
}
