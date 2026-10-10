// ── Computer-vision plug-in boundary ─────────────────────────────────────────
// Any pose model (MediaPipe today; MoveNet/YOLO-pose/etc. later) only has to
// produce a PoseFrame. Everything downstream (rep engine, scoring, overlay)
// consumes this shape and never touches the model directly.

export type Exercise = "squat" | "pushup" | "pullup";
export const EXERCISES: Exercise[] = ["squat", "pushup", "pullup"];

/** One landmark. x/y normalized to [0,1] of the image (y down). */
export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface PoseFrame {
  /** Frame timestamp in milliseconds (monotonic). */
  t: number;
  /** 33 BlazePose-topology landmarks in normalized image coordinates. */
  landmarks: Landmark[];
  /** Optional 33 landmarks in meters (MediaPipe worldLandmarks). */
  world?: Landmark[];
  /** Image width / height, used to aspect-correct 2D angles. */
  aspect: number;
}

/** BlazePose landmark indices used by Rep Rally. */
export const LM = {
  nose: 0,
  lShoulder: 11, rShoulder: 12,
  lElbow: 13, rElbow: 14,
  lWrist: 15, rWrist: 16,
  lHip: 23, rHip: 24,
  lKnee: 25, rKnee: 26,
  lAnkle: 27, rAnkle: 28,
} as const;

export type Side = "left" | "right";

// ── Rep events (the only thing that ever leaves the device) ─────────────────

export interface RepEvent {
  repIndex: number;
  /** Epoch ms when the rep started. */
  ts: number;
  durationS: number;
  eccentricS: number;
  concentricS: number;
  minAngleDeg: number;
  valid: boolean;
  formScore: number;
  depthPass: boolean;
  lockoutPass: boolean;
  secondaryPass: boolean;
  /** Human-readable cues, e.g. "go deeper", "chest up". First one is the no-rep reason. */
  flags: string[];
}

export type SessionSource = "live" | "video_file" | "seed";

export type MessageKind = "welcome" | "completion" | "reminder" | "streak_risk" | "reply" | "nudge";

export type XpSource = "rep" | "set_bonus" | "streak_bonus" | "daily_show";

export interface XpLedgerRow {
  source: XpSource;
  amount: number;
  /** rep_index for 'rep' rows, for display only. */
  repIndex?: number;
}
