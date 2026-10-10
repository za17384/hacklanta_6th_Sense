import type { ExerciseConfig, SecondarySample } from "./exercises";
import { Ema, avgVisibility, jointAngle, median, minVisibility, std, type AngleMode } from "./geometry";
import type { PoseFrame, RepEvent, Side } from "./types";

// Generic, config-driven rep state machine. Pure TypeScript: no DOM, no model.
// Feed it PoseFrames, it emits RepEvents. Used live in the browser and in tests.

export type RepPhase =
  | "calibrating" // holding the start position for CALIBRATION_MS
  | "ready"       // at lockout, waiting for the next rep
  | "down"        // inside a rep
  | "resume"      // visible again after a pause, waiting to see lockout before counting
  | "paused";     // key joints not visible — counting stopped

export interface RepEngineOptions {
  angleMode?: AngleMode;
  emaAlpha?: number;
  minVisibility?: number;
  calibrationMs?: number;
  /** Skip calibration (tests / video-file mode can still use it). */
  skipCalibration?: boolean;
  /** Wall-clock epoch ms corresponding to frame.t = 0, for RepEvent.ts. */
  epochOffsetMs?: number;
}

export interface EngineSnapshot {
  phase: RepPhase;
  side: Side;
  angle: number | null;
  rawAngle: number | null;
  visibility: number;
  calibrationProgress: number; // 0..1
  lockoutDeg: number;
  startDeg: number;
  validReps: number;
  noReps: number;
  pauseReason?: string;
  secondaryValue: number | null;
}

const START_MARGIN = 15; // rep starts below lockout − 15° (spec)
const END_MARGIN = 5;    // HEURISTIC: rep ends within 5° of lockout so a slightly soft lockout doesn't stall counting
const MIN_REP_S = 0.5;   // jitter filter (spec)

export class RepEngine {
  readonly cfg: ExerciseConfig;
  private o: Required<RepEngineOptions>;
  private ema: Ema;
  phase: RepPhase;
  side: Side = "left";
  private lockoutDeg: number;

  private calibStart: number | null = null;
  private calibAngles: number[] = [];

  // current rep
  private repStartT = 0;
  private repMin = 180;
  private repMinT = 0;
  private depthHit = false;
  private samples: SecondarySample[] = [];
  /** Highest angle seen at the top before the current rep (for lockoutPass). */
  private topPeak = 0;

  private reps: RepEvent[] = [];
  private curT = 0;
  private last: EngineSnapshot;
  private listeners: ((r: RepEvent) => void)[] = [];

  constructor(cfg: ExerciseConfig, opts: RepEngineOptions = {}) {
    this.cfg = cfg;
    this.o = {
      angleMode: opts.angleMode ?? "world",
      emaAlpha: opts.emaAlpha ?? 0.4,
      minVisibility: opts.minVisibility ?? 0.5,
      calibrationMs: opts.calibrationMs ?? 3000,
      skipCalibration: opts.skipCalibration ?? false,
      epochOffsetMs: opts.epochOffsetMs ?? 0,
    };
    this.ema = new Ema(this.o.emaAlpha);
    this.lockoutDeg = cfg.topDeg;
    this.phase = this.o.skipCalibration ? "resume" : "calibrating";
    this.last = this.snapshot(null, null, 0, null);
  }

  onRep(fn: (r: RepEvent) => void) { this.listeners.push(fn); }
  get events(): readonly RepEvent[] { return this.reps; }
  get state(): EngineSnapshot { return this.last; }

  /** Process one frame. Returns the RepEvent if a rep completed on this frame. */
  push(frame: PoseFrame | null): RepEvent | null {
    if (frame) this.curT = frame.t;
    if (!frame || frame.landmarks.length < 33) {
      this.pause(frame?.t ?? 0, "Step into frame — I can't see you");
      return null;
    }

    if (this.phase === "calibrating" && !this.cfg.bilateral) this.side = this.pickSide(frame);

    const vis = minVisibility(frame.landmarks, this.visJoints());
    if (vis < this.o.minVisibility) {
      this.pause(frame.t, this.cfg.id === "pullup"
        ? "Step back — I need to see your head, arms and hips"
        : this.cfg.id === "pushup"
          ? "Step back — I need to see you head to heels"
          : "Step back — I need to see your hips and knees");
      this.last = { ...this.last, visibility: vis };
      return null;
    }

    const raw = this.primaryAngle(frame);
    const a = this.ema.next(raw);
    const sec = this.cfg.secondarySample(frame, this.side, this.o.angleMode);
    let emitted: RepEvent | null = null;

    switch (this.phase) {
      case "paused":
        this.phase = "resume";
      // falls through
      case "resume":
        if (a >= this.lockoutDeg - END_MARGIN) { this.phase = "ready"; this.topPeak = a; }
        break;

      case "calibrating": {
        // Hold near lockout and still. HEURISTIC: within 10° of config lockout, std < 4°.
        if (a >= this.cfg.topDeg - 10) {
          this.calibStart ??= frame.t;
          this.calibAngles.push(a);
          if (this.calibAngles.length > 10 && std(this.calibAngles.slice(-10)) > 4) {
            this.calibStart = frame.t; this.calibAngles = [a];
          }
          if (frame.t - this.calibStart >= this.o.calibrationMs) {
            // Personal lockout: never stricter than the config, a little under what the user showed.
            this.lockoutDeg = Math.min(this.cfg.topDeg, median(this.calibAngles) - 3);
            this.phase = "ready";
            this.topPeak = a;
          }
        } else {
          this.calibStart = null; this.calibAngles = [];
        }
        break;
      }

      case "ready":
        this.topPeak = Math.max(this.topPeak, a);
        if (a < this.lockoutDeg - START_MARGIN) {
          this.phase = "down";
          this.repStartT = frame.t;
          this.repMin = a; this.repMinT = frame.t;
          this.depthHit = false;
          this.samples = [];
        }
        break;

      case "down":
        if (a < this.repMin) { this.repMin = a; this.repMinT = frame.t; }
        if (this.cfg.depthReached ? this.cfg.depthReached(frame, this.side, a) : a <= this.cfg.bottomDeg) {
          if (!this.depthHit) this.repMinT = frame.t;
          this.depthHit = true;
        }
        this.samples.push({ angle: a, value: sec });
        if (a >= this.lockoutDeg - END_MARGIN) {
          emitted = this.finishRep(frame.t);
          this.phase = "ready";
          this.topPeak = a;
        }
        break;
    }

    this.last = this.snapshot(a, raw, vis, sec);
    return emitted;
  }

