// Prompt builders for Gemini. Every prompt asks for strict JSON.
import { LEVELS } from './levels';
import { formatEducation } from './education';

const JSON_ONLY = 'Always reply with valid JSON only, no markdown.';

const SPOKEN_STYLE = `SPOKEN STYLE
- "question" is read aloud by text-to-speech: conversational, one question at a time, max 45 words.
- No markdown, no code, no bullet lists, no symbols like * or #.`;

function candidateBlock(profile, cvAnalysis, level) {
  const L = LEVELS[level];
  return `CANDIDATE
Name: ${profile.name}
Target role: ${profile.targetRole || cvAnalysis?.targetRole || 'infer from CV'}
Target company: ${profile.targetCompany || 'not specified'}
Chosen level: ${L.label} - ${L.experience}. ${L.guidance}
Academic record:
${formatEducation(profile)}`;
}

export function compactCV(cv) {
  if (!cv) return {};
  const {
    domain, targetRole, isSoftwareRole, estimatedExperienceYears, headline, skills, experience, projects,
    certifications, achievements, academicTrend, redFlags, weaknesses, likelyInterviewTopics,
  } = cv;
  return {
    domain, targetRole, isSoftwareRole, estimatedExperienceYears, headline, skills, experience, projects,
    certifications, achievements, academicTrend, redFlags, weaknesses, likelyInterviewTopics,
  };
}

export function cvAnalysisPrompt(profile) {
  const system = `You are an expert career coach, technical recruiter and ATS specialist who has hired for FAANG and top global companies across all fields (engineering, business, science, arts). You analyse CVs rigorously, honestly and constructively. ${JSON_ONLY}`;
  const text = `Analyse the attached CV/resume thoroughly.

CANDIDATE-PROVIDED DETAILS
Name: ${profile.name || 'not given'}
Target role: ${profile.targetRole || 'not specified (infer from CV)'}
Target company: ${profile.targetCompany || 'not specified'}
Academic record entered by the candidate:
${formatEducation(profile)}

TASKS
1. Extract key facts: experience, projects, skills, tools, certifications, achievements.
2. Judge CV quality for the target role: ATS-friendliness, clarity, quantified impact, formatting, relevance.
3. Comment on the academic trend (10th -> 12th/Diploma -> UG -> PG -> PhD): consistency, dips, gaps, and how interviewers may probe them.
4. Flag red flags an interviewer would ask about (employment/education gaps, short stints, vague or unverifiable claims, mismatch between entered scores and the CV).
5. Decide whether this is a software / IT / computer-science / data role where DSA coding interviews apply (isSoftwareRole).
6. Estimate professional experience in years (internships count at most 0.25 each) and map to a level: "beginner" (fresher, 0-1 years), "intermediate" (about 2-7 years), "hard" (8+ years or senior/lead).

Return JSON exactly in this shape:
{
  "candidateName": string,
  "headline": string,
  "domain": string,
  "targetRole": string,
  "isSoftwareRole": boolean,
  "estimatedExperienceYears": number,
  "suggestedLevel": "beginner" | "intermediate" | "hard",
  "summary": string,
  "scores": { "overall": int, "ats": int, "clarity": int, "impact": int, "formatting": int, "relevance": int },
  "skills": { "technical": [string], "tools": [string], "soft": [string] },
  "experience": [ { "role": string, "company": string, "duration": string, "highlights": [string] } ],
  "projects": [ { "name": string, "tech": [string], "summary": string } ],
  "certifications": [string],
  "achievements": [string],
  "academicTrend": string,
  "strengths": [string],
  "weaknesses": [string],
  "redFlags": [string],
  "improvements": [ { "section": string, "issue": string, "suggestion": string } ],
  "missingSections": [string],
  "keywordsToAdd": [string],
  "likelyInterviewTopics": [string]
}
Rules: reference actual CV content, be specific. Scores are integers 0-100. "summary" is 3-4 sentences. Other strings max ~30 words.`;
  return { system, text };
}

