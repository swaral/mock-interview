import { useRef, useState } from 'react';
import { SCORE_UNITS, isValidScore } from '../lib/education';
import { ACCEPTED_CV } from '../lib/cvParser';
import HeroPreview from './HeroPreview';
import { Icon } from './ui';

const emptyEdu = (enabled = false) => ({ enabled, degree: '', stream: '', score: '', unit: '%' });

export const initialProfile = {
  name: '',
  targetRole: '',
  targetCompany: '',
  education: {
    tenth: { board: '', score: '', unit: '%' },
    twelfth: { type: '12th', stream: '', score: '', unit: '%' },
    ug: emptyEdu(true),
    pg: emptyEdu(false),
    phd: emptyEdu(false),
  },
};

const LISTS = {
  boards: ['CBSE', 'ICSE', 'State Board', 'IB', 'IGCSE', 'NIOS'],
  streams12: ['Science (PCM)', 'Science (PCB)', 'Science (PCMB)', 'Commerce', 'Commerce with Maths', 'Arts / Humanities', 'Vocational'],
  diploma: ['Computer Engineering', 'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering', 'Electronics & Communication', 'Information Technology'],
  ug: ['B.Tech', 'B.E.', 'B.Sc', 'BCA', 'B.Com', 'BBA', 'B.A.', 'B.Arch', 'B.Pharm', 'MBBS', 'LLB'],
  pg: ['M.Tech', 'M.E.', 'M.Sc', 'MCA', 'MBA', 'PGDM', 'M.Com', 'M.A.', 'M.Pharm', 'LLM'],
  branches: ['Computer Science', 'Information Technology', 'Electronics & Communication', 'Electrical', 'Mechanical', 'Civil', 'Chemical', 'Data Science / AI', 'Finance', 'Marketing', 'HR', 'Economics'],
};

function DataList({ id, items }) {
  return (
    <datalist id={id}>
      {items.map((x) => (
        <option key={x} value={x} />
      ))}
    </datalist>
  );
}

function ScoreInput({ data, onChange, optional }) {
  const unit = SCORE_UNITS.find((u) => u.v === data.unit) || SCORE_UNITS[0];
  return (
    <div className="score-input">
      <input
        type="number"
        min="0"
        max={unit.max}
        step="0.01"
        placeholder={optional ? 'optional' : unit.v === '%' ? 'e.g. 85' : 'e.g. 8.2'}
        value={data.score}
        onChange={(e) => onChange({ score: e.target.value })}
      />
      <select value={data.unit} onChange={(e) => onChange({ unit: e.target.value })}>
        {SCORE_UNITS.map((u) => (
          <option key={u.v} value={u.v}>{u.label}</option>
        ))}
      </select>
    </div>
  );
}

const Err = ({ msg }) => (msg ? <small className="err">{msg}</small> : null);

function HigherEdu({ id, title, data, onChange, errors, degrees, showDegree = true, scoreOptional = false }) {
  return (
    <div className={`edu-card ${data.enabled ? '' : 'off'}`}>
      <label className="edu-toggle">
        <input type="checkbox" checked={data.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} />
        <strong>{title}</strong>
        {!data.enabled && <span className="muted small"> - tick if applicable</span>}
      </label>
      {data.enabled && (
        <div className="edu-fields">
          {showDegree && (
            <label className="field">
              <span>Degree</span>
              <input list={`${id}-deg`} value={data.degree} onChange={(e) => onChange({ degree: e.target.value })} placeholder="Select or type" />
              <DataList id={`${id}-deg`} items={degrees} />
            </label>
          )}
          <label className="field">
            <span>Stream / Specialisation</span>
            <input list="branches" value={data.stream} onChange={(e) => onChange({ stream: e.target.value })} placeholder="e.g. Computer Science" />
            <Err msg={errors[`${id}Stream`]} />
          </label>
          <label className="field">
            <span>Score{scoreOptional ? ' (optional)' : ''}</span>
            <ScoreInput data={data} onChange={onChange} optional={scoreOptional} />
            <Err msg={errors[id]} />
          </label>
        </div>
      )}
    </div>
  );
}

