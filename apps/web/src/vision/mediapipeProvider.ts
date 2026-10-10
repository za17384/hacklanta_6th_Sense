import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import type { Landmark, PoseFrame } from "@rep-rally/shared";
import type { PoseProvider, PoseProviderInfo } from "./types";

// MediaPipe Pose Landmarker (BlazePose, 33 landmarks). Model + WASM are served
// from /public (scripts/fetch-models.ts) so the demo works without a CDN.

export class MediaPipePoseProvider implements PoseProvider {
  info: PoseProviderInfo = { id: "mediapipe", label: "MediaPipe Pose Landmarker", backend: "…" };
  private lm: PoseLandmarker | null = null;
  private lastTs = -1;

  async init({ mobile }: { mobile: boolean }) {
    const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
    const model = mobile ? "pose_landmarker_lite" : "pose_landmarker_full";
    const make = (delegate: "GPU" | "CPU") => PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: `/models/${model}.task`, delegate },
      runningMode: "VIDEO",
      numPoses: 1,
    });
    try {
      this.lm = await make("GPU");
      this.info = { ...this.info, backend: `GPU · ${model.replace("pose_landmarker_", "")}` };
    } catch (e) {
      console.warn("[mediapipe] GPU delegate failed, falling back to CPU", e);
      this.lm = await make("CPU");
      this.info = { ...this.info, backend: `CPU · ${model.replace("pose_landmarker_", "")}` };
    }
  }

  detect(video: HTMLVideoElement, ts: number): PoseFrame | null {
    if (!this.lm || video.readyState < 2 || !video.videoWidth) return null;
    // detectForVideo requires strictly increasing timestamps.
    const t = ts <= this.lastTs ? this.lastTs + 1 : ts;
    this.lastTs = t;
    const res = this.lm.detectForVideo(video, t);
    const lms = res.landmarks[0];
    if (!lms) return null;
    const toLm = (p: { x: number; y: number; z: number; visibility?: number }): Landmark => ({ x: p.x, y: p.y, z: p.z, visibility: p.visibility ?? 0 });
    const world = res.worldLandmarks[0];
    return {
      t,
      landmarks: lms.map(toLm),
      // World landmarks don't carry useful visibility; borrow it from the image landmarks.
      world: world?.map((p, i) => ({ ...toLm(p), visibility: lms[i]?.visibility ?? 0 })),
      aspect: video.videoWidth / video.videoHeight,
    };
  }

  close() { this.lm?.close(); this.lm = null; }
}
