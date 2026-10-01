// Offline practice mode: works without any API key.
// CV analysis is rule-based, questions come from the built-in bank + templates built from CV keywords,
// and answers are scored by key-point coverage. Results are estimates, clearly labelled in the UI.
import { LEVELS } from './levels';
import { academicTrend } from './education';
import { aggregateSpeech } from './speechMetrics';
import { DOMAIN_BANKS, HR_BANK, SOFTWARE_FUNDAMENTALS, pickFaangPool, shuffle } from '../data/questionBank';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (n, a = 0, b = 100) => Math.max(a, Math.min(b, Math.round(n)));

// ---------------------------------------------------------------- CV analysis

const SKILLS = {
  software: ['python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'golang', 'rust', 'kotlin', 'swift', 'php', 'ruby', 'scala', 'react', 'angular', 'vue', 'next.js', 'node.js', 'nodejs', 'express', 'django', 'flask', 'fastapi', 'spring boot', 'spring', '.net', 'html', 'css', 'tailwind', 'redux', 'graphql', 'rest api', 'microservices', 'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'kafka', 'rabbitmq', 'elasticsearch', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform', 'jenkins', 'ci/cd', 'git', 'linux', 'android', 'ios', 'flutter', 'react native', 'firebase', 'data structures', 'algorithms', 'system design', 'oop', 'dbms', 'operating systems', 'computer networks'],
  data: ['machine learning', 'deep learning', 'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy', 'nlp', 'computer vision', 'data analysis', 'data science', 'statistics', 'power bi', 'tableau', 'spark', 'hadoop', 'llm', 'generative ai', 'opencv', 'data visualization'],
  mechanical: ['autocad', 'solidworks', 'catia', 'ansys', 'creo', 'fea', 'cfd', 'thermodynamics', 'manufacturing', 'cnc', 'hvac', 'gd&t', 'lean manufacturing', 'six sigma', 'fluid mechanics', 'machine design', 'automobile'],
  electrical: ['matlab', 'simulink', 'plc', 'scada', 'power systems', 'power electronics', 'control systems', 'electrical machines', 'switchgear', 'transformer'],
  electronics: ['circuit design', 'pcb', 'embedded systems', 'embedded c', 'arduino', 'raspberry pi', 'vlsi', 'verilog', 'vhdl', 'microcontroller', 'iot', 'signal processing'],
  civil: ['staad pro', 'etabs', 'revit', 'primavera', 'structural analysis', 'surveying', 'estimation', 'construction management', 'geotechnical', 'concrete', 'site execution'],
  finance: ['tally', 'gst', 'taxation', 'accounting', 'financial modeling', 'financial modelling', 'valuation', 'sap', 'auditing', 'ifrs', 'budgeting', 'financial analysis', 'equity research', 'investment banking', 'advanced excel'],
  marketing: ['seo', 'sem', 'google ads', 'social media marketing', 'digital marketing', 'content marketing', 'branding', 'market research', 'crm', 'salesforce', 'hubspot', 'email marketing', 'google analytics'],
  general: ['project management', 'agile', 'scrum', 'jira', 'stakeholder management', 'recruitment', 'payroll', 'team leadership', 'operations', 'supply chain', 'negotiation', 'ms excel', 'excel', 'communication', 'leadership', 'problem solving', 'teamwork'],
};

const DOMAIN_LABEL = {
  software: 'Software Engineering',
  data: 'Data Science / Analytics',
  mechanical: 'Mechanical Engineering',
  electrical: 'Electrical Engineering',
  electronics: 'Electronics Engineering',
  civil: 'Civil Engineering',
  finance: 'Finance / Commerce',
  marketing: 'Marketing',
  general: 'General / Management',
};

const HEADINGS = /^(professional summary|summary|career objective|objective|profile|about me|education|academic(s| details| qualifications)?|qualifications|(work |professional )?experience|employment( history)?|internships?|(academic |personal |key )?projects?|(technical )?skills|core competencies|technologies|certifications?|courses|achievements|awards|accomplishments|publications|research|extra[- ]?curricular( activities)?|activities|positions? of responsibility|leadership|interests|hobbies|languages|declaration|personal (details|information)|contact|references)\s*:?$/i;

const ACTION_VERBS = ['led', 'built', 'developed', 'designed', 'implemented', 'created', 'improved', 'increased', 'reduced', 'optimized', 'optimised', 'managed', 'launched', 'automated', 'delivered', 'analyzed', 'analysed', 'architected', 'mentored', 'deployed', 'migrated', 'achieved', 'spearheaded', 'streamlined', 'engineered', 'owned'];
const WEAK_PHRASES = ['responsible for', 'worked on', 'helped with', 'various', 'etc', 'duties included', 'involved in'];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const countTerm = (text, term) => (text.match(new RegExp(`(?<![a-z0-9])${escapeRe(term)}(?![a-z0-9])`, 'g')) || []).length;
const DISPLAY = {
  javascript: 'JavaScript', typescript: 'TypeScript', 'node.js': 'Node.js', nodejs: 'Node.js', 'next.js': 'Next.js', mongodb: 'MongoDB',
  postgresql: 'PostgreSQL', mysql: 'MySQL', graphql: 'GraphQL', opencv: 'OpenCV', pytorch: 'PyTorch', 'scikit-learn': 'scikit-learn',
  numpy: 'NumPy', 'ci/cd': 'CI/CD', ios: 'iOS', oop: 'OOP', dbms: 'DBMS', nlp: 'NLP', llm: 'LLM', iot: 'IoT', pcb: 'PCB', plc: 'PLC',
  scada: 'SCADA', vlsi: 'VLSI', vhdl: 'VHDL', cnc: 'CNC', hvac: 'HVAC', fea: 'FEA', cfd: 'CFD', 'gd&t': 'GD&T', gst: 'GST', sap: 'SAP',
  ifrs: 'IFRS', seo: 'SEO', sem: 'SEM', crm: 'CRM', autocad: 'AutoCAD', solidworks: 'SolidWorks', matlab: 'MATLAB', 'rest api': 'REST API',
  hubspot: 'HubSpot', 'power bi': 'Power BI', 'staad pro': 'STAAD Pro', etabs: 'ETABS', 'c#': 'C#', 'c++': 'C++', '.net': '.NET',
};
const titleCase = (s) =>
  DISPLAY[s] || s.replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\bAws\b/, 'AWS').replace(/\bSql\b/, 'SQL').replace(/\bGcp\b/, 'GCP');

