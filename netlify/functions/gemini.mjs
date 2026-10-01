// Netlify Function: a narrow proxy to the Gemini API that keeps the API key on the server.
// The browser calls /api/gemini/...; this function adds the key from the GEMINI_API_KEY
// environment variable. Only the two calls the app needs are forwarded.
//
//   GET  /api/gemini/status                          -> { available: boolean }
//   GET  /api/gemini/models                          -> list of models
//   POST /api/gemini/models/<model>:generateContent  -> generate content

const GOOGLE = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL_RE = /^gemini-[a-z0-9.-]+$/;
const MAX_BODY_BYTES = 5 * 1024 * 1024; // Netlify's synchronous request limit is about 6 MB

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default async (req) => {
  const key = (typeof Netlify !== 'undefined' ? Netlify.env.get('GEMINI_API_KEY') : process.env.GEMINI_API_KEY) || '';
  const path = new URL(req.url).pathname.replace(/^\/api\/gemini\/?/, '');

  if (path === 'status' && req.method === 'GET') return json(200, { available: !!key });
  if (!key) return json(503, { error: { message: 'Shared AI is not configured on this site.' } });

  if (path === 'models' && req.method === 'GET') {
    const res = await fetch(`${GOOGLE}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
    return new Response(res.body, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  const m = path.match(/^models\/([^/:]+):generateContent$/);
  if (m && req.method === 'POST' && MODEL_RE.test(m[1])) {
    const body = await req.text();
    if (body.length > MAX_BODY_BYTES) return json(413, { error: { message: 'Request too large. Use a smaller CV file.' } });
    const res = await fetch(`${GOOGLE}/models/${m[1]}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body,
    });
    return new Response(res.body, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  return json(404, { error: { message: 'Not found' } });
};

export const config = { path: '/api/gemini/*' };
