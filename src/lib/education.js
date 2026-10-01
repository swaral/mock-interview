// Helpers for the academic record entered on the profile screen.

export const SCORE_UNITS = [
  { v: '%', label: '%', max: 100 },
  { v: 'CGPA/10', label: 'CGPA (/10)', max: 10 },
  { v: 'CGPA/4', label: 'CGPA (/4)', max: 4 },
];

export function isValidScore(s) {
  if (!s || s.score === '' || s.score == null) return false;
  const n = Number(s.score);
  const max = SCORE_UNITS.find((u) => u.v === s.unit)?.max ?? 100;
  return !Number.isNaN(n) && n >= 0 && n <= max;
}

/** Approximate percentage (common Indian conversion: CGPA x 9.5). */
export function toPercent(s) {
  if (!isValidScore(s)) return null;
  const n = Number(s.score);
  if (s.unit === 'CGPA/10') return Math.min(100, +(n * 9.5).toFixed(1));
  if (s.unit === 'CGPA/4') return +(n * 25).toFixed(1);
  return n;
}

export function scoreText(s) {
  if (!isValidScore(s)) return 'not given';
  return s.unit === '%' ? `${s.score}%` : `${s.score} ${s.unit}`;
}

export function educationRows(profile) {
  const e = profile.education;
  const rows = [
    { key: 'tenth', label: '10th', detail: e.tenth.board || '', data: e.tenth },
    {
      key: 'twelfth',
      label: e.twelfth.type === 'diploma' ? 'Diploma' : '12th',
      detail: e.twelfth.stream,
      data: e.twelfth,
    },
  ];
  for (const [key, label] of [
    ['ug', 'UG'],
    ['pg', 'PG'],
    ['phd', 'PhD'],
  ]) {
    const d = e[key];
    if (d?.enabled) rows.push({ key, label, detail: [d.degree, d.stream].filter(Boolean).join(' - '), data: d });
  }
  return rows.map((r) => ({ ...r, score: scoreText(r.data), pct: toPercent(r.data) }));
}

export function formatEducation(profile) {
  return educationRows(profile)
    .map((r) => `- ${r.label}${r.detail ? ` (${r.detail})` : ''}: ${r.score}`)
    .join('\n');
}

/** Finds noticeable dips between consecutive stages. */
export function academicTrend(profile) {
  const rows = educationRows(profile).filter((r) => r.pct != null);
  const dips = [];
  for (let i = 1; i < rows.length; i++) {
    const drop = rows[i - 1].pct - rows[i].pct;
    if (drop >= 10) dips.push({ from: rows[i - 1], to: rows[i], drop: Math.round(drop) });
  }
  const pcts = rows.map((r) => r.pct);
  let text = '';
  if (pcts.length >= 2) {
    const first = pcts[0];
    const last = pcts[pcts.length - 1];
    const avg = Math.round(pcts.reduce((s, v) => s + v, 0) / pcts.length);
    const dir = last - first > 5 ? 'an improving' : first - last > 5 ? 'a declining' : 'a fairly consistent';
    text = `Your academic record shows ${dir} trend (average about ${avg}%). `;
    if (dips.length)
      text += dips.map((d) => `Score dropped by ~${d.drop} points from ${d.from.label} to ${d.to.label}; be ready to explain it.`).join(' ');
    else text += 'There are no sharp dips, which interviewers view positively.';
    if (avg < 60) text += ' Some companies apply a 60% cut-off, so highlight projects and skills to offset this.';
  }
  return { rows, dips, text };
}
