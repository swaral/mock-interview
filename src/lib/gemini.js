// Minimal Gemini REST client (no SDK) - works directly from the browser.
const BASE = 'https://generativelanguage.googleapis.com/v1beta';

const SHARED_BASE = '/api/gemini'; // Netlify Function that holds the site's key on the server

let config = { apiKey: '', model: 'gemini-2.5-flash', shared: false };

// A personal key calls Google directly; otherwise the site's shared proxy is used (if available).
function endpoint(apiKey = config.apiKey) {
  if (apiKey) return { base: BASE, headers: { 'x-goog-api-key': apiKey } };
  return { base: SHARED_BASE, headers: {} };
}

/** Asks the hosting site whether shared AI (a server-side key) is available. */
export async function checkSharedAI() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`${SHARED_BASE}/status`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return false;
    return !!(await res.json()).available;
  } catch {
    return false;
  }
}

export function configureGemini(next) {
  if (next.model && next.model !== config.model) workingModel = null; // respect a newly chosen model
  config = { ...config, ...next };
}

let forceOffline = false; // user chose "Continue in Offline mode" while Gemini was down

export function setForceOffline(v) {
  forceOffline = !!v;
}

export function isGeminiConfigured() {
  return (!!config.apiKey || config.shared) && !forceOffline;
}

export class GeminiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'GeminiError';
    this.status = status;
  }
}

const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readError(res) {
  return (await readErrorDetails(res)).message;
}

// Returns { message, perDay } - perDay is true when the free-tier *daily* quota for that model is used up.
async function readErrorDetails(res) {
  try {
    const j = await res.json();
    const details = j?.error?.details || [];
    const perDay = details.some((d) => (d.violations || []).some((v) => /PerDay/i.test(v.quotaId || '')));
    return { message: j?.error?.message || res.statusText, perDay };
  } catch {
    return { message: res.statusText, perDay: false };
  }
}

function friendly(status, msg, model = config.model) {
  if (!config.apiKey && [400, 401, 403].includes(status))
    return `The site's shared AI rejected the request (${status}). Add your own free Gemini key in Settings, or continue in Offline mode.`;
  if (status === 400 && /api key/i.test(msg)) return 'Your Gemini API key is invalid. Update it in Settings (or remove it to use Offline mode).';
  if (status === 401 || status === 403) return `Gemini rejected the request (${status}): ${msg}. Check your API key in Settings.`;
  if (status === 404) return `Model "${model}" is not available for this key. Choose another model in Settings.`;
  if (status === 429) return 'Gemini rate limit / quota reached (common on the free tier). Wait about a minute and click Retry.';
  return `Gemini error (${status}): ${msg}`;
}