export function technicalPlanPrompt({ profile, cvAnalysis, level, minutes, pool }) {
  const L = LEVELS[level];
  const domain = cvAnalysis.domain || 'the candidate\'s field';
  const software = !!cvAnalysis.isSoftwareRole;
  const codingCount = !software ? 0 : minutes < 25 ? 1 : minutes <= 60 ? 2 : 3;
  const designCount = software && level !== 'beginner' && minutes >= 30 ? 1 : 0;

  const softwareRules = `- Include exactly ${codingCount} coding question(s): type "coding", category "faang_coding", ${L.codingDifficulty} difficulty. Prefer problems from this FAANG pool (keep the classic problem; set "askedAt" to the companies):
${pool.coding.map((q) => `  * ${q.title} [${q.difficulty}] (${q.companies.join(', ')}): ${q.prompt.split('\n')[0]}`).join('\n')}
- Each coding question takes ${level === 'beginner' ? '12-15' : '15-20'} minutes. Its spoken "question" briefly introduces the problem and asks the candidate to explain their approach aloud while coding in the on-screen editor.
${designCount ? `- Include ${designCount} design question (type "verbal", category "system_design", 10-15 minutes) from this pool or similar:\n${pool.design.map((d) => `  * ${d.title} (${d.companies.join(', ')})`).join('\n')}` : ''}
- Fundamentals may draw on: ${pool.fundamentals.map((x) => x.question).join(' | ')}`;

  const otherRules = `- This is NOT a software role: do not include any "coding" questions. Instead include 1-2 practical scenario / case-study / numerical problem-solving questions typical of top employers in ${domain} (type "verbal", category "case_study").`;

  const system = `You are a senior ${domain} interviewer at a top-tier company (FAANG-level bar) running a realistic, spoken mock technical interview personalised to the candidate's CV. ${JSON_ONLY}`;
  const text = `Design the TECHNICAL (domain) interview round.

${candidateBlock(profile, cvAnalysis, level)}
CV analysis: ${JSON.stringify(compactCV(cvAnalysis))}
The full CV is attached.

TIME BUDGET: ${minutes} minutes maximum. The sum of "suggestedMinutes" must be between ${Math.round(minutes * 0.8)} and ${minutes}.

QUESTION MIX
- About 65% of the questions MUST be grounded in specific CV items (named projects, internships/jobs, listed skills and tools, certifications, achievements, thesis/research). Name the item in the question and set "cvReference".
- The rest cover core fundamentals of ${domain} that a ${L.experience} candidate must know, at ${L.label} difficulty.
- Question 1 is a short warm-up asking the candidate to walk through their most relevant project or role from the CV (3-4 minutes).
- Order: warm-up -> CV deep-dives -> fundamentals -> ${software ? 'coding -> design' : 'case/practical questions'}.
${software ? softwareRules : otherRules}
- Every question must be a realistic question asked at top companies for this level. No trivia.

${SPOKEN_STYLE}
- For coding questions, put the full problem (with 1-2 examples, constraints and expected output) in "codingPrompt" as plain text.

Return JSON:
{ "questions": [ { "type": "verbal" | "coding", "category": "warmup" | "cv_project" | "cv_experience" | "cv_skill" | "fundamentals" | "faang_coding" | "system_design" | "case_study", "question": string, "codingPrompt": string, "askedAt": [string], "cvReference": string, "idealPoints": [string], "suggestedMinutes": number } ] }
"idealPoints": 3-5 key points a strong answer covers. "askedAt": companies known to ask it, or [].`;
  return { system, text };
}

export function hrPlanPrompt({ profile, cvAnalysis, level, minutes }) {
  const count = minutes <= 5 ? 3 : minutes <= 10 ? 5 : 7;
  const levelFocus =
    level === 'beginner'
      ? 'teamwork in college projects, adaptability, learning ability, willingness to relocate, 5-year goals'
      : level === 'intermediate'
        ? 'ownership, conflict, handling pressure, reasons for switching, notice period and salary expectations'
        : 'leadership, mentoring, stakeholder management, conflict at scale, strategic decisions, notice period and compensation';
  const system = `You are an experienced HR interviewer and hiring manager at a top company running a realistic spoken HR and behavioural round. ${JSON_ONLY}`;
  const text = `Design the HR round.

${candidateBlock(profile, cvAnalysis, level)}
CV analysis: ${JSON.stringify(compactCV(cvAnalysis))}
The full CV is attached.

TIME: ${minutes} minutes maximum; the sum of "suggestedMinutes" must be between ${Math.round(minutes * 0.75)} and ${minutes}. About ${count} questions.

RULES
- Question 1: "Tell me about yourself" style opener.
- At least half the questions MUST be tied to the CV: career choices, transitions, gaps, the academic trend (for example a dip between 10th, 12th and graduation, or the choice of stream), achievements, teamwork in named projects or jobs, and these red flags: ${JSON.stringify(cvAnalysis.redFlags || [])}.
- Include STAR-style behavioural questions used by FAANG companies (for example Amazon Leadership Principles, Google "Googleyness"), focusing on: ${levelFocus}.
- Include motivation (why this role / company) and strengths and weaknesses.
- The last question is "Do you have any questions for us?".

${SPOKEN_STYLE}

Return JSON:
{ "questions": [ { "type": "verbal", "category": "intro" | "cv_based" | "behavioral" | "motivation" | "situational" | "logistics" | "closing", "question": string, "askedAt": [string], "cvReference": string, "idealPoints": [string], "suggestedMinutes": number } ] }`;
  return { system, text };
}

