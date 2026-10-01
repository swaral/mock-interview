import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { addSample, analyzeFrame, loadFaceLandmarker, newAccumulator, newCalibration, summarize } from '../lib/faceAnalyzer';

const STATUS_TEXT = {
  starting: 'Starting camera…',
  loading: 'Loading face analysis…',
  ready: '',
  'no-camera': 'Camera unavailable - allow camera access in the browser to enable body-language analysis.',
  'model-failed': 'Face analysis could not load (it needs internet the first time). The interview continues without it.',
};

const CameraPanel = forwardRef(function CameraPanel(_props, ref) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('starting');
  const [live, setLive] = useState(null);
  const roundAcc = useRef(newAccumulator());
  const questionAcc = useRef(newAccumulator());
  const calib = useRef(newCalibration());
  const trackGaze = useRef(true);

  useImperativeHandle(
    ref,
    () => ({
      startRound() {
        roundAcc.current = newAccumulator();
        questionAcc.current = newAccumulator();
        calib.current = newCalibration();
      },
      resetQuestion() {
        questionAcc.current = newAccumulator();
      },
      // Eye contact is not meaningful while typing code, so gaze tracking pauses for coding questions.
      setTrackGaze(v) {
        trackGaze.current = v;
      },
      questionSummary: () => summarize(questionAcc.current),
      roundSummary: () => summarize(roundAcc.current),
    }),
    [],
  );

  useEffect(() => {
    let stream;
    let raf;
    let stopped = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
      } catch {
        setStatus('no-camera');
        return;
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play().catch(() => {});
      setStatus('loading');

      let landmarker;
      try {
        landmarker = await loadFaceLandmarker();
      } catch (e) {
        console.error('Face landmarker failed to load', e);
        if (!stopped) setStatus('model-failed');
        return;
      }
      if (stopped) return;
      setStatus('ready');

      let last = 0;
      let lastUi = 0;
      const loop = () => {
        if (stopped) return;
        raf = requestAnimationFrame(loop);
        const t = performance.now();
        if (t - last < 100 || video.readyState < 2) return; // ~10 fps is plenty
        last = t;
        let result;
        try {
          result = landmarker.detectForVideo(video, t);
        } catch {
          return;
        }
        const sample = analyzeFrame(result, calib.current);
        const opts = { trackGaze: trackGaze.current };
        addSample(roundAcc.current, sample, opts);
        addSample(questionAcc.current, sample, opts);
        if (t - lastUi > 500) {
          lastUi = t;
          const r = summarize(roundAcc.current);
          setLive({ faces: sample.faces, away: sample.away, eyeContact: r?.eyeContactPct, confidence: r?.confidenceScore, gaze: trackGaze.current });
        }
      };
      loop();
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  let badge = null;
  if (live) {
    if (live.faces === 0) badge = <span className="badge bad">No face detected</span>;
    else if (live.faces > 1) badge = <span className="badge bad">{live.faces} faces detected</span>;
    else if (!live.gaze) badge = <span className="badge">Coding mode</span>;
    else if (live.away) badge = <span className="badge warn">Looking away</span>;
    else badge = <span className="badge good">Good eye contact</span>;
  }

  return (
    <div className="card camera-card">
      <div className="camera-frame">
        <video ref={videoRef} muted playsInline className="camera-video" />
        {status === 'ready' && <div className="camera-overlay">{badge}</div>}
      </div>
      {STATUS_TEXT[status] && <p className="small muted">{STATUS_TEXT[status]}</p>}
      {status === 'ready' && live && (
        <div className="camera-stats">
          <div>
            <span>Eye contact</span>
            <strong>{live.eyeContact ?? '-'}%</strong>
          </div>
          <div>
            <span>Confidence</span>
            <strong>{live.confidence ?? '-'}</strong>
          </div>
        </div>
      )}
    </div>
  );
});

export default CameraPanel;
