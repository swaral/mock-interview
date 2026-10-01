// Single entry point for all "AI" work. Uses Gemini when a key is set, otherwise Offline mode.
import { generateJSON, isGeminiConfigured } from './gemini';
import { cvAnalysisPrompt, evaluatePrompt, finalReportPrompt, hrPlanPrompt, technicalPlanPrompt } from './prompts';
import { LEVELS } from './levels';
import { aggregateSpeech } from './speechMetrics';
import { pickFaangPool } from '../data/questionBank';
import * as offline from './offlineAI';

export const aiMode = () => (isGeminiConfigured() ? 'gemini' : 'offline');

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const int = (x, d = 0) => {
  const n = Math.round(Number(x));
  return Number.isFinite(n) ? n : d;
};
const toText = (x) => {
  if (x == null) return '';
  if (typeof x === 'string') return x;
  if (typeof x === 'number' || typeof x === 'boolean') return String(x);
  if (Array.isArray(x)) return x.map(toText).join(', ');
  if (typeof x === 'object') return Object.values(x).map(toText).filter(Boolean).join(' - ');
  return String(x);
};
const arr = (x) => (Array.isArray(x) ? x.filter((v) => v != null && v !== '') : []);
const arrStr = (x) => arr(x).map(toText).filter(Boolean);

// ------------------------------------------------------------------ CV

export async function analyzeCV(profile, cv) {
  if (!isGeminiConfigured()) return offline.analyzeCV(profile, cv.text);
  const { system, text } = cvAnalysisPrompt(profile);
  const r = await generateJSON({ system, parts: [{ text }, cv.part], temperature: 0.3 });
  const s = r.scores || {};
  return {
    mode: 'gemini',
    candidateName: toText(r.candidateName) || profile.name,
    headline: toText(r.headline),
    domain: toText(r.domain) || 'General',
    targetRole: profile.targetRole || toText(r.targetRole),
    isSoftwareRole: !!r.isSoftwareRole,
    estimatedExperienceYears: Number(r.estimatedExperienceYears) || 0,
    suggestedLevel: LEVELS[r.suggestedLevel] ? r.suggestedLevel : 'beginner',
    summary: toText(r.summary),
    scores: Object.fromEntries(['overall', 'ats', 'clarity', 'impact', 'formatting', 'relevance'].map((k) => [k, clamp(int(s[k]), 0, 100)])),
    skills: { technical: arrStr(r.skills?.technical), tools: arrStr(r.skills?.tools), soft: arrStr(r.skills?.soft) },
    experience: arr(r.experience).map((e) => ({ role: toText(e.role), company: toText(e.company), duration: toText(e.duration), highlights: arrStr(e.highlights) })),
    projects: arr(r.projects).map((p) => ({ name: toText(p.name), tech: arrStr(p.tech), summary: toText(p.summary) })),
    certifications: arrStr(r.certifications),
    achievements: arrStr(r.achievements),
    academicTrend: toText(r.academicTrend),
    strengths: arrStr(r.strengths),
    weaknesses: arrStr(r.weaknesses),
    redFlags: arrStr(r.redFlags),
    improvements: arr(r.improvements).map((i) => ({ section: toText(i.section), issue: toText(i.issue), suggestion: toText(i.suggestion) })),
    missingSections: arrStr(r.missingSections),
    keywordsToAdd: arrStr(r.keywordsToAdd),
    likelyInterviewTopics: arrStr(r.likelyInterviewTopics),
  };
}

// ------------------------------------------------------------------ Plans

function normalizePlan(r, prefix, software) {
  const questions = arr(r.questions)
    .map((q, i) => {
      const type = q.type === 'coding' && software ? 'coding' : 'verbal';
      return {
        id: `${prefix}${i + 1}`,
        type,
        category: toText(q.category) || (type === 'coding' ? 'faang_coding' : 'general'),
        question: toText(q.question).trim(),
        codingPrompt: type === 'coding' ? toText(q.codingPrompt || q.question) : '',
        askedAt: arrStr(q.askedAt),
        cvReference: toText(q.cvReference),
        idealPoints: arrStr(q.idealPoints),
        suggestedMinutes: clamp(Number(q.suggestedMinutes) || 4, 1, 25),
      };
    })
    .filter((q) => q.question);
  if (!questions.length) throw new Error('No interview questions were generated. Please retry.');
  return { questions };
}