export function evaluatePrompt({ question, answer, code, language, level, round, cvAnalysis, durationSec }) {
  const L = LEVELS[level];
  const system = `You are the interviewer in a live mock interview. Evaluate the candidate's latest answer fairly and specifically against the chosen level. ${JSON_ONLY}`;
  const text = `ROUND: ${round}. LEVEL: ${L.label} (${L.experience}). Candidate domain: ${cvAnalysis?.domain || 'unknown'}.
QUESTION (${question.category}${question.isFollowUp ? ', follow-up' : ''}): ${question.question}
${question.codingPrompt ? `PROBLEM: ${question.codingPrompt}` : ''}
KEY POINTS EXPECTED: ${(question.idealPoints || []).join('; ') || 'use your judgement'}
${question.cvReference ? `CV CONTEXT: ${question.cvReference}` : ''}
CANDIDATE'S SPOKEN ANSWER (speech-to-text, ignore small transcription errors): """${answer || '(no spoken answer)'}"""
${code ? `CANDIDATE'S CODE (${language}):\n${code}` : ''}
Time taken: ${Math.round(durationSec)} seconds.

Return JSON:
{ "score": int 0-10, "verdict": "excellent" | "good" | "average" | "weak" | "no_answer", "feedback": string, "strengths": [string], "missedPoints": [string], "codeReview": string, "followUp": string | null, "ack": string }
- "feedback": 2-3 specific sentences.
- "codeReview": for code only (correctness, complexity, edge cases), otherwise "".
- "followUp": ONE natural probing follow-up (max 35 words, spoken style) if the answer was vague, partly correct, made a claim worth verifying, or a good answer invites going deeper (complexity, scaling, edge cases, what you would do differently). null if the answer was empty or complete.
- "ack": short neutral acknowledgement to say aloud before moving on (max 8 words). Never reveal the score.`;
  return { system, text };
}

function formatAnswers(answers) {
  if (!answers?.length) return '(no questions answered)';
  return answers
    .map((a) => {
      const lines = [
        `[${a.id}] (${a.category}${a.isFollowUp ? ', follow-up' : ''}${a.skipped ? ', SKIPPED' : ''}) Q: ${a.question}`,
        a.codingPrompt ? `PROBLEM: ${a.codingPrompt.slice(0, 600)}` : '',
        `A: ${(a.answer || '(no spoken answer)').slice(0, 1800)}`,
        a.code ? `CODE (${a.language}):\n${a.code.slice(0, 3000)}` : '',
        a.evaluation ? `Live evaluation: ${a.evaluation.score}/10 - ${a.evaluation.feedback}` : '',
        `Time: ${a.durationSec}s${a.camera?.eyeContactPct != null ? `, eye contact ${a.camera.eyeContactPct}%` : ''}`,
      ];
      return lines.filter(Boolean).join('\n');
    })
    .join('\n\n');
}

export function finalReportPrompt({ profile, cvAnalysis, config, techResult, hrResult, speech }) {
  const L = LEVELS[config.level];
  const system = `You are a panel of senior interviewers and a career coach writing a detailed, honest and actionable post-interview report for the candidate. ${JSON_ONLY}`;
  const text = `Write the final evaluation report for this mock interview.

${candidateBlock(profile, cvAnalysis, config.level)}
CV analysis (done earlier): ${JSON.stringify({ ...compactCV(cvAnalysis), scores: cvAnalysis.scores, strengths: cvAnalysis.strengths })}
The full CV is attached.

TECHNICAL ROUND (${Math.round(techResult.durationSec / 60)} of max ${config.techMinutes} minutes, ended: ${techResult.endReason}):
${formatAnswers(techResult.answers)}
Webcam metrics for this round (computed locally, estimates; eye contact is not tracked while coding): ${JSON.stringify(techResult.camera)}

${hrResult ? `HR ROUND (${Math.round(hrResult.durationSec / 60)} of max ${config.hrMinutes} minutes, ended: ${hrResult.endReason}):
${formatAnswers(hrResult.answers)}
Webcam metrics for this round: ${JSON.stringify(hrResult.camera)}` : 'HR ROUND: skipped by the candidate.'}

SPEECH METRICS (all answers): ${JSON.stringify(speech)}

GUIDANCE: Judge against the ${L.label} (${L.experience}) bar. Skipped or empty answers score 0. Be honest but constructive. Check whether the answers backed up the claims made on the CV.

Return JSON:
{
  "overallScore": int 0-100,
  "verdict": "Strong Hire" | "Hire" | "Lean Hire" | "Lean No Hire" | "No Hire",
  "summary": string,
  "scores": { "technicalKnowledge": int, "problemSolving": int, "coding": int | null, "communication": int, "hr": int | null, "bodyLanguage": int, "cvAlignment": int },
  "technicalRound": { "summary": string, "strengths": [string], "weaknesses": [string] },
  "hrRound": { "summary": string, "strengths": [string], "weaknesses": [string] } | null,
  "questionReviews": [ { "id": string, "score": int 0-10, "feedback": string, "idealAnswer": string } ],
  "communication": { "summary": string, "tips": [string] },
  "bodyLanguage": { "summary": string, "tips": [string] },
  "cvReview": { "summary": string, "consistencyWithAnswers": string, "topFixes": [string] },
  "academicProfile": string,
  "studyPlan": [ { "topic": string, "why": string, "resources": string } ],
  "nextSteps": [string]
}
- "summary": 4-6 sentences. Scores are 0-100 except question scores (0-10).
- "coding" is null if there were no coding questions; "hr" and "hrRound" are null if HR was skipped.
- "questionReviews": one entry for EVERY question above, using the same id. "idealAnswer" is a concise model answer (2-5 sentences; for coding describe the optimal approach and its complexity).`;
  return { system, text };
}