function splitSections(lines) {
  const sections = {};
  let current = 'header';
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.length < 45 && line.split(/\s+/).length <= 5 && HEADINGS.test(line.replace(/[^a-z &/-]/gi, '').trim())) {
      current = line.toLowerCase().replace(/[^a-z ]/g, '').trim();
      sections[current] = sections[current] || [];
      continue;
    }
    (sections[current] = sections[current] || []).push(line);
  }
  return sections;
}

const findSection = (sections, re) => Object.entries(sections).find(([k]) => re.test(k))?.[1] || [];
const isBullet = (l) => /^[•\-*▪●◦►–✓]\s*/.test(l);
const stripBullet = (l) => l.replace(/^[•\-*▪●◦►–✓]\s*/, '').trim();

function estimateYears(text, expLines) {
  const explicit = [...text.matchAll(/(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years|yrs)/gi)].map((m) => Number(m[1])).filter((n) => n > 0 && n < 40);
  if (explicit.length) return Math.max(...explicit);
  const now = new Date().getFullYear();
  let total = 0;
  for (const m of expLines.join(' ').matchAll(/((?:19|20)\d{2})\s*(?:-|–|—|to)\s*((?:19|20)\d{2}|present|current|now|till date)/gi)) {
    const start = Number(m[1]);
    const end = /\d/.test(m[2]) ? Number(m[2]) : now;
    if (end >= start) total += Math.min(end - start, 15);
  }
  return Math.min(total, 35);
}