export async function generateTechnicalPlan({ profile, cvAnalysis, cv, level, minutes }) {
  if (!isGeminiConfigured()) return offline.technicalPlan({ profile, cvAnalysis, level, minutes });
  const pool = pickFaangPool(level);
  const { system, text } = technicalPlanPrompt({ profile, cvAnalysis, level, minutes, pool });
  const r = await generateJSON({ system, parts: [{ text }, cv.part], temperature: 0.9 });
  return normalizePlan(r, 't', cvAnalysis.isSoftwareRole);
}

export async function generateHRPlan({ profile, cvAnalysis, cv, level, minutes }) {
  if (!isGeminiConfigured()) return offline.hrPlan({ profile, cvAnalysis, level, minutes });
  const { system, text } = hrPlanPrompt({ profile, cvAnalysis, level, minutes });
  const r = await generateJSON({ system, parts: [{ text }, cv.part], temperature: 0.9 });
  return normalizePlan(r, 'h', false);
}

// ------------------------------------------------------------------ Per-answer evaluation

export async function evaluateAnswer(args) {
  if (!isGeminiConfigured()) return offline.evaluateAnswer(args);
  const { system, text } = evaluatePrompt(args);
  let r;
  try {
    r = await generateJSON({ system, parts: [{ text }], temperature: 0.4, fast: true, timeoutMs: 20000, budgetMs: 30000 });
  } catch (e) {
    // Gemini busy / out of quota: grade locally so the interview keeps moving (the final AI report re-grades everything).
    console.warn('[gemini] live grading unavailable, using local scoring:', e.message);
    return { ...(await offline.evaluateAnswer(args)), source: 'local' };
  }
  const followUp = toText(r.followUp).trim();
  return {
    score: clamp(int(r.score), 0, 10),
    verdict: toText(r.verdict),
    feedback: toText(r.feedback),
    strengths: arrStr(r.strengths),
    missedPoints: arrStr(r.missedPoints),
    codeReview: toText(r.codeReview),
    followUp: followUp && followUp.toLowerCase() !== 'null' ? followUp : null,
    ack: toText(r.ack) || 'Okay, thank you.',
    source: 'gemini',
  };
}

// ------------------------------------------------------------------ Final report

const normRound = (x) => (x ? { summary: toText(x.summary), strengths: arrStr(x.strengths), weaknesses: arrStr(x.weaknesses) } : null);
const normTips = (x) => ({ summary: toText(x?.summary), tips: arrStr(x?.tips) });

export async function generateFinalReport({ profile, cvAnalysis, cv, config, techResult, hrResult }) {
  if (!isGeminiConfigured()) return offline.finalReport({ profile, cvAnalysis, config, techResult, hrResult });
  const speech = aggregateSpeech([...techResult.answers, ...(hrResult?.answers || [])]);
  const { system, text } = finalReportPrompt({ profile, cvAnalysis, config, techResult, hrResult, speech });
  const r = await generateJSON({ system, parts: [{ text }, cv.part], temperature: 0.4, timeoutMs: 90000, budgetMs: 180000 });
  const sc = r.scores || {};
  const score = (v) => (v == null || v === 'null' ? null : clamp(int(v), 0, 100));
  return {
    mode: 'gemini',
    overallScore: clamp(int(r.overallScore), 0, 100),
    verdict: toText(r.verdict) || 'N/A',
    summary: toText(r.summary),
    scores: {
      technicalKnowledge: score(sc.technicalKnowledge) ?? 0,
      problemSolving: score(sc.problemSolving) ?? 0,
      coding: score(sc.coding),
      communication: score(sc.communication) ?? 0,
      hr: hrResult ? score(sc.hr) : null,
      bodyLanguage: score(sc.bodyLanguage) ?? 0,
      cvAlignment: score(sc.cvAlignment) ?? 0,
    },
    technicalRound: normRound(r.technicalRound) || { summary: '', strengths: [], weaknesses: [] },
    hrRound: hrResult ? normRound(r.hrRound) : null,
    questionReviews: arr(r.questionReviews).map((q) => ({ id: toText(q.id), score: clamp(int(q.score), 0, 10), feedback: toText(q.feedback), idealAnswer: toText(q.idealAnswer) })),
    communication: normTips(r.communication),
    bodyLanguage: normTips(r.bodyLanguage),
    cvReview: { summary: toText(r.cvReview?.summary), consistencyWithAnswers: toText(r.cvReview?.consistencyWithAnswers), topFixes: arrStr(r.cvReview?.topFixes) },
    academicProfile: toText(r.academicProfile),
    studyPlan: arr(r.studyPlan).map((s) => (typeof s === 'string' ? { topic: s, why: '', resources: '' } : { topic: toText(s.topic), why: toText(s.why), resources: toText(s.resources) })),
    nextSteps: arrStr(r.nextSteps),
  };
}
