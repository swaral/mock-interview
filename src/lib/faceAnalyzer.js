// Local webcam analysis with MediaPipe Face Landmarker. Video never leaves the computer.
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// Keep this version in sync with @mediapipe/tasks-vision in package.json.
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let landmarkerPromise = null;

export function loadFaceLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
      const opts = (delegate) => ({
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: 'VIDEO',
        numFaces: 3,
        outputFaceBlendshapes: true,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      try {
        return await FaceLandmarker.createFromOptions(fileset, opts('GPU'));
      } catch {
        return await FaceLandmarker.createFromOptions(fileset, opts('CPU'));
      }
    })().catch((e) => {
      landmarkerPromise = null;
      throw e;
    });
  }
  return landmarkerPromise;
}

const avg = (a, b) => ((a || 0) + (b || 0)) / 2;

/** Calibration = the user's natural "looking at the screen" head position. */
export function newCalibration() {
  return { n: 0, yaw: 0.5, pitch: 0.55 };
}

export function analyzeFrame(result, calib) {
  const faces = result?.faceLandmarks?.length || 0;
  if (!faces) return { faces: 0 };

  const lm = result.faceLandmarks[0];
  const bs = {};
  for (const c of result.faceBlendshapes?.[0]?.categories || []) bs[c.categoryName] = c.score;

  // Head pose from landmark ratios: nose tip vs cheeks (yaw) and forehead/chin (pitch).
  const nose = lm[1];
  const left = lm[234];
  const right = lm[454];
  const top = lm[10];
  const chin = lm[152];
  const faceWidth = right.x - left.x;
  const yaw = (nose.x - left.x) / (faceWidth || 1e-6);
  const pitch = (nose.y - top.y) / (chin.y - top.y || 1e-6);

  const blink = avg(bs.eyeBlinkLeft, bs.eyeBlinkRight);
  const gazeSide = Math.max(avg(bs.eyeLookOutLeft, bs.eyeLookInRight), avg(bs.eyeLookInLeft, bs.eyeLookOutRight));
  const gazeDown = avg(bs.eyeLookDownLeft, bs.eyeLookDownRight);
  const gazeUp = avg(bs.eyeLookUpLeft, bs.eyeLookUpRight);
  const eyesAway = blink < 0.45 && (gazeSide > 0.55 || gazeDown > 0.55 || gazeUp > 0.6);

  // Calibrate from the first ~20 frames where the person seems to be facing the screen.
  if (calib.n < 20 && !eyesAway && Math.abs(yaw - 0.5) < 0.15) {
    calib.yaw = (calib.yaw * calib.n + yaw) / (calib.n + 1);
    calib.pitch = (calib.pitch * calib.n + pitch) / (calib.n + 1);
    calib.n++;
  }
  const headAway = Math.abs(yaw - calib.yaw) > 0.14 || Math.abs(pitch - calib.pitch) > 0.1;

  return {
    faces,
    away: headAway || eyesAway,
    blink: blink > 0.5,
    smile: avg(bs.mouthSmileLeft, bs.mouthSmileRight),
    tension: Math.max(avg(bs.browDownLeft, bs.browDownRight), avg(bs.mouthPressLeft, bs.mouthPressRight)),
    nose: { x: nose.x, y: nose.y },
    faceWidth,
  };
}

export function newAccumulator() {
  return {
    start: Date.now(),
    samples: 0,
    noFace: 0,
    multiFace: 0,
    faceSamples: 0,
    gazeSamples: 0,
    away: 0,
    smiles: 0,
    tense: 0,
    blinks: 0,
    lastBlink: false,
    movement: 0,
    moveSamples: 0,
    lastNose: null,
  };
}

export function addSample(acc, s, { trackGaze = true } = {}) {
  acc.samples++;
  if (!s.faces) {
    acc.noFace++;
    acc.lastNose = null;
    return;
  }
  if (s.faces > 1) acc.multiFace++;
  acc.faceSamples++;
  if (trackGaze) {
    acc.gazeSamples++;
    if (s.away) acc.away++;
  }
  if (s.smile > 0.35) acc.smiles++;
  if (s.tension > 0.45) acc.tense++;
  if (s.blink && !acc.lastBlink) acc.blinks++;
  acc.lastBlink = s.blink;
  if (acc.lastNose && s.faceWidth > 0) {
    acc.movement += Math.hypot(s.nose.x - acc.lastNose.x, s.nose.y - acc.lastNose.y) / s.faceWidth;
    acc.moveSamples++;
  }
  acc.lastNose = s.nose;
}

export function summarize(acc) {
  if (!acc || !acc.samples) return null;
  const pct = (a, b) => (b ? Math.round((100 * a) / b) : null);
  const minutes = Math.max(0.1, (Date.now() - acc.start) / 60000);
  const avgMove = acc.moveSamples ? acc.movement / acc.moveSamples : 0;
  const headMovement = avgMove < 0.008 ? 'low' : avgMove < 0.02 ? 'moderate' : 'high';
  const eyeContactPct = acc.gazeSamples ? 100 - pct(acc.away, acc.gazeSamples) : null;
  const facePresentPct = 100 - pct(acc.noFace, acc.samples);
  const smilePct = pct(acc.smiles, acc.faceSamples) ?? 0;
  const tensionPct = pct(acc.tense, acc.faceSamples) ?? 0;
  const moveScore = { low: 100, moderate: 75, high: 45 }[headMovement];
  const confidence = Math.round(
    0.4 * (eyeContactPct ?? 70) +
      0.2 * facePresentPct +
      0.15 * (100 - tensionPct) +
      0.1 * moveScore +
      0.15 * Math.min(100, smilePct * 4),
  );
  return {
    durationMin: +minutes.toFixed(1),
    facePresentPct,
    multipleFacesPct: pct(acc.multiFace, acc.samples),
    eyeContactPct,
    smilePct,
    tensionPct,
    blinkRatePerMin: acc.faceSamples ? Math.round(acc.blinks / minutes) : null,
    headMovement,
    confidenceScore: Math.max(0, Math.min(100, confidence)),
  };
}