export async function analyzeCV(profile, cvText) {
  await delay(600);
  if (!cvText || cvText.trim().length < 80)
    throw new Error('Could not read text from this CV. In Offline mode please upload a text-based PDF, DOCX or TXT (not a scanned image), or add a Gemini key in Settings.');

  const lines = cvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const lower = cvText.toLowerCase();
  const sections = splitSections(lines);
  const words = cvText.split(/\s+/).filter(Boolean).length;

  // Skills by domain
  const found = {};
  const domainCounts = {};
  for (const [domain, terms] of Object.entries(SKILLS)) {
    domainCounts[domain] = 0;
    for (const t of terms) {
      if (countTerm(lower, t)) {
        found[t] = domain;
        domainCounts[domain]++;
      }
    }
  }
  const role = (profile.targetRole || '').toLowerCase();
  const roleSoftware = /software|developer|sde|programmer|full.?stack|front.?end|back.?end|web|devops|cloud|android|ios|data (scien|engineer|analyst)|machine learning|\bml\b|\bai\b|it /i.test(role);
  let domainKey = Object.entries(domainCounts).filter(([k]) => k !== 'general').sort((a, b) => b[1] - a[1])[0];
  domainKey = domainKey && domainKey[1] > 0 ? domainKey[0] : 'general';
  if (roleSoftware && !['software', 'data'].includes(domainKey)) domainKey = /data|machine|ml|ai/.test(role) ? 'data' : 'software';
  const isSoftwareRole = roleSoftware || domainCounts.software + domainCounts.data >= 3;
  if (isSoftwareRole && !['software', 'data'].includes(domainKey)) domainKey = 'software';

  // Drop a generic term when a more specific one matched (e.g. "spring" when "spring boot" is present).
  const skillList = Object.keys(found).filter(
    (s) => found[s] !== 'general' && !Object.keys(found).some((o) => o !== s && o.startsWith(`${s} `)),
  );
  const technical = skillList.map(titleCase);
  const soft = Object.keys(found).filter((s) => found[s] === 'general').map(titleCase);

  // Projects & experience
  const projLines = findSection(sections, /project/);
  const projects = [];
  for (const l of projLines) {
    if (projects.length >= 4) break;
    const candidate = stripBullet(l).split(/\s[|–—]\s|\s-\s|:\s/)[0].trim();
    if (!isBullet(l) && candidate.length >= 4 && candidate.length <= 70 && !/[.]$/.test(candidate)) projects.push({ name: candidate, tech: [], summary: '' });
  }
  if (!projects.length)
    projLines.filter(isBullet).slice(0, 3).forEach((l) => projects.push({ name: stripBullet(l).slice(0, 60), tech: [], summary: '' }));

  const expLines = [...findSection(sections, /experience|employment/), ...findSection(sections, /internship/)];
  const experience = [];
  for (const l of expLines) {
    if (experience.length >= 4) break;
    if (!isBullet(l) && l.length < 110 && /(intern|engineer|developer|analyst|manager|associate|consultant|lead|executive|officer|designer|scientist|trainee|specialist|architect)/i.test(l))
      experience.push({ role: l, company: '', duration: '', highlights: [] });
  }
  const years = estimateYears(cvText, expLines);

  // Quality signals
  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.]+/.test(cvText);
  const hasPhone = /(\+?\d[\d\s-]{8,}\d)/.test(cvText);
  const hasLinkedIn = /linkedin\.com|linkedin/i.test(cvText);
  const hasGithub = /github\.com|github/i.test(cvText);
  const bullets = lines.filter(isBullet).length;
  const quantified = lines.filter((l) => /\d+(\.\d+)?\s*(%|percent|x\b|\+|k\b|users|customers|clients|crore|lakh|million|hrs|hours|ms\b|seconds|days|weeks)/i.test(l) || /\b(by|to)\s+\d+/i.test(l)).length;
  const actionVerbs = ACTION_VERBS.reduce((s, v) => s + countTerm(lower, v), 0);
  const weak = WEAK_PHRASES.reduce((s, v) => s + countTerm(lower, v), 0);
  const firstPerson = (cvText.match(/\b(I|my|me)\b/g) || []).length;
  const has = (re) => Object.keys(sections).some((k) => re.test(k));
  const sec = {
    summary: has(/summary|objective|profile|about/),
    education: has(/education|academic|qualification/),
    experience: has(/experience|employment|internship/),
    projects: has(/project/),
    skills: has(/skill|competenc|technolog/),
    certifications: has(/certification|course/),
    achievements: has(/achievement|award|accomplishment/),
  };

  const ats = clamp((hasEmail ? 10 : 0) + (hasPhone ? 10 : 0) + (hasLinkedIn ? 5 : 0) + (sec.education ? 12 : 0) + (sec.experience || sec.projects ? 15 : 0) + (sec.skills ? 15 : 0) + (sec.projects ? 8 : 0) + (sec.summary ? 5 : 0) + (words >= 250 && words <= 1100 ? 15 : 6) + (bullets >= 5 ? 5 : 0));
  const impact = clamp(20 + quantified * 10 + Math.min(actionVerbs, 15) * 3 - weak * 4, 5, 100);
  const clarity = clamp(88 - weak * 3 - Math.min(firstPerson, 10) * 2 - (words > 1200 ? 15 : 0) - (words < 200 ? 15 : 0), 30, 95);
  const formatting = clamp(35 + (bullets >= 5 ? 20 : bullets >= 2 ? 10 : 0) + Object.values(sec).filter(Boolean).length * 6 + (words >= 250 && words <= 1100 ? 10 : 0));
  const relevance = clamp(30 + skillList.length * 5 + (profile.targetRole && roleSoftware === isSoftwareRole ? 10 : 0));
  const overall = clamp((ats + impact + clarity + formatting + relevance) / 5);

  const strengths = [];
  const weaknesses = [];
  const improvements = [];
  if (quantified >= 3) strengths.push(`Quantified results in ${quantified} lines - recruiters love measurable impact.`);
  else {
    weaknesses.push('Few measurable results (numbers, %, users, time saved).');
    improvements.push({ section: 'Experience / Projects', issue: 'Achievements are not quantified', suggestion: 'Rewrite bullets as "Action + what + measurable result", e.g. "Reduced API latency by 40%".' });
  }
  if (technical.length >= 8) strengths.push(`Broad skill set: ${technical.slice(0, 6).join(', ')}.`);
  else if (technical.length < 4) weaknesses.push('Skills section is thin for the target role.');
  if (actionVerbs >= 6) strengths.push('Uses strong action verbs (built, led, improved...).');
  if (projects.length) strengths.push(`Projects listed (${projects.map((p) => p.name).slice(0, 2).join(', ')}) give good interview talking points.`);
  if (experience.length) strengths.push('Relevant work/internship experience is present.');
  if (weak > 2) {
    weaknesses.push('Passive phrases like "responsible for" / "worked on" weaken impact.');
    improvements.push({ section: 'Wording', issue: `${weak} passive or vague phrases`, suggestion: 'Replace "responsible for / worked on" with action verbs and outcomes.' });
  }
  if (!hasLinkedIn) improvements.push({ section: 'Contact', issue: 'No LinkedIn profile', suggestion: 'Add your LinkedIn URL in the header.' });
  if (isSoftwareRole && !hasGithub) improvements.push({ section: 'Contact', issue: 'No GitHub / portfolio link', suggestion: 'Add GitHub or a portfolio so interviewers can see your code.' });
  if (words > 1100) improvements.push({ section: 'Length', issue: `CV is long (${words} words)`, suggestion: 'Keep it to 1 page for freshers, max 2 pages for experienced candidates.' });
  if (words < 250) improvements.push({ section: 'Length', issue: `CV is very short (${words} words)`, suggestion: 'Add project details, tools used and outcomes.' });
  if (firstPerson > 5) improvements.push({ section: 'Style', issue: 'Uses first person (I / my)', suggestion: 'Write bullets without pronouns: "Built..." instead of "I built...".' });
  const missingSections = Object.entries(sec).filter(([k, v]) => !v && k !== 'achievements' && k !== 'certifications').map(([k]) => titleCase(k));
  missingSections.forEach((s) => improvements.push({ section: s, issue: 'Section not found', suggestion: `Add a clear "${s}" heading so ATS systems can parse it.` }));

  const trend = academicTrend(profile);
  const redFlags = trend.dips.map((d) => `Academic dip of ~${d.drop} points from ${d.from.label} to ${d.to.label}.`);
  const keywordsToAdd = SKILLS[domainKey].filter((s) => !found[s]).slice(0, 6).map(titleCase);
  const suggestedLevel = years >= 8 ? 'hard' : years >= 2 ? 'intermediate' : 'beginner';
  const domain = DOMAIN_LABEL[domainKey];

  return {
    mode: 'offline',
    domainKey,
    candidateName: profile.name,
    headline: `${domain} candidate${technical.length ? ` skilled in ${technical.slice(0, 3).join(', ')}` : ''}.`,
    domain,
    targetRole: profile.targetRole || domain,
    isSoftwareRole,
    estimatedExperienceYears: years,
    suggestedLevel,
    summary: `Offline analysis of a ${words}-word CV. We found ${technical.length} domain skills, ${projects.length} project(s) and ${experience.length} role(s). ${quantified >= 3 ? 'Achievements are reasonably quantified.' : 'The biggest improvement is adding measurable results.'} Add a Gemini key for a deeper AI review.`,
    scores: { overall, ats, clarity, impact, formatting, relevance },
    skills: { technical, tools: [], soft },
    experience,
    projects,
    certifications: [],
    achievements: [],
    academicTrend: trend.text || 'Not enough academic data to comment on a trend.',
    strengths: strengths.length ? strengths : ['CV was readable and parsed successfully.'],
    weaknesses,
    redFlags,
    improvements,
    missingSections,
    keywordsToAdd,
    likelyInterviewTopics: [...technical.slice(0, 5), ...projects.map((p) => p.name).slice(0, 3)],
  };
}

