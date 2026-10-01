// Text-to-speech: the "laptop speaks the question" part.
// Long text is split into sentence chunks to avoid Chrome's ~15s utterance cut-off.

let options = { voiceURI: '', rate: 1, lang: 'en-IN' };
let session = 0;
let finishCurrent = null;
const keepAlive = new Set(); // Chrome drops onend events if utterances get garbage-collected

export function configureTTS(next) {
  options = { ...options, ...next };
}

export function ttsSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function loadVoices() {
  if (!ttsSupported()) return Promise.resolve([]);
  const voices = window.speechSynthesis.getVoices();
  if (voices.length) return Promise.resolve(voices);
  return new Promise((resolve) => {
    const done = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1500);
  });
}

function pickVoice(voices, o) {
  if (o.voiceURI) {
    const v = voices.find((x) => x.voiceURI === o.voiceURI);
    if (v) return v;
  }
  const lang = (o.lang || 'en-US').toLowerCase();
  const norm = (v) => v.lang.toLowerCase().replace('_', '-');
  const english = voices.filter((v) => /^en/i.test(v.lang));
  return (
    english.find((v) => norm(v) === lang && /google|natural|online/i.test(v.name)) ||
    english.find((v) => norm(v) === lang) ||
    english.find((v) => /google us english|natural|online/i.test(v.name)) ||
    english.find((v) => norm(v) === 'en-us') ||
    english[0] ||
    voices[0] ||
    null
  );
}

function chunkText(text) {
  const sentences = text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]*/g) || [text];
  const chunks = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > 180 && cur) {
      chunks.push(cur.trim());
      cur = s;
    } else cur += s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

/** Speaks text; resolves when finished or cancelled. */
export async function speak(text, override) {
  if (!ttsSupported() || !text) return;
  const o = { ...options, ...(override || {}) };
  cancelSpeech();
  const my = ++session;
  const voices = await loadVoices();
  await new Promise((r) => setTimeout(r, 60)); // Chrome sometimes ignores speak() right after cancel()
  if (my !== session) return;
  const voice = pickVoice(voices, o);
  const chunks = chunkText(text);
  const synth = window.speechSynthesis;
  synth.resume();

  await new Promise((resolve) => {
    let i = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(guard);
      if (finishCurrent === finish) finishCurrent = null;
      resolve();
    };
    // Safety net in case the browser never fires onend.
    const guard = setTimeout(finish, 5000 + (text.length * 110) / (o.rate || 1));
    finishCurrent = finish;

    const next = () => {
      if (done || my !== session || i >= chunks.length) return finish();
      const u = new SpeechSynthesisUtterance(chunks[i++]);
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      } else u.lang = o.lang;
      u.rate = o.rate || 1;
      keepAlive.add(u);
      u.onend = () => {
        keepAlive.delete(u);
        next();
      };
      u.onerror = () => {
        keepAlive.delete(u);
        next();
      };
      synth.speak(u);
    };
    next();
  });
}

export function cancelSpeech() {
  session++;
  const f = finishCurrent;
  finishCurrent = null;
  f?.();
  if (ttsSupported()) window.speechSynthesis.cancel();
}
