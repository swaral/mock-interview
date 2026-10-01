import { LEVELS } from '../lib/levels';
import { educationRows } from '../lib/education';
import { BulletList, Chips, ScoreBars, ScoreRing } from './ui';

export default function CVAnalysis({ analysis: a, profile, fileName, onContinue, onBack }) {
  const s = a.scores || {};
  return (
    <div className="page">
      <div className="card hero">
        <ScoreRing value={s.overall} label="CV score" size={130} />
        <div className="hero-body">
          <h1>{a.candidateName || profile.name}</h1>
          <p className="muted">{a.headline}</p>
          <div className="chips">
            <span className="chip">{a.domain}</span>
            {a.targetRole && <span className="chip">{a.targetRole}</span>}
            <span className="chip">~{a.estimatedExperienceYears} yrs experience</span>
            <span className="chip accent">Suggested level: {LEVELS[a.suggestedLevel]?.label}</span>
            {a.isSoftwareRole && <span className="chip good">Coding round enabled</span>}
            {a.mode === 'offline' && <span className="chip warn">Offline analysis</span>}
          </div>
          <p className="small muted">File: {fileName}</p>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h3>Summary</h3>
          <p>{a.summary}</p>
          <h3>CV scores</h3>
          <ScoreBars
            items={[
              ['ATS friendliness', s.ats],
              ['Clarity', s.clarity],
              ['Impact', s.impact],
              ['Formatting', s.formatting],
              ['Relevance', s.relevance],
            ]}
          />
        </div>
        <div className="card">
          <h3>Academic record</h3>
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
          <p className="small">{a.academicTrend}</p>
        </div>
      </div>

      <div className="card">
        <h3>Skills detected</h3>
        <Chips items={a.skills?.technical} />
        <Chips items={a.skills?.tools} />
        <Chips items={a.skills?.soft} tone="subtle" />
        {!a.skills?.technical?.length && <p className="muted">No domain skills detected.</p>}
      </div>

      {(a.projects?.length > 0 || a.experience?.length > 0) && (
        <div className="grid2">
          <div className="card">
            <h3>Experience</h3>
            <BulletList items={a.experience?.map((e) => [e.role, e.company, e.duration].filter(Boolean).join(' · '))} empty="None found." />
          </div>
          <div className="card">
            <h3>Projects</h3>
            <BulletList items={a.projects?.map((p) => p.name + (p.tech?.length ? ` (${p.tech.join(', ')})` : ''))} empty="None found." />
          </div>
        </div>
      )}

      <div className="grid3">
        <div className="card">
          <h3 className="good-t">Strengths</h3>
          <BulletList items={a.strengths} empty="-" />
        </div>
        <div className="card">
          <h3 className="warn-t">Weaknesses</h3>
          <BulletList items={a.weaknesses} empty="-" />
        </div>
        <div className="card">
          <h3 className="bad-t">Red flags interviewers may probe</h3>
          <BulletList items={a.redFlags} empty="None spotted." />
        </div>
      </div>

      {a.improvements?.length > 0 && (
        <div className="card">
          <h3>How to improve your CV</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Section</th>
                <th>Issue</th>
                <th>Suggestion</th>
              </tr>
            </thead>
            <tbody>
              {a.improvements.map((i, k) => (
                <tr key={k}>
                  <td>{i.section}</td>
                  <td>{i.issue}</td>
                  <td>{i.suggestion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid2">
        <div className="card">
          <h3>Keywords to add</h3>
          <Chips items={a.keywordsToAdd} tone="accent" />
          {!a.keywordsToAdd?.length && <p className="muted">-</p>}
        </div>
        <div className="card">
          <h3>Topics you'll likely be asked about</h3>
          <Chips items={a.likelyInterviewTopics} />
        </div>
      </div>

      <div className="actions">
        <button className="btn ghost" onClick={onBack}>← Edit details</button>
        <button className="btn primary lg" onClick={onContinue}>Continue to interview setup →</button>
      </div>
    </div>
  );
}