// ---------------------------------------------------------------- Interview plans

const GENERIC_POINTS = ['Concrete example from your own work', 'Correct explanation of the concept', 'Your specific contribution', 'Challenges or trade-offs', 'Result or learning'];

function cvQuestions(cv, level, n) {
  const pool = [];
  const projTpl = {
    beginner: (p) => `Tell me about your project ${p}. What problem did it solve, what exactly was your role, and which technologies did you use?`,
    intermediate: (p) => `In your project ${p}, what were the key design decisions and trade-offs, and what would you do differently today?`,
    hard: (p) => `For ${p}, how did you design it to scale and stay reliable, and how did you guide the technical decisions of the team?`,
  }[level];
  const skillTpl = {
    beginner: (s) => `You have listed ${s} on your CV. Can you explain one core concept of ${s} and how you used it in a project?`,
    intermediate: (s) => `You have ${s} on your CV. Describe a real problem you solved with ${s}, including any performance or debugging challenge.`,
    hard: (s) => `With ${s} on your CV, how would you decide whether it is the right choice for a large-scale system, and what are its main limitations?`,
  }[level];
  cv.projects.slice(0, 2).forEach((p) =>
    pool.push({ category: 'cv_project', question: projTpl(p.name), cvReference: p.name, idealPoints: ['Problem statement', 'Your specific role', 'Technologies and why', 'Challenges faced', 'Outcome or impact'] }),
  );
  cv.experience.slice(0, 2).forEach((e) =>
    pool.push({ category: 'cv_experience', question: `In your role "${e.role.slice(0, 70)}", what was the most challenging problem you solved, and how did you measure its impact?`, cvReference: e.role.slice(0, 70), idealPoints: ['Context of the problem', 'Actions you took', 'Tools or methods used', 'Measurable impact'] }),
  );
  shuffle(cv.skills.technical).slice(0, 6).forEach((s) =>
    pool.push({ category: 'cv_skill', question: skillTpl(s), cvReference: s, idealPoints: [s, ...GENERIC_POINTS.slice(0, 4)] }),
  );
  // Interleave so projects/experience come first but skills are still covered.
  return pool.slice(0, Math.max(n, 0)).map((q) => ({ ...q, type: 'verbal', askedAt: [], suggestedMinutes: 4 }));
}

