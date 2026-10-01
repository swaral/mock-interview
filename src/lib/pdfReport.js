import { jsPDF } from 'jspdf';
import { LEVELS } from './levels';
import { educationRows } from './education';
import { aggregateSpeech } from './speechMetrics';

// jsPDF's built-in fonts only cover Latin-1, so normalise typography and drop other characters.
const clean = (s) =>
  String(s ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[•·]/g, '-')
    .replace(/₹/g, 'Rs.')
    .replace(/→/g, '->')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');

export function downloadReportPDF({ report, profile, cvAnalysis, config, techResult, hrResult }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 44;
  const CW = W - 2 * M;
  let y = M;

  const ensure = (h) => {
    if (y + h > H - M) {
      doc.addPage();
      y = M;
    }
  };
  function para(str, { size = 10, bold = false, color = [40, 40, 40], indent = 0, after = 4, font = 'helvetica' } = {}) {
    if (!str) return;
    doc.setFont(font, bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lh = size * 1.35;
    for (const line of doc.splitTextToSize(clean(str), CW - indent)) {
      ensure(lh);
      doc.text(line, M + indent, y + size);
      y += lh;
    }
    y += after;
  }
  function heading(str) {
    ensure(60);
    y += 6;
    para(str, { size: 13.5, bold: true, color: [67, 56, 202], after: 2 });
    doc.setDrawColor(210, 214, 230);
    doc.line(M, y, W - M, y);
    y += 8;
  }
  const sub = (str) => para(str, { size: 11, bold: true, color: [30, 30, 30], after: 2 });
  const bullets = (items) => {
    (items || []).forEach((b) => para(`- ${b}`, { indent: 10, after: 1 }));
    y += 3;
  };
  function bar(label, v, max = 100) {
    if (v == null) return;
    ensure(18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text(clean(label), M, y + 10);
    const bx = M + 150;
    const bw = CW - 200;
    doc.setFillColor(230, 232, 240);
    doc.rect(bx, y + 3, bw, 8, 'F');
    const pct = Math.max(0, Math.min(1, v / max));
    doc.setFillColor(...(pct >= 0.75 ? [34, 160, 90] : pct >= 0.5 ? [230, 150, 20] : [220, 60, 60]));
    doc.rect(bx, y + 3, bw * pct, 8, 'F');
    doc.text(`${Math.round(v)}${max === 10 ? '/10' : ''}`, bx + bw + 10, y + 10);
    y += 16;
  }

  // ---- Title block
  doc.setFillColor(30, 27, 75);
  doc.rect(0, 0, W, 92, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(clean(`Mock Interview Report - ${profile.name}`), M, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  const L = LEVELS[config.level];
  doc.text(clean(`${L.label} (${L.experience})  |  ${cvAnalysis.domain}  |  ${new Date().toLocaleDateString()}${report.mode === 'offline' ? '  |  Offline estimate' : ''}`), M, 64);
  y = 112;

  para(`Overall score: ${report.overallScore}/100   Verdict: ${report.verdict}`, { size: 14, bold: true, color: [30, 27, 75], after: 6 });
  para(report.summary);

  heading('Scores');
  const sc = report.scores;
  bar('Technical knowledge', sc.technicalKnowledge);
  bar('Problem solving', sc.problemSolving);
  bar('Coding', sc.coding);
  bar('Communication', sc.communication);
  bar('HR / Behavioural', sc.hr);
  bar('Body language', sc.bodyLanguage);
  bar('CV alignment', sc.cvAlignment);

  heading('Round 1 - Technical');
  para(report.technicalRound?.summary);
  if (report.technicalRound?.strengths?.length) {
    sub('Strengths');
    bullets(report.technicalRound.strengths);
  }
  if (report.technicalRound?.weaknesses?.length) {
    sub('To improve');
    bullets(report.technicalRound.weaknesses);
  }
  if (report.hrRound) {
    heading('Round 2 - HR');
    para(report.hrRound.summary);
    if (report.hrRound.strengths?.length) {
      sub('Strengths');
      bullets(report.hrRound.strengths);
    }
    if (report.hrRound.weaknesses?.length) {
      sub('To improve');
      bullets(report.hrRound.weaknesses);
    }
  }

  heading('Question-by-question review');
  const reviews = Object.fromEntries((report.questionReviews || []).map((r) => [r.id, r]));
  const answers = [...techResult.answers, ...(hrResult?.answers || [])];
  answers.forEach((a, i) => {
    const r = reviews[a.id];
    const score = r?.score ?? a.evaluation?.score;
    ensure(50);
    para(`Q${i + 1} [${a.round === 'technical' ? 'Technical' : 'HR'}${a.isFollowUp ? ', follow-up' : ''}]${score != null ? `  -  ${score}/10` : ''}`, { bold: true, color: [67, 56, 202], after: 1 });
    para(a.question, { bold: true, after: 2 });
    para(`Your answer: ${a.skipped ? '(skipped)' : a.answer || '(no spoken answer)'}`, { indent: 10, after: 2, color: [70, 70, 70] });
    if (a.code) para(a.code.split('\n').slice(0, 40).join('\n'), { font: 'courier', size: 8.5, indent: 10, after: 3, color: [60, 60, 60] });
    if (r?.feedback || a.evaluation?.feedback) para(`Feedback: ${r?.feedback || a.evaluation.feedback}`, { indent: 10, after: 2 });
    if (r?.idealAnswer) para(`Ideal answer: ${r.idealAnswer}`, { indent: 10, after: 8, color: [20, 110, 70] });
    else y += 6;
  });

  heading('Communication');
  const sp = aggregateSpeech(answers);
  para(report.communication?.summary);
  para(`Average words per answer: ${sp.avgWordsPerAnswer}  |  Speaking pace: ${sp.avgWpm ?? '-'} wpm  |  Filler words: ${sp.fillerCount}${sp.topFillers.length ? ` (${sp.topFillers.join(', ')})` : ''}`, { color: [90, 90, 90] });
  bullets(report.communication?.tips);

  heading('Body language (webcam)');
  para(report.bodyLanguage?.summary);
  for (const [label, c] of [['Technical', techResult.camera], ['HR', hrResult?.camera]]) {
    if (!c) continue;
    para(`${label}: eye contact ${c.eyeContactPct ?? '-'}%, face visible ${c.facePresentPct}%, multiple faces ${c.multipleFacesPct}%, smiling ${c.smilePct}%, blink rate ${c.blinkRatePerMin ?? '-'}/min, head movement ${c.headMovement}, confidence ${c.confidenceScore}/100`, { color: [90, 90, 90] });
  }
  bullets(report.bodyLanguage?.tips);

  heading('CV review');
  const cs = cvAnalysis.scores || {};
  bar('CV overall', cs.overall);
  bar('ATS friendliness', cs.ats);
  bar('Clarity', cs.clarity);
  bar('Impact', cs.impact);
  bar('Formatting', cs.formatting);
  bar('Relevance', cs.relevance);
  para(report.cvReview?.summary || cvAnalysis.summary);
  if (report.cvReview?.consistencyWithAnswers) para(`Did your answers back up your CV? ${report.cvReview.consistencyWithAnswers}`);
  sub('Top fixes');
  bullets(report.cvReview?.topFixes?.length ? report.cvReview.topFixes : cvAnalysis.improvements?.map((i) => `${i.section}: ${i.suggestion}`));

  heading('Academic profile');
  educationRows(profile).forEach((r) => para(`${r.label}${r.detail ? ` (${r.detail})` : ''}: ${r.score}`, { after: 1 }));
  y += 4;
  para(report.academicProfile);

  if (report.studyPlan?.length) {
    heading('Study plan');
    report.studyPlan.forEach((s) => {
      para(s.topic, { bold: true, after: 1 });
      if (s.why) para(s.why, { indent: 10, after: 1 });
      if (s.resources) para(`Resources: ${s.resources}`, { indent: 10, after: 5, color: [90, 90, 90] });
    });
  }
  if (report.nextSteps?.length) {
    heading('Next steps');
    bullets(report.nextSteps);
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8.5);
    doc.setTextColor(150, 150, 150);
    doc.text(`Mock Interview AI  -  page ${i} of ${pages}`, W - M, H - 20, { align: 'right' });
  }
  doc.save(`Interview-Report-${clean(profile.name).replace(/[^\w-]+/g, '_') || 'candidate'}.pdf`);
}
