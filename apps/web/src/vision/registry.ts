import { MediaPipePoseProvider } from "./mediapipeProvider";
import { SyntheticPoseProvider } from "./syntheticProvider";
import type { PoseProvider } from "./types";

// Register pose models here. The On Stage screen lists these in the debug HUD.
export const POSE_PROVIDERS: Record<string, { label: string; create: () => PoseProvider }> = {
  mediapipe: { label: "MediaPipe Pose (on-device)", create: () => new MediaPipePoseProvider() },
  synthetic: { label: "Synthetic squatter (no camera)", create: () => new SyntheticPoseProvider() },
};

export const isMobile = () => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