function finalize(questions, prefix) {
  return { questions: questions.map((q, i) => ({ codingPrompt: '', askedAt: [], cvReference: '', ...q, id: `${prefix}${i + 1}` })) };
}

export async function technicalPlan({ cvAnalysis, level, minutes }) {
  await delay(500);
  const software = cvAnalysis.isSoftwareRole;
  const pool = pickFaangPool(level);
  const codingCount = software ? (minutes < 25 ? 1 : minutes <= 60 ? 2 : 3) : 0;
  const designCount = software && level !== 'beginner' && minutes >= 30 ? 1 : 0;
  const codingMin = level === 'beginner' ? 12 : 15;
  const reserved = codingCount * codingMin + designCount * 12;
  // Always ask at least one question from the CV, even in short rounds.
  const nVerbal = Math.max(1, Math.floor((minutes - 3 - reserved) / 4));
  const nCv = Math.ceil(nVerbal * 0.65);
  const nFund = nVerbal - nCv;

  const qs = [
    { type: 'verbal', category: 'warmup', question: 'To start, please walk me through your background and the project or role on your CV that you are most proud of.', idealPoints: ['Clear, concise summary', 'A specific project and your role', 'Technologies or methods used', 'Measurable outcome'], suggestedMinutes: 3 },
  ];
  const cvQs = cvQuestions(cvAnalysis, level, nCv);
  qs.push(...cvQs);

  const fundBank = software ? pool.fundamentals : shuffle(DOMAIN_BANKS[cvAnalysis.domainKey] || DOMAIN_BANKS.general);
  // If the CV gave fewer questions than planned, fill with fundamentals.
  fundBank.slice(0, nFund + (nCv - cvQs.length)).forEach((f) =>
    qs.push({ type: 'verbal', category: software ? 'fundamentals' : 'case_study', question: f.question, idealPoints: f.points, suggestedMinutes: 4 }),
  );
  pool.coding.slice(0, codingCount).forEach((q) =>
    qs.push({
      type: 'coding',
      category: 'faang_coding',
      question: `Here is a coding problem that has been asked at ${q.companies.slice(0, 3).join(', ')}: ${q.title}. The full problem is on your screen. Please explain your approach out loud, then write your solution in the editor.`,
      codingPrompt: `${q.title}\n\n${q.prompt}`,
      askedAt: q.companies,
      idealPoints: q.points,
      suggestedMinutes: codingMin,
    }),
  );
  pool.design.slice(0, designCount).forEach((d) =>
    qs.push({
      type: 'verbal',
      category: 'system_design',
      question: `Let's do a design question often asked at ${d.companies.slice(0, 2).join(' and ')}. ${d.title}. Walk me through the requirements, the high-level design, and the main trade-offs.`,
      askedAt: d.companies,
      idealPoints: d.points,
      suggestedMinutes: 12,
    }),
  );
  return finalize(qs, 't');
}