export default function ProfileForm({ initial, initialFile, onSubmit, mode }) {
  const [p, setP] = useState(initial);
  const [file, setFile] = useState(initialFile || null);
  const [errors, setErrors] = useState({});
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  const setField = (k, v) => setP((prev) => ({ ...prev, [k]: v }));
  const setEdu = (level, patch) =>
    setP((prev) => ({ ...prev, education: { ...prev.education, [level]: { ...prev.education[level], ...patch } } }));

  function validate() {
    const e = {};
    const ed = p.education;
    if (!p.name.trim()) e.name = 'Please enter your name';
    if (!isValidScore(ed.tenth)) e.tenth = 'Enter a valid 10th score';
    if (!ed.twelfth.stream.trim()) e.twelfthStream = 'Enter your stream';
    if (!isValidScore(ed.twelfth)) e.twelfth = 'Enter a valid score';
    for (const k of ['ug', 'pg', 'phd']) {
      if (!ed[k].enabled) continue;
      if (!ed[k].stream.trim()) e[`${k}Stream`] = 'Enter stream / specialisation';
      const optional = k === 'phd';
      if ((!optional || ed[k].score !== '') && !isValidScore(ed[k])) e[k] = 'Enter a valid score';
    }
    if (!file) e.file = 'Please upload your CV';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function pickFile(f) {
    if (!f) return;
    setFile(f);
    setErrors((e) => ({ ...e, file: undefined }));
  }

  function submit(ev) {
    ev.preventDefault();
    if (validate()) onSubmit(p, file);
  }

  const ed = p.education;
  const isDiploma = ed.twelfth.type === 'diploma';

  return (
    <form className="page" onSubmit={submit} noValidate>
      <DataList id="branches" items={LISTS.branches} />
      <header className="hero-landing">
        <div>
          <span className="eyebrow">
            <i /> AI mock interviews · Technical + HR
          </span>
          <h1 className="hero-title">
            Rehearse the interview <span className="grad-text">before it counts.</span>
          </h1>
          <p className="hero-lede">
            Upload your CV and face a spoken interview built from it, with real FAANG coding problems, a separate HR round, live camera
            feedback and a detailed report at the end.
          </p>
          <ul className="feature-list">
            <li>
              <span className="feature-icon"><Icon name="cv" /></span> Questions from your CV
            </li>
            <li>
              <span className="feature-icon"><Icon name="code" /></span> FAANG coding problems
            </li>
            <li>
              <span className="feature-icon"><Icon name="camera" /></span> Voice &amp; camera analysis
            </li>
            <li>
              <span className="feature-icon"><Icon name="report" /></span> Detailed PDF report
            </li>
          </ul>
          <a className="btn primary lg" href="#details">
            Start with your details ↓
          </a>
        </div>
        <HeroPreview />
      </header>

      {mode === 'offline' && (
        <div className="banner info">
          <strong>Offline practice mode</strong> - no API key set. Questions come from the built-in FAANG bank and your CV keywords, and scoring is an estimate.
          Add a free Gemini key in ⚙ Settings any time for full AI analysis.
        </div>
      )}

      <section className="card" id="details" style={{ scrollMarginTop: 90 }}>
        <h2>
          <span className="sec-num">1</span> About you
        </h2>
        <div className="grid3">
          <label className="field">
            <span>Full name *</span>
            <input value={p.name} onChange={(e) => setField('name', e.target.value)} placeholder="Your name" />
            <Err msg={errors.name} />
          </label>
          <label className="field">
            <span>Target role (optional)</span>
            <input value={p.targetRole} onChange={(e) => setField('targetRole', e.target.value)} placeholder="e.g. Software Engineer, Data Analyst" />
          </label>
          <label className="field">
            <span>Target company (optional)</span>
            <input value={p.targetCompany} onChange={(e) => setField('targetCompany', e.target.value)} placeholder="e.g. Google, Amazon, TCS" />
          </label>
        </div>
      </section>

      <section className="card">
        <h2>
          <span className="sec-num">2</span> Education
        </h2>
        <div className="edu-grid">
          <div className="edu-card">
            <strong>10th *</strong>
            <div className="edu-fields">
              <label className="field">
                <span>Board</span>
                <input list="boards" value={ed.tenth.board} onChange={(e) => setEdu('tenth', { board: e.target.value })} placeholder="e.g. CBSE" />
                <DataList id="boards" items={LISTS.boards} />
              </label>
              <label className="field">
                <span>Score</span>
                <ScoreInput data={ed.tenth} onChange={(patch) => setEdu('tenth', patch)} />
                <Err msg={errors.tenth} />
              </label>
            </div>
          </div>

          <div className="edu-card">
            <div className="seg">
              <button type="button" className={!isDiploma ? 'on' : ''} onClick={() => setEdu('twelfth', { type: '12th' })}>12th *</button>
              <button type="button" className={isDiploma ? 'on' : ''} onClick={() => setEdu('twelfth', { type: 'diploma' })}>Diploma *</button>
            </div>
            <div className="edu-fields">
              <label className="field">
                <span>Stream</span>
                <input list="streams12" value={ed.twelfth.stream} onChange={(e) => setEdu('twelfth', { stream: e.target.value })} placeholder={isDiploma ? 'e.g. Mechanical Engineering' : 'e.g. Science (PCM)'} />
                <DataList id="streams12" items={isDiploma ? LISTS.diploma : LISTS.streams12} />
                <Err msg={errors.twelfthStream} />
              </label>
              <label className="field">
                <span>Score</span>
                <ScoreInput data={ed.twelfth} onChange={(patch) => setEdu('twelfth', patch)} />
                <Err msg={errors.twelfth} />
              </label>
            </div>
          </div>

          <HigherEdu id="ug" title="Undergraduate (UG)" data={ed.ug} onChange={(x) => setEdu('ug', x)} errors={errors} degrees={LISTS.ug} />
          <HigherEdu id="pg" title="Postgraduate (PG)" data={ed.pg} onChange={(x) => setEdu('pg', x)} errors={errors} degrees={LISTS.pg} />
          <HigherEdu id="phd" title="PhD" data={ed.phd} onChange={(x) => setEdu('phd', x)} errors={errors} degrees={[]} showDegree={false} scoreOptional />
        </div>
      </section>

      <section className="card">
        <h2>
          <span className="sec-num">3</span> Upload your CV *
        </h2>
        <div
          className={`dropzone ${drag ? 'drag' : ''} ${file ? 'has-file' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            pickFile(e.dataTransfer.files?.[0]);
          }}
        >
          <input ref={inputRef} type="file" accept={ACCEPTED_CV} hidden onChange={(e) => pickFile(e.target.files?.[0])} />
          {file ? (
            <>
              <div className="drop-icon" key="done">
                <Icon name="check" />
              </div>
              <strong>{file.name}</strong>
              <span className="muted small">{(file.size / 1024).toFixed(0)} KB - click to change</span>
            </>
          ) : (
            <>
              <div className="drop-icon" key="empty">
                <Icon name="upload" />
              </div>
              <strong>Drop your CV here or click to browse</strong>
              <span className="muted small">PDF, DOCX or TXT{mode === 'offline' ? '' : ' (images of a CV also work)'} · max 15 MB</span>
            </>
          )}
        </div>
        <Err msg={errors.file} />
      </section>

      <div className="actions">
        <button className="btn primary lg" type="submit">Analyse my CV →</button>
      </div>
    </form>
  );
}
