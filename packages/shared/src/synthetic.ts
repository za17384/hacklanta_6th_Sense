import { LM, type Landmark, type PoseFrame } from "./types";

// Synthetic side-on squatter. Used by unit tests and by the web "Synthetic"
// pose provider (demo without a camera). Not a model: clearly fake data.

export interface SynthRep { depthDeg: number; durS: number; leanDeg?: number }

const D2R = Math.PI / 180;
const TOP = 175;
const REST_S = 0.6;
export const SYNTH_HOLD_S = 3.5;

/** Build a 33-landmark frame for a side-on squat at the given knee angle. */
export function squatPose(t: number, kneeDeg: number, leanDeg = 20, visible = true): PoseFrame {
  const v = visible ? 0.95 : 0.1;
  const lm: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: visible ? 0.9 : 0.1 }));
  const shin = 0.2, thigh = 0.2, torso = 0.28;
  const ankle = { x: 0.5, y: 0.9 };
  const shinTilt = ((180 - kneeDeg) / 2) * D2R; // knee travels forward as you sink
  const knee = { x: ankle.x + shin * Math.sin(shinTilt), y: ankle.y - shin * Math.cos(shinTilt) };
  // knee→ankle direction rotated by kneeDeg gives knee→hip.
  const d = { x: ankle.x - knee.x, y: ankle.y - knee.y };
  const n = Math.hypot(d.x, d.y);
  const rot = -kneeDeg * D2R;
  const u = { x: (d.x * Math.cos(rot) - d.y * Math.sin(rot)) / n, y: (d.x * Math.sin(rot) + d.y * Math.cos(rot)) / n };
  const hip = { x: knee.x + thigh * u.x, y: knee.y + thigh * u.y };
  const shoulder = { x: hip.x + torso * Math.sin(leanDeg * D2R), y: hip.y - torso * Math.cos(leanDeg * D2R) };
  const set = (i: number, p: { x: number; y: number }, vis = v) => (lm[i] = { x: p.x, y: p.y, z: 0, visibility: vis });
  const far = visible ? 0.4 : 0.05; // right side occluded in a side view
  set(LM.lAnkle, ankle); set(LM.lKnee, knee); set(LM.lHip, hip); set(LM.lShoulder, shoulder);
  set(LM.rAnkle, ankle, far); set(LM.rKnee, knee, far); set(LM.rHip, hip, far); set(LM.rShoulder, shoulder, far);
  set(LM.nose, { x: shoulder.x + 0.04, y: shoulder.y - 0.08 });
  set(LM.lElbow, { x: shoulder.x + 0.08, y: shoulder.y + 0.05 });
  set(LM.lWrist, { x: shoulder.x + 0.16, y: shoulder.y + 0.04 });
  set(LM.rElbow, { x: shoulder.x + 0.08, y: shoulder.y + 0.05 }, far);
  set(LM.rWrist, { x: shoulder.x + 0.16, y: shoulder.y + 0.04 }, far);
  return { t, landmarks: lm, aspect: 1 };
}

/** Knee angle over time for a scripted set: calibration hold, then reps (cosine dip) with rests between. */
export function squatScript(reps: SynthRep[], holdS = SYNTH_HOLD_S): (tS: number) => { knee: number; lean: number } {
  return (tS) => {
    let t = tS - holdS;
    if (t < 0) return { knee: TOP, lean: 15 };
    for (const r of reps) {
      if (t < r.durS) {
        const ph = (1 - Math.cos((2 * Math.PI * t) / r.durS)) / 2; // 0→1→0
        return { knee: TOP - (TOP - r.depthDeg) * ph, lean: 15 + ((r.leanDeg ?? 30) - 15) * ph };
      }
      t -= r.durS;
      if (t < REST_S) return { knee: TOP, lean: 15 };
      t -= REST_S;
    }
    return { knee: TOP, lean: 15 };
  };
}

export function squatScriptDuration(reps: SynthRep[], holdS = SYNTH_HOLD_S): number {
  return holdS + reps.reduce((s, r) => s + r.durS + REST_S, 0) + 1;
}

export function* syntheticSquatFrames(reps: SynthRep[], fps = 30): Generator<PoseFrame> {
  const f = squatScript(reps);
  const total = squatScriptDuration(reps);
  for (let i = 0; i <= total * fps; i++) {
    const tS = i / fps;
    const { knee, lean } = f(tS);
    yield squatPose(tS * 1000, knee, lean);
  }
}
