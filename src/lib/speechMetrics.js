const FILLERS = ['um', 'umm', 'uh', 'uhh', 'hmm', 'basically', 'actually', 'literally', 'you know', 'i mean', 'kind of', 'sort of', 'like'];

export function speechMetrics(text, durationSec, isCoding = false) {
  const clean = (text || '').trim();
  const words = clean ? clean.split(/\s+/).length : 0;
  const lower = ` ${clean.toLowerCase().replace(/[^a-z' ]/g, ' ')} `;
  const fillers = {};
  let fillerCount = 0;
  for (const f of FILLERS) {
    const count = (lower.match(new RegExp(`\\b${f}\\b`, 'g')) || []).length;
    if (count) {
      fillers[f] = count;
      fillerCount += count;
    }
  }
  // Words-per-minute is meaningless while typing code, so skip it for coding questions.
  const wpm = !isCoding && durationSec > 8 && words > 5 ? Math.round(words / (durationSec / 60)) : null;
  return { words, wpm, fillerCount, fillers };
}

export function aggregateSpeech(answers) {
  const spoken = answers.filter((a) => !a.skipped && a.speech);
  const totalWords = spoken.reduce((s, a) => s + a.speech.words, 0);
  const wpms = spoken.map((a) => a.speech.wpm).filter((x) => x);
  const fillers = {};
  for (const a of spoken) for (const [k, v] of Object.entries(a.speech.fillers || {})) fillers[k] = (fillers[k] || 0) + v;
  const fillerCount = Object.values(fillers).reduce((s, v) => s + v, 0);
  return {
    answered: spoken.filter((a) => a.speech.words > 0 || a.code).length,
    skipped: answers.filter((a) => a.skipped).length,
    totalWords,
    avgWordsPerAnswer: spoken.length ? Math.round(totalWords / spoken.length) : 0,
    avgWpm: wpms.length ? Math.round(wpms.reduce((s, v) => s + v, 0) / wpms.length) : null,
    fillerCount,
    fillersPer100Words: totalWords ? +((100 * fillerCount) / totalWords).toFixed(1) : 0,
    topFillers: Object.entries(fillers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([w, c]) => `${w} (${c})`),
  };
}
