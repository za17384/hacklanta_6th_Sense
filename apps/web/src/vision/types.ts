import type { PoseFrame } from "@rep-rally/shared";

// ── Computer-vision plug-in boundary (browser side) ──────────────────────────
//
//   FrameSource ──video element──▶ PoseProvider ──PoseFrame──▶ RepEngine (shared)
//
// To swap the model (MoveNet, YOLO-pose, a WebGPU custom model…), implement
// PoseProvider and register it in ./registry.ts. Nothing else changes.
// Video never leaves the device: providers run in the browser and return numbers.

export interface PoseProviderInfo {
  id: string;
  label: string;
  /** e.g. "GPU", "CPU", "synthetic" — shown in the debug HUD. */
  backend: string;
}

export interface PoseProvider {
  readonly info: PoseProviderInfo;
  init(opts: { mobile: boolean }): Promise<void>;
  /** Run inference for the current video frame. Return null if no person found. */
  detect(video: HTMLVideoElement, timestampMs: number): PoseFrame | null;
  close(): void;
}

export type FrameSourceKind = "camera" | "video_file" | "synthetic";

export interface FrameSource {
  readonly kind: FrameSourceKind;
  /** Attach to the given <video> and start playing. */
  start(video: HTMLVideoElement): Promise<void>;
  stop(): void;
  /** True once a finite source (video file) has finished. */
  ended?(): boolean;
}
