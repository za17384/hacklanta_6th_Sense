import type { Landmark, PoseFrame } from "./types";

export type AngleMode = "world" | "2d";

interface P { x: number; y: number; z: number }

/** Returns the point used for angle math. 2D mode stretches x by the aspect ratio so angles aren't skewed. */
export function point(frame: PoseFrame, i: number, mode: AngleMode): P {
  if (mode === "world" && frame.world) {
    const w = frame.world[i]!;
    return { x: w.x, y: w.y, z: w.z };
  }
  const l = frame.landmarks[i]!;
  return { x: l.x * frame.aspect, y: l.y, z: 0 };
}

/** Angle ABC at vertex B, in degrees [0, 180]. */
export function angleAt(a: P, b: P, c: P): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const v2 = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const n = Math.hypot(v1.x, v1.y, v1.z) * Math.hypot(v2.x, v2.y, v2.z);
  if (n === 0) return 180;
  return (Math.acos(Math.max(-1, Math.min(1, dot / n))) * 180) / Math.PI;
}

export function jointAngle(frame: PoseFrame, a: number, b: number, c: number, mode: AngleMode): number {
  return angleAt(point(frame, a, mode), point(frame, b, mode), point(frame, c, mode));
}

/** Angle of the vector from→to measured from image vertical, in degrees [0, 180]. Uses 2D image space. */
export function angleFromVertical(frame: PoseFrame, from: number, to: number): number {
  const a = point(frame, from, "2d");
  const b = point(frame, to, "2d");
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return (Math.atan2(Math.abs(dx), -dy) * 180) / Math.PI;
}

export function minVisibility(lms: Landmark[], idx: readonly number[]): number {
  let m = 1;
  for (const i of idx) m = Math.min(m, lms[i]?.visibility ?? 0);
  return m;
}

export function avgVisibility(lms: Landmark[], idx: readonly number[]): number {
  if (idx.length === 0) return 0;
  return idx.reduce((s, i) => s + (lms[i]?.visibility ?? 0), 0) / idx.length;
}

/** Exponential moving average. alpha≈0.4 per spec. */
export class Ema {
  private v: number | null = null;
  constructor(private alpha = 0.4) {}
  next(x: number): number {
    this.v = this.v === null ? x : this.alpha * x + (1 - this.alpha) * this.v;
    return this.v;
  }
  reset() { this.v = null; }
}

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function std(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