export async function hrPlan({ profile, cvAnalysis, level, minutes }) {
  await delay(400);
  const target = Math.max(3, Math.min(8, Math.floor(minutes / 2)));
  const toQ = (f, category, extra = {}) => ({ type: 'verbal', category, question: f.question, idealPoints: f.points, suggestedMinutes: 2, ...extra });
  const middle = [];

  const trend = academicTrend(profile);
  if (trend.dips.length) {
    const d = trend.dips[0];
    middle.push({ type: 'verbal', category: 'cv_based', question: `I notice your score went from ${d.from.score} in ${d.from.label} to ${d.to.score} in ${d.to.label}. What happened during that period, and what did you learn from it?`, cvReference: `${d.from.label} to ${d.to.label} scores`, idealPoints: ['Honest explanation', 'No excuses or blame', 'What you learned', 'How you improved afterwards'], suggestedMinutes: 2 });
  }
  const role = profile.targetRole || cvAnalysis.targetRole;
  if (role)
    middle.push({ type: 'verbal', category: 'motivation', question: `Why do you want to work as a ${role}${profile.targetCompany ? ` at ${profile.targetCompany}` : ''}, and what makes you a good fit?`, cvReference: 'Target role', idealPoints: ['Genuine motivation', 'Skills from your CV that match', 'Research about the company', 'Long-term goals'], suggestedMinutes: 2 });
  else middle.push(toQ(HR_BANK.motivation, 'motivation'));
  if (cvAnalysis.projects?.[0])
    middle.push({ type: 'verbal', category: 'cv_based', question: `On ${cvAnalysis.projects[0].name}, tell me about a moment when the team disagreed. How did you handle it?`, cvReference: cvAnalysis.projects[0].name, idealPoints: ['Situation and task', 'Your actions', 'Communication and empathy', 'Result'], suggestedMinutes: 2 });
  middle.push(toQ(HR_BANK.strengths, 'behavioral'));
  const levelBank = level === 'hard' ? HR_BANK.senior : level === 'beginner' ? HR_BANK.fresher : [];
  shuffle([...levelBank, ...HR_BANK.behavioral]).slice(0, 3).forEach((f) => middle.push(toQ(f, 'behavioral')));
  (level === 'beginner' ? [HR_BANK.goals] : HR_BANK.experienced).forEach((f) => middle.push(toQ(f, 'logistics')));

  const qs = [toQ(HR_BANK.intro, 'intro', { suggestedMinutes: 2 }), ...middle.slice(0, target - 2), toQ(HR_BANK.closing, 'closing', { suggestedMinutes: 1 })];
  return finalize(qs, 'h');
}

// ---------------------------------------------------------------- Answer scoring

