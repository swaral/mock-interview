const STORAGE_KEY = 'mock-interview.settings.v1';

const DEFAULTS = {
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
  rememberKey: true,
  // "latest" alias always points at Google's current flash model (gemini-2.5-flash is retired for new keys).
  model: import.meta.env.VITE_GEMINI_MODEL || 'gemini-flash-latest',
  voiceURI: '',
  speechLang: 'en-IN',
  speechRate: 1,
};

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...DEFAULTS, ...saved, apiKey: saved.apiKey || DEFAULTS.apiKey };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings) {
  try {
    const toStore = { ...settings };
    if (!settings.rememberKey) delete toStore.apiKey;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    /* storage unavailable (private mode) - settings live for this session only */
  }
}