  private finishRep(t: number): RepEvent | null {
    const durationS = (t - this.repStartT) / 1000;
    if (durationS < MIN_REP_S) return null; // jitter, ignored entirely

    const depthPass = this.depthHit;
    const lockoutPass = this.topPeak >= this.lockoutDeg;
    const secondary = this.cfg.secondaryCheck(this.samples);
    const formScore = 0.6 * +depthPass + 0.2 * +lockoutPass + 0.2 * +secondary.pass;
    const flags: string[] = [];
    if (!depthPass) flags.push(this.cfg.depthCue);
    if (!secondary.pass && secondary.flag) flags.push(secondary.flag);
    if (!lockoutPass) flags.push("lock out at the top");

    const ev: RepEvent = {
      repIndex: this.reps.length,
      ts: Math.round(this.o.epochOffsetMs + this.repStartT),
      durationS: round2(durationS),
      eccentricS: round2((this.repMinT - this.repStartT) / 1000),
      concentricS: round2((t - this.repMinT) / 1000),
      minAngleDeg: Math.round(this.repMin),
      valid: depthPass && formScore >= 0.6,
      formScore: round2(formScore),
      depthPass,
      lockoutPass,
      secondaryPass: secondary.pass,
      flags,
    };
    this.reps.push(ev);
    for (const l of this.listeners) l(ev);
    return ev;
  }

  private pause(t: number, reason: string) {
    if (this.phase === "calibrating") {
      this.calibStart = null; this.calibAngles = [];
    } else {
      this.phase = "paused"; // an in-progress rep is discarded
    }
    this.ema.reset();
    this.curT = t;
    this.last = { ...this.last, phase: this.phase, pauseReason: reason, angle: null, rawAngle: null };
  }

  private visJoints(): number[] {
    return this.cfg.bilateral
      ? [...new Set([...this.cfg.keyJoints.left, ...this.cfg.keyJoints.right])]
      : this.cfg.keyJoints[this.side];
  }

  private pickSide(f: PoseFrame): Side {
    const l = avgVisibility(f.landmarks, this.cfg.keyJoints.left);
    const r = avgVisibility(f.landmarks, this.cfg.keyJoints.right);
    // hysteresis so the side doesn't flicker
    if (this.side === "left" && r > l + 0.1) return "right";
    if (this.side === "right" && l > r + 0.1) return "left";
    return this.side;
  }

  private primaryAngle(f: PoseFrame): number {
    const m = this.o.angleMode;
    const ang = (s: Side) => { const [a, b, c] = this.cfg.primary[s]; return jointAngle(f, a, b, c, m); };
    return this.cfg.bilateral ? (ang("left") + ang("right")) / 2 : ang(this.side);
  }

  private snapshot(angle: number | null, raw: number | null, vis: number, sec: number | null): EngineSnapshot {
    return {
      phase: this.phase,
      side: this.side,
      angle,
      rawAngle: raw,
      visibility: vis,
      calibrationProgress: this.phase === "calibrating"
        ? Math.min(1, this.calibStart === null || angle === null ? 0 : (this.curT - this.calibStart) / this.o.calibrationMs)
        : 1,
      lockoutDeg: this.lockoutDeg,
      startDeg: this.lockoutDeg - START_MARGIN,
      validReps: this.reps.filter((r) => r.valid).length,
      noReps: this.reps.filter((r) => !r.valid).length,
      secondaryValue: sec,
    };
  }
}

const round2 = (x: number) => Math.round(x * 100) / 100;
