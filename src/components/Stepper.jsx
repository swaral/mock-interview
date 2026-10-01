const STEPS = [
  { key: 'profile', label: 'Profile & CV' },
  { key: 'cv', label: 'CV Analysis' },
  { key: 'setup', label: 'Setup' },
  { key: 'technical', label: 'Technical' },
  { key: 'hr', label: 'HR' },
  { key: 'report', label: 'Report' },
];

export default function Stepper({ step }) {
  const current = STEPS.findIndex((s) => s.key === (step === 'break' ? 'hr' : step));
  return (
    <ol className="stepper">
      {STEPS.map((s, i) => (
        <li key={s.key} className={i < current ? 'done' : i === current ? 'active' : ''}>
          <span className="dot">{i < current ? '✓' : i + 1}</span>
          <span className="label">{s.label}</span>
        </li>
      ))}
    </ol>
  );
}