export async function listModels(apiKey = config.apiKey) {
  const { base, headers } = endpoint(apiKey);
  const res = await fetch(`${base}/models?pageSize=200`, { headers });
  if (!res.ok) throw new GeminiError(friendly(res.status, await readError(res)), res.status);
  const data = await res.json();
  return (data.models || [])
    .filter(
      (m) =>
        (m.supportedGenerationMethods || []).includes('generateContent') &&
        /gemini/i.test(m.name) &&
        !/(embedding|image|tts|audio|live|robotics|computer-use)/i.test(m.name),
    )
    .map((m) => ({ id: m.name.replace(/^models\//, ''), label: m.displayName || m.name }));
}

// Lower thinking for quick per-answer calls so the interviewer doesn't pause too long.
function fastThinkingConfig(model) {
  if (/gemini-2\.5-flash/i.test(model)) return { thinkingBudget: 0 };
  if (/gemini-2\.5-pro/i.test(model)) return { thinkingBudget: 128 };
  if (/gemini-3|flash-latest|flash-lite-latest/i.test(model)) return { thinkingLevel: 'low' };
  return null;
}

function parseJSON(text) {
  const t = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(t);
  } catch (e) {
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(t.slice(start, end + 1));
    throw e;
  }
}

/**
 * Calls Gemini and returns parsed JSON.
 * parts: Gemini content parts, e.g. [{ text }, { inline_data: { mime_type, data } }]
 */
// Tried in order when the chosen model is overloaded (503), rate-limited (429) or retired (404).
// Any other flash models the key can access are discovered at runtime and appended.
const FALLBACK_MODELS = ['gemini-flash-latest', 'gemini-3-flash-preview', 'gemini-flash-lite-latest'];
let workingModel = null; // last model that answered successfully - tried first next time
const retiredModels = new Set(); // models that returned 404 - skipped for the rest of the session
const exhaustedModels = new Set(); // models whose free daily quota is used up - skipped for the session
let discovered = null; // flash models available to this key, newest first

const versionOf = (id) => (/latest/.test(id) ? 99 : Number((id.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1]) || 0);

async function discoverFlashModels() {
  if (discovered) return discovered;
  try {
    const ids = (await listModels())
      .map((m) => m.id)
      .filter((id) => /flash/i.test(id) && !/(transcribe|omni|customtools|native)/i.test(id));
    // Newest first; "lite" models after the full ones.
    discovered = ids.sort((a, b) => /lite/.test(a) - /lite/.test(b) || versionOf(b) - versionOf(a));
  } catch {
    discovered = [];
  }
  return discovered;
}

export function getActiveModel() {
  return workingModel || config.model;
}

async function callModel(model, { system, parts, temperature, fast, timeoutMs }) {
  let thinking = fast ? fastThinkingConfig(model) : null;
  for (;;) {
    const generationConfig = { temperature, responseMimeType: 'application/json' };
    if (thinking) generationConfig.thinkingConfig = thinking;
    const body = { contents: [{ role: 'user', parts }], generationConfig };
    if (system) body.systemInstruction = { parts: [{ text: system }] };

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res;
    try {
      const { base, headers: authHeaders } = endpoint();
      res = await fetch(`${base}/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
    } catch (e) {
      if (e.name === 'AbortError') throw new GeminiError('Gemini took too long to respond.', 504);
      throw e;
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      const { message: msg, perDay } = await readErrorDetails(res);
      if (res.status === 400 && thinking && /thinking/i.test(msg)) {
        thinking = null; // this model doesn't accept that thinking config - retry without it
        continue;
      }
      const err = new GeminiError(friendly(res.status, msg, model), res.status);
      err.perDay = res.status === 429 && perDay;
      throw err;
    }
    const data = await res.json();
    const cand = data.candidates?.[0];
    const text = (cand?.content?.parts || [])
      .filter((p) => !p.thought)
      .map((p) => p.text || '')
      .join('')
      .trim();
    if (!text) {
      const reason = data.promptFeedback?.blockReason || cand?.finishReason || 'unknown reason';
      throw new GeminiError(`Gemini returned an empty response (${reason}).`, 0);
    }
    return parseJSON(text);
  }
}

/**
 * Calls Gemini and returns parsed JSON. Falls back through other flash models when one is busy or retired.
 * parts: Gemini content parts, e.g. [{ text }, { inline_data: { mime_type, data } }]
 */
export async function generateJSON({ system, parts, temperature = 0.6, fast = false, timeoutMs = 60000, budgetMs = 75000 }) {
  if (!config.apiKey && !config.shared) throw new GeminiError('Add your Gemini API key in Settings first.', 401);
  const chain = [...new Set([workingModel, config.model, ...FALLBACK_MODELS, ...(await discoverFlashModels())].filter(Boolean))];
  const deadline = Date.now() + budgetMs; // give up (and offer Offline mode) instead of spinning forever
  let lastErr;
  let busyErr = null; // any 429/5xx seen - the real reason when every model fails
  let quotaHits = 0;

  for (let pass = 0; pass < 2; pass++) {
    for (const model of chain) {
      if (retiredModels.has(model) || exhaustedModels.has(model)) continue;
      for (let attempt = 0; attempt < 2; attempt++) {
        const left = deadline - Date.now();
        if (left < 3000) break;
        try {
          const result = await callModel(model, { system, parts, temperature, fast, timeoutMs: Math.min(timeoutMs, left) });
          if (workingModel !== model) {
            if (model !== config.model) console.info(`[gemini] "${config.model}" unavailable - using "${model}"`);
            workingModel = model;
          }
          return result;
        } catch (err) {
          lastErr = err;
          const status = err instanceof GeminiError ? err.status : null;
          if (status === 400 || status === 401 || status === 403) throw err; // bad key / bad request: no point retrying
          if (status === 404) {
            retiredModels.add(model);
            break;
          }
          if (err.perDay) {
            exhaustedModels.add(model); // daily free quota used up - don't waste time on it again today
            quotaHits++;
            break;
          }
          if (RETRYABLE.has(status)) {
            busyErr = err;
            break; // model busy / rate-limited -> next model
          }
          if (attempt === 0) await sleep(1200); // network blip or malformed JSON -> one retry on the same model
        }
      }
      if (workingModel === model) workingModel = null;
      if (deadline - Date.now() < 3000) break;
    }
    if (deadline - Date.now() < 6000) break;
    if (pass === 0) await sleep(3000); // every model busy - short pause, then one more pass
  }

  if (lastErr instanceof TypeError) throw new GeminiError('Could not reach Gemini. Check your internet connection.', 0);
  if (lastErr instanceof SyntaxError) throw new GeminiError('Gemini returned malformed data. Please retry.', 0);
  const usable = chain.filter((m) => !retiredModels.has(m) && !exhaustedModels.has(m));
  if (!usable.length && (quotaHits || exhaustedModels.size))
    throw new GeminiError(
      "Today's free Gemini quota is used up for every available model (free tier: about 20 requests per model per day). Continue in Offline mode, try again tomorrow, or enable billing in Google AI Studio.",
      429,
    );
  if (busyErr)
    throw new GeminiError('All Gemini models are busy right now (high demand). Wait a minute and click Retry, or continue in Offline mode.', busyErr.status);
  throw lastErr || new GeminiError('No Gemini model is available for this key.', 503);
}
