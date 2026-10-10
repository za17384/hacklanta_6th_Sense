import { EXERCISE_CONFIGS, RepEngine, type AngleMode, type EngineSnapshot, type Exercise, type RepEvent } from "@rep-rally/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { drawBackdrop, drawOverlay } from "../vision/overlay";
import { POSE_PROVIDERS, isMobile } from "../vision/registry";
import type { FrameSource, PoseProvider } from "../vision/types";

// Glue between the vision plug-ins and the shared rep engine:
//   FrameSource → PoseProvider.detect() → RepEngine.push() → overlay + React state
// Runs every animation frame; React state is updated at ~15 Hz to keep it light.

export type LiveStatus = "idle" | "loading" | "running" | "ended" | "error";

export interface LiveSet {
  status: LiveStatus;
  error: string | null;
  snap: EngineSnapshot | null;
  reps: RepEvent[];
  lastRep: RepEvent | null;
  fps: number;
  backend: string;
  start(source: FrameSource, providerId: string): Promise<void>;
  end(): RepEvent[];
}

export function useLiveSet(opts: {
  exercise: Exercise;
  angleMode: AngleMode;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onRep?: (r: RepEvent) => void;
}): LiveSet {
  const { exercise, angleMode, videoRef, canvasRef } = opts;
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [snap, setSnap] = useState<EngineSnapshot | null>(null);
  const [reps, setReps] = useState<RepEvent[]>([]);
  const [lastRep, setLastRep] = useState<RepEvent | null>(null);
  const [fps, setFps] = useState(0);
  const [backend, setBackend] = useState("");

  const raf = useRef(0);
  const provider = useRef<PoseProvider | null>(null);
  const source = useRef<FrameSource | null>(null);
  const engine = useRef<RepEngine | null>(null);
  const onRepRef = useRef(opts.onRep);
  onRepRef.current = opts.onRep;

  const stopLoop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    source.current?.stop();
    provider.current?.close();
    source.current = null;
    provider.current = null;
  }, []);

  useEffect(() => stopLoop, [stopLoop]);

  const start = useCallback(async (src: FrameSource, providerId: string) => {
    stopLoop();
    setStatus("loading"); setError(null); setReps([]); setLastRep(null);
    const cfg = EXERCISE_CONFIGS[exercise];
    // Clips may not open with a 3 s hold, so they skip calibration and wait for a lockout instead.
    const eng = new RepEngine(cfg, { angleMode, epochOffsetMs: Date.now() - performance.now(), skipCalibration: src.kind === "video_file" });
    engine.current = eng;
    eng.onRep((r) => {
      setReps((xs) => [...xs, r]);
      setLastRep(r);
      onRepRef.current?.(r);
    });

    try {
      const entry = POSE_PROVIDERS[providerId] ?? POSE_PROVIDERS.mediapipe!;
      const p = entry.create();
      await p.init({ mobile: isMobile() });
      provider.current = p;
      setBackend(p.info.backend);
      const video = videoRef.current!;
      await src.start(video);
      source.current = src;
    } catch (e) {
      setError((e as Error).message || String(e));
      setStatus("error");
      stopLoop();
      return;
    }

    setStatus("running");
    let frames = 0, fpsT = performance.now(), uiT = 0;
    const mirror = src.kind === "camera";
    let badUntil = 0;
    eng.onRep((r) => { if (!r.valid) badUntil = performance.now() + 700; });

    const loop = () => {
      const now = performance.now();
      const video = videoRef.current, canvas = canvasRef.current;
      if (!video || !canvas || !provider.current) return;
      // Match canvas to its displayed size (crisp lines on phones).
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(rect.width * dpr)) { canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr); }
      const ctx = canvas.getContext("2d")!;

      const frame = provider.current.detect(video, now);
      eng.push(frame);
      const s = eng.state;
      if (src.kind === "synthetic") drawBackdrop(ctx);
      drawOverlay(ctx, frame, {
        cfg, side: s.side, mirror, angle: s.angle, clear: src.kind !== "synthetic",
        tone: now < badUntil ? "bad" : s.phase === "down" && s.angle !== null && s.angle <= cfg.bottomDeg ? "ok" : "idle",
      });

      frames++;
      if (now - fpsT > 1000) { setFps(Math.round((frames * 1000) / (now - fpsT))); frames = 0; fpsT = now; }
      if (now - uiT > 66) { setSnap(s); uiT = now; }
      if (src.ended?.()) { setSnap(eng.state); setStatus("ended"); return; }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  }, [exercise, angleMode, videoRef, canvasRef, stopLoop]);

  const end = useCallback(() => {
    stopLoop();
    setStatus("ended");
    return [...(engine.current?.events ?? [])];
  }, [stopLoop]);

  return { status, error, snap, reps, lastRep, fps, backend, start, end };
}
