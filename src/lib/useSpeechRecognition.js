import { useEffect, useMemo, useRef, useState } from 'react';

// Speech-to-text using the browser's built-in recognizer (Chrome / Edge on Windows & macOS).

export function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function useSpeechRecognition({ lang = 'en-IN', onFinal }) {
  const [interim, setInterim] = useState('');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');

  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;
  const langRef = useRef(lang);
  langRef.current = lang;

  const recRef = useRef(null);
  const wantRef = useRef(false); // keep listening across Chrome's automatic stops after silence
  const activeRef = useRef(false);
  const interimRef = useRef('');
  const waitersRef = useRef([]);

  const api = useMemo(() => {
    const SR = getSpeechRecognition();

    function create() {
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        activeRef.current = true;
        setListening(true);
      };
      rec.onresult = (e) => {
        let text = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) {
            const t = r[0].transcript.trim();
            if (t) onFinalRef.current?.(t);
          } else text += r[0].transcript;
        }
        interimRef.current = text;
        setInterim(text);
      };
      rec.onerror = (e) => {
        if (e.error === 'no-speech' || e.error === 'aborted') return;
        wantRef.current = false;
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed')
          setError('Microphone access is blocked. Allow the microphone for this site (icon in the address bar), or type your answers.');
        else if (e.error === 'network')
          setError('Speech recognition needs an internet connection. You can type your answer instead.');
        else if (e.error === 'audio-capture') setError('No microphone found. Connect a microphone or type your answers.');
        else setError(`Speech recognition error: ${e.error}. You can type your answer instead.`);
      };
      rec.onend = () => {
        activeRef.current = false;
        // Keep any words that were still "interim" when recognition ended.
        const leftover = interimRef.current.trim();
        if (leftover) onFinalRef.current?.(leftover);
        interimRef.current = '';
        setInterim('');
        if (wantRef.current) {
          try {
            rec.start();
            return;
          } catch {
            /* fall through */
          }
        }
        setListening(false);
        waitersRef.current.splice(0).forEach((fn) => fn());
      };
      return rec;
    }

    return {
      supported: !!SR,
      start() {
        if (!SR) return;
        if (!recRef.current) recRef.current = create();
        const rec = recRef.current;
        rec.lang = langRef.current;
        wantRef.current = true;
        setError('');
        if (!activeRef.current) {
          try {
            rec.start();
          } catch {
            /* already starting - onend will restart it because wantRef is true */
          }
        }
      },
      /** Stops and resolves once the last results have been delivered. */
      stop() {
        wantRef.current = false;
        const rec = recRef.current;
        if (!rec || !activeRef.current) return Promise.resolve();
        return new Promise((resolve) => {
          waitersRef.current.push(resolve);
          try {
            rec.stop();
          } catch {
            resolve();
          }
          setTimeout(resolve, 1500);
        });
      },
      abort() {
        wantRef.current = false;
        interimRef.current = '';
        try {
          recRef.current?.abort();
        } catch {
          /* ignore */
        }
      },
    };
  }, []);

  useEffect(() => () => api.abort(), [api]);

  return { ...api, interim, listening, error };
}
