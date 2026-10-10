import { angleFromVertical, jointAngle, point, std, type AngleMode } from "./geometry";
import { LM, type Exercise, type PoseFrame, type Side } from "./types";

// ── Exercise plug-in boundary ────────────────────────────────────────────────
// Adding an exercise = adding one ExerciseConfig. The rep engine is generic.
// ALL thresholds below are HEURISTICS chosen for a hackathon demo, not
// validated biomechanics. They are tunable at runtime via `tune()`.

export interface SecondarySample {
  /** Primary angle at this frame (smoothed), so checks can look at "the bottom". */
  angle: number;
  value: number;
}

export interface SecondaryResult {
  pass: boolean;
  flag?: string;
}

export interface ExerciseConfig {
  id: Exercise;
  label: string;
  camera: "side" | "front";
  cameraTip: string;
  /** Average both sides (front-on) instead of picking the more visible side. */
  bilateral: boolean;
  /** [a, b, c] landmark indices for the primary angle, vertex at b, per side. */
  primary: Record<Side, [number, number, number]>;
  /** Joints that must be visible (>= minVisibility) to keep counting, per side. */
  keyJoints: Record<Side, number[]>;
  /** Lockout angle (degrees). Rep starts below top-15, ends back near top. */
  topDeg: number;
  /** Depth angle (degrees). Ignored when depthReached is overridden. */
  bottomDeg: number;
  /** Override for exercises whose depth isn't an angle (pull-up: nose above wrists). */
  depthReached?: (frame: PoseFrame, side: Side, angle: number) => boolean;
  /** Per-frame measurement collected during a rep. */
  secondarySample: (frame: PoseFrame, side: Side, mode: AngleMode) => number;
  /** Judge the collected samples at rep end. */
  secondaryCheck: (samples: SecondarySample[]) => SecondaryResult;
  /** Tempo band for a full rep, seconds. */
  tempoBand: [number, number];
  baseXp: number;
  depthCue: string;
  debugLabel: string;
}

const sidePick = <T>(l: T, r: T): Record<Side, T> => ({ left: l, right: r });

export const SQUAT: ExerciseConfig = {
  id: "squat",
  label: "Squats",
  camera: "side",
  cameraTip: "Prop the phone side-on at hip height, ~2.5 m away. Whole body in frame.",
  bilateral: false,
  primary: sidePick([LM.lHip, LM.lKnee, LM.lAnkle], [LM.rHip, LM.rKnee, LM.rAnkle]),
  keyJoints: sidePick([LM.lShoulder, LM.lHip, LM.lKnee, LM.lAnkle], [LM.rShoulder, LM.rHip, LM.rKnee, LM.rAnkle]),
  topDeg: 160,
  bottomDeg: 100,
  // Torso lean: shoulder→hip vector angle from vertical.
  secondarySample: (f, s) =>
    s === "left" ? angleFromVertical(f, LM.lHip, LM.lShoulder) : angleFromVertical(f, LM.rHip, LM.rShoulder),
  secondaryCheck: (samples) => {
    if (!samples.length) return { pass: true };
    const bottom = samples.reduce((a, b) => (b.angle < a.angle ? b : a));
    return bottom.value <= 50 ? { pass: true } : { pass: false, flag: "chest up" };
  },
  tempoBand: [2.0, 4.0],
  baseXp: 10,
  depthCue: "go deeper",
  debugLabel: "hip–knee–ankle",
};

export const PUSHUP: ExerciseConfig = {
  id: "pushup",
  label: "Push-ups",
  camera: "side",
  cameraTip: "Phone on the floor side-on, ~2 m away. Head to heels in frame.",
  bilateral: false,
  primary: sidePick([LM.lShoulder, LM.lElbow, LM.lWrist], [LM.rShoulder, LM.rElbow, LM.rWrist]),
  keyJoints: sidePick([LM.lShoulder, LM.lElbow, LM.lWrist, LM.lHip, LM.lAnkle], [LM.rShoulder, LM.rElbow, LM.rWrist, LM.rHip, LM.rAnkle]),
  topDeg: 155,
  bottomDeg: 95,
  // Signed body-line deviation: + = hips sagging (below the shoulder–ankle line), − = piking.
  secondarySample: (f, s, mode) => {
    const [sh, hip, an] = s === "left" ? [LM.lShoulder, LM.lHip, LM.lAnkle] : [LM.rShoulder, LM.rHip, LM.rAnkle];
    const dev = 180 - jointAngle(f, sh, hip, an, mode);
    const a = point(f, sh, "2d"), h = point(f, hip, "2d"), k = point(f, an, "2d");
    // y of the shoulder–ankle line at the hip's x; hip below it (bigger y) = sag.
    const tLine = k.x === a.x ? 0.5 : (h.x - a.x) / (k.x - a.x);
    const lineY = a.y + tLine * (k.y - a.y);
    return h.y > lineY ? dev : -dev;
  },
  secondaryCheck: (samples) => {
    let worst = 0;
    for (const s of samples) if (Math.abs(s.value) > Math.abs(worst)) worst = s.value;
    if (Math.abs(worst) <= 20) return { pass: true }; // body line ≥ 160°
    return { pass: false, flag: worst > 0 ? "hips sagging" : "hips piking" };
  },
  tempoBand: [1.5, 3.5],
  baseXp: 15,
  depthCue: "go lower",
  debugLabel: "shoulder–elbow–wrist",
};

export const PULLUP: ExerciseConfig = {
  id: "pullup",
  label: "Pull-ups",
  camera: "front",
  cameraTip: "Face the camera from the front, ~3 m back, bar and hands in frame. Or upload a clip.",
  bilateral: true,
  primary: sidePick([LM.lShoulder, LM.lElbow, LM.lWrist], [LM.rShoulder, LM.rElbow, LM.rWrist]),
  keyJoints: sidePick([LM.nose, LM.lShoulder, LM.lElbow, LM.lWrist, LM.lHip], [LM.nose, LM.rShoulder, LM.rElbow, LM.rWrist, LM.rHip]),
  topDeg: 150,
  bottomDeg: 0,
  // Depth = nose above the wrist line (image y grows downward).
  depthReached: (f) => {
    const lm = f.landmarks;
    return lm[LM.nose]!.y < (lm[LM.lWrist]!.y + lm[LM.rWrist]!.y) / 2;
  },
  // Hip x normalised by shoulder width, for sway.
  secondarySample: (f) => {
    const lm = f.landmarks;
    const sw = Math.abs(lm[LM.lShoulder]!.x - lm[LM.rShoulder]!.x) || 1e-3;
    return (lm[LM.lHip]!.x + lm[LM.rHip]!.x) / 2 / sw;
  },
  secondaryCheck: (samples) =>
    std(samples.map((s) => s.value)) <= 0.25 ? { pass: true } : { pass: false, flag: "control the swing" },
  tempoBand: [2.0, 5.0],
  baseXp: 30,
  depthCue: "chin over the bar",
  debugLabel: "elbow (both arms)",
};

export const EXERCISE_CONFIGS: Record<Exercise, ExerciseConfig> = {
  squat: SQUAT,
  pushup: PUSHUP,
  pullup: PULLUP,
};

/** Returns a copy of a config with tuned thresholds (debug HUD sliders). */
export function tune(cfg: ExerciseConfig, patch: Partial<Pick<ExerciseConfig, "topDeg" | "bottomDeg" | "tempoBand">>): ExerciseConfig {
  return { ...cfg, ...patch };
}
