import { squatPose, squatScript, type PoseFrame } from "@rep-rally/shared";
import type { FrameSource, PoseProvider } from "./types";

// Fake pose provider: a scripted stick figure doing squats (two shallow).
// For testing the pipeline and demoing on a machine with no camera.
// Clearly labeled "SYNTHETIC" in the UI — never presented as real tracking.

const SCRIPT = [85, 85, 125, 85, 85, 125, 85, 85, 85, 85, 85, 85].map((d) => ({ depthDeg: d, durS: 2.8 }));

export class SyntheticPoseProvider implements PoseProvider {
  info = { id: "synthetic", label: "Synthetic squatter (no camera)", backend: "synthetic" };
  private t0: number | null = null;
  private script = squatScript(SCRIPT);
  async init() {}
  detect(_video: HTMLVideoElement, ts: number): PoseFrame | null {
    this.t0 ??= ts;
    const { knee, lean } = this.script((ts - this.t0) / 1000);
    return squatPose(ts, knee, lean);
  }
  close() { this.t0 = null; }
}

/** Pairs with SyntheticPoseProvider: no video at all. */
export class NoVideoSource implements FrameSource {
  readonly kind = "synthetic" as const;
  async start() {}
  stop() {}
}
