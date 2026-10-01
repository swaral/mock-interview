import { Spinner } from './ui';

export default function RoundBreak({ techResult, hrMinutes, hrPlan, hrPlanError, onRetryPlan, onStartHR, onSkipHR }) {
  const answered = techResult.answers.filter((a) => !a.skipped).length;
  return (
    <div className="page narrow">
      <div className="card center">
        <svg className="success-mark" viewBox="0 0 84 84" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="42" cy="42" r="37" />
          <path d="M27 43l10 10 20-22" />
        </svg>
        <h1>Technical round complete</h1>
        <p className="muted">
          You answered {answered} of {techResult.answers.length} questions in {Math.max(1, Math.round(techResult.durationSec / 60))} min.
        </p>
        <hr />
        <h2>Next: HR round (max {hrMinutes} min)</h2>
        <p>A separate HR interviewer will ask behavioural and CV-based questions. Take a breath, have some water, and start when you're ready.</p>
        {hrPlanError ? (
          <p className="warn">
            Could not prepare HR questions: {hrPlanError}{' '}
            <button className="btn ghost sm" onClick={onRetryPlan}>Retry</button>
          </p>
        ) : (
          !hrPlan && (
            <p className="muted">
              <Spinner small /> Preparing HR questions…
            </p>
          )
        )}
        <div className="actions center">
          <button className="btn ghost" onClick={onSkipHR}>Skip HR & get report</button>
          <button className="btn primary lg" disabled={!hrPlan} onClick={onStartHR}>Start HR round →</button>
        </div>
      </div>
    </div>
  );
}