const STOP = new Set('the a an and or of to in on for with by is are be as at from that this it its your you use using how what why when which into than then over per can will'.split(' '));
const keywords = (s) =>
  s.toLowerCase().replace(/[^a-z0-9+#.\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));

const ACKS = ['Okay, thank you.', 'Alright, got it.', 'Thanks for that.', 'Okay, noted.', 'Understood, thank you.', 'Right, thanks.'];

export async function evaluateAnswer(args) {
  await delay(500);
  return scoreAnswer(args);
}

function scoreAnswer({ question, answer, code }) {
  const isCoding = question.type === 'coding';
  const text = `${answer} ${code || ''}`.toLowerCase();
  const words = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const points = question.idealPoints || [];
  const covered = [];
  const missed = [];
  for (const p of points) {
    const kws = keywords(p);
    const hits = kws.filter((k) => text.includes(k)).length;
    (kws.length && hits / kws.length >= 0.34 ? covered : missed).push(p);
  }
  const coverage = points.length ? covered.length / points.length : Math.min(1, words / 120);
  const codeLen = (code || '').replace(/\s+/g, '').length;
  const lengthScore = Math.min(1, words / (isCoding ? 50 : 90));
  const structure = /(because|for example|for instance|first|then|finally|result|so that|trade-?off|complexity|impact)/i.test(answer) ? 1 : 0.4;
  const raw = isCoding
    ? 0.45 * coverage + 0.25 * Math.min(1, codeLen / 150) + 0.2 * lengthScore + 0.1 * structure
    : 0.55 * coverage + 0.3 * lengthScore + 0.15 * structure;
  const score = clamp(raw * 10, 0, 10);
  const verdict = score >= 8 ? 'excellent' : score >= 6 ? 'good' : score >= 4 ? 'average' : score > 0 ? 'weak' : 'no_answer';

  const feedback = [
    covered.length ? `You covered: ${covered.slice(0, 3).join('; ')}.` : 'The answer did not clearly hit the key points.',
    missed.length ? `Strengthen it by addressing: ${missed.slice(0, 3).join('; ')}.` : 'Good coverage of the expected points.',
    words < 40 && !isCoding ? 'The answer was short - aim for 1-2 minutes with a concrete example.' : '',
  ].filter(Boolean).join(' ');

  let followUp = null;
  if (!question.isFollowUp) {
    if (isCoding && !/(o\(|big o|o of|complexity)/i.test(text)) followUp = 'What is the time and space complexity of your solution, and can it be optimised further?';
    else if (!isCoding && words > 0 && words < 45) followUp = 'Could you go a little deeper on that, ideally with a specific example from your own experience?';
  }

  return {
    score,
    verdict,
    feedback,
    strengths: covered,
    missedPoints: missed,
    codeReview: isCoding ? (codeLen > 40 ? 'Code submitted - review it against the optimal approach in the report.' : 'Little or no code was written.') : '',
    followUp,
    ack: ACKS[Math.floor(Math.random() * ACKS.length)],
  };
}

// ---------------------------------------------------------------- Final report

const avg = (xs) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null);
const score100 = (answers) => {
  const s = answers.map((a) => (a.skipped ? 0 : a.evaluation?.score ?? 0));
  return s.length ? clamp(avg(s) * 10) : null;
};

const RESOURCES = {
  faang_coding: 'NeetCode 150 / LeetCode patterns (two pointers, sliding window, BFS/DFS, DP); practise explaining complexity aloud.',
  system_design: '"System Design Primer" (GitHub), "Designing Data-Intensive Applications", ByteByteGo.',
  fundamentals: 'GeeksforGeeks / InterviewBit notes on OS, DBMS, Computer Networks and OOP.',
  case_study: 'Standard textbooks for your field plus 2-3 recent industry case studies.',
  behavioral: 'Prepare 6-8 STAR stories (conflict, failure, ownership, leadership, pressure).',
  default: 'Revise the topic, then practise answering aloud in 2 minutes with one concrete example.',
};

export async function finalReport({ profile, cvAnalysis, config, techResult, hrResult }) {
  await delay(900);
  const tech = techResult.answers;
  const hr = hrResult?.answers || [];
  const all = [...tech, ...hr];
  // Answers cut off by the timer or "End round" were never scored live - score them now.
  for (const a of all) {
    if (!a.evaluation && !a.skipped && (a.answer || a.code)) a.evaluation = scoreAnswer({ question: a, answer: a.answer, code: a.code });
  }
  const speech = aggregateSpeech(all);

  const coding = score100(tech.filter((a) => a.type === 'coding'));
  const technicalKnowledge = score100(tech.filter((a) => a.type !== 'coding')) ?? 0;
  const problemSolving = score100(tech.filter((a) => ['faang_coding', 'system_design', 'case_study', 'fundamentals'].includes(a.category) || a.type === 'coding')) ?? technicalKnowledge;
  const hrScore = hrResult ? score100(hr) ?? 0 : null;
  const cvAlignment = score100(all.filter((a) => /^cv_|warmup|intro/.test(a.category))) ?? technicalKnowledge;

  let communication = 70;
  if (speech.avgWpm) communication += speech.avgWpm >= 110 && speech.avgWpm <= 170 ? 10 : -10;
  if (speech.fillersPer100Words > 5) communication -= 15;
  if (speech.avgWordsPerAnswer < 40) communication -= 20;
  else if (speech.avgWordsPerAnswer > 90) communication += 10;
  communication -= speech.skipped * 5;
  communication = clamp(communication);

  const cams = [techResult.camera, hrResult?.camera].filter(Boolean);
  const bodyLanguage = cams.length ? clamp(avg(cams.map((c) => c.confidenceScore))) : 60;

  const weights = [[technicalKnowledge, 0.3], [problemSolving, 0.2], [coding, 0.1], [communication, 0.15], [hrScore, 0.1], [bodyLanguage, 0.05], [cvAlignment, 0.1]].filter(([v]) => v != null);
  const overallScore = clamp(weights.reduce((s, [v, w]) => s + v * w, 0) / weights.reduce((s, [, w]) => s + w, 0));
  const verdict = overallScore >= 85 ? 'Strong Hire' : overallScore >= 72 ? 'Hire' : overallScore >= 60 ? 'Lean Hire' : overallScore >= 45 ? 'Lean No Hire' : 'No Hire';

  const topicOf = (a) => a.cvReference || (a.codingPrompt ? a.codingPrompt.split('\n')[0] : a.question.slice(0, 80));
  const roundSummary = (answers, label) => {
    const answered = answers.filter((a) => !a.skipped);
    const good = answers.filter((a) => (a.evaluation?.score ?? 0) >= 7);
    const weakOnes = answers.filter((a) => (a.evaluation?.score ?? 0) < 5);
    return {
      summary: `In the ${label} you answered ${answered.length} of ${answers.length} questions with an average score of ${(avg(answers.map((a) => a.evaluation?.score ?? 0)) ?? 0).toFixed(1)}/10.`,
      strengths: good.slice(0, 4).map((a) => `Strong answer on: ${topicOf(a)}`),
      weaknesses: weakOnes.slice(0, 4).map((a) => `Needs work: ${topicOf(a)}`),
    };
  };

  const questionReviews = all.map((a) => ({
    id: a.id,
    score: a.skipped ? 0 : a.evaluation?.score ?? 0,
    feedback: a.skipped ? 'Skipped.' : a.evaluation?.feedback || 'Not evaluated (time ran out).',
    idealAnswer: a.idealPoints?.length ? `A strong answer covers: ${a.idealPoints.join('; ')}.` : 'Answer with a clear structure, a concrete example from your experience, and the result.',
  }));

  const commTips = [];
  if (speech.avgWordsPerAnswer < 40) commTips.push('Your answers were short. Use STAR (Situation, Task, Action, Result) and aim for 1-2 minutes.');
  if (speech.fillersPer100Words > 3) commTips.push(`Reduce filler words (${speech.topFillers.join(', ')}). Pause silently instead.`);
  if (speech.avgWpm && speech.avgWpm > 170) commTips.push(`You spoke fast (~${speech.avgWpm} wpm). Slow down to 120-160 wpm.`);
  if (speech.avgWpm && speech.avgWpm < 110) commTips.push(`Your pace was slow (~${speech.avgWpm} wpm). Practise answers aloud to build fluency.`);
  commTips.push('Start each answer with a one-line summary, then give details.');

  const bodyTips = [];
  const c0 = techResult.camera;
  if (c0?.eyeContactPct != null && c0.eyeContactPct < 70) bodyTips.push('Look at the camera more often - eye contact was below 70%.');
  if (cams.some((c) => c.facePresentPct < 90)) bodyTips.push('Stay centred in the frame; your face was not always visible.');
  if (cams.some((c) => c.multipleFacesPct > 2)) bodyTips.push('Another person appeared on camera - interview alone in a quiet room.');
  if (cams.some((c) => c.smilePct < 5)) bodyTips.push('Smile occasionally, especially in the HR round, to appear confident and approachable.');
  if (cams.some((c) => c.headMovement === 'high')) bodyTips.push('Reduce head movement and fidgeting; sit upright.');
  if (cams.some((c) => (c.blinkRatePerMin ?? 0) > 30)) bodyTips.push('A high blink rate can signal nervousness - take slow breaths before answering.');
  if (!bodyTips.length) bodyTips.push(cams.length ? 'Body language looked steady. Keep it up.' : 'Camera data was not available for this interview.');

  const studyPlan = all
    .filter((a) => (a.skipped ? 0 : a.evaluation?.score ?? 0) < 6)
    .slice(0, 6)
    .map((a) => ({
      topic: topicOf(a),
      why: a.skipped ? 'You skipped this question.' : `Scored ${a.evaluation?.score ?? 0}/10.`,
      resources: RESOURCES[a.category] || (a.round === 'hr' ? RESOURCES.behavioral : RESOURCES.default),
    }));

  const cvQs = all.filter((a) => /^cv_|warmup|intro/.test(a.category));
  const trend = academicTrend(profile);

  return {
    mode: 'offline',
    overallScore,
    verdict,
    summary: `This is an offline estimate for a ${LEVELS[config.level].label} (${LEVELS[config.level].experience}) interview. Overall you scored ${overallScore}/100 (${verdict}). Technical knowledge ${technicalKnowledge}/100${coding != null ? `, coding ${coding}/100` : ''}, communication ${communication}/100${hrScore != null ? `, HR ${hrScore}/100` : ''}. Scores come from key-point coverage and answer length, so add a Gemini key for a true AI evaluation of your answers.`,
    scores: { technicalKnowledge, problemSolving, coding, communication, hr: hrScore, bodyLanguage, cvAlignment },
    technicalRound: roundSummary(tech, 'technical round'),
    hrRound: hrResult ? roundSummary(hr, 'HR round') : null,
    questionReviews,
    communication: { summary: `Average ${speech.avgWordsPerAnswer} words per answer${speech.avgWpm ? ` at ~${speech.avgWpm} words per minute` : ''}, ${speech.fillerCount} filler words, ${speech.skipped} skipped question(s).`, tips: commTips },
    bodyLanguage: { summary: cams.length ? `Estimated confidence ${bodyLanguage}/100 from webcam analysis (eye contact, presence, expressions, movement).` : 'No camera data.', tips: bodyTips },
    cvReview: {
      summary: cvAnalysis.summary,
      consistencyWithAnswers: cvQs.length ? `You averaged ${(avg(cvQs.map((a) => a.evaluation?.score ?? 0)) ?? 0).toFixed(1)}/10 on questions about your own CV. ${cvAlignment < 60 ? 'Be ready to explain everything you list in depth - interviewers probe CV claims first.' : 'You backed up your CV claims reasonably well.'}` : 'No CV-specific questions were answered.',
      topFixes: (cvAnalysis.improvements || []).slice(0, 5).map((i) => `${i.section}: ${i.suggestion}`),
    },
    academicProfile: trend.text || 'Not enough academic data provided.',
    studyPlan,
    nextSteps: [
      'Re-take the interview at the same level after revising the study plan topics.',
      'Record 3 STAR stories from your CV projects and practise them aloud.',
      'Fix the top CV issues listed above before applying.',
      'Add a free Gemini API key (Settings) for AI-generated questions, follow-ups and detailed feedback.',
    ],
  };
}
