import { EXERCISE_CONFIGS, scoreSet, type AngleMode, type Exercise, type RepEvent } from "@rep-rally/shared";
import { useEffect, useRef, useState } from "react";
import { DebugHud } from "../components/DebugHud";
import { useLiveSet } from "../engine/useLiveSet";
import { api, type Me } from "../lib/api";
import { navigate } from "../lib/router";
import { CameraSource, VideoFileSource } from "../vision/sources";
import { NoVideoSource } from "../vision/syntheticProvider";
import type { FrameSource } from "../vision/types";
import type { EncoreData } from "./Encore";

type SourceChoice = "camera" | "file" | "synthetic";

export function OnStage({ exercise, me, offline, onDone }: {
  exercise: Exercise; me: Me | null; offline: boolean; onDone: (d: EncoreData) => void;
}) {
  const cfg = EXERCISE_CONFIGS[exercise];
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [choice, setChoice] = useState<SourceChoice | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [angleMode, setAngleMode] = useState<AngleMode>("world");
  const [debug, setDebug] = useState(true);
  const [hype, setHype] = useState(0);
  const [aspect, setAspect] = useState(3 / 4);
  const [finishing, setFinishing] = useState(false);
  const session = useRef<Promise<string | null> | null>(null);
  const sourceKind = useRef<"live" | "video_file">("live");

  const [pending, setPending] = useState<{ src: FrameSource; providerId: string } | null>(null);
  const live = useLiveSet({
    exercise, angleMode, videoRef, canvasRef,
    onRep: (r) => setHype((h) => Math.max(0, Math.min(100, h + (r.valid ? 12 : -10)))),
  });

  // Hype slowly cools off between reps.
  useEffect(() => {
    if (live.status !== "running") return;
    const t = setInterval(() => setHype((h) => Math.max(0, h - 1)), 400);
    return () => clearInterval(t);
  }, [live.status]);

  const begin = async (c: SourceChoice, file?: File) => {
    setChoice(c);
    const src: FrameSource = c === "camera" ? new CameraSource(facing) : c === "file" ? new VideoFileSource(file!) : new NoVideoSource();
    sourceKind.current = c === "file" ? "video_file" : "live";
    setAspect(c === "synthetic" ? 1 : 3 / 4);
    session.current = !me || offline ? Promise.resolve(null)
      : api.startSession(exercise, sourceKind.current).then((r) => r.sessionId).catch(() => null);
    setPending({ src, providerId: c === "synthetic" ? "synthetic" : "mediapipe" });
  };

  // Start once the <video>/<canvas> for the chosen source are mounted.
  useEffect(() => {
    if (!pending || !videoRef.current || !canvasRef.current) return;
    void live.start(pending.src, pending.providerId);
    setPending(null);
  }, [pending]);

  const finish = async () => {
    if (finishing) return;
    setFinishing(true);
    const reps: RepEvent[] = live.end();
    const sid = await session.current;
    if (sid) {
      try {
        const r = await api.completeSession(sid, reps);
        return onDone({ exercise, reps, ...r, offline: false });
      } catch (e) {
        console.warn("complete failed, scoring locally", e);
      }
    }
    // Local fallback: same scoring code, labelled as unofficial.
    const breakdown = scoreSet({ exercise, reps, streakDays: me?.streakDays ?? 0, dailyShowEligible: !me?.doneToday });
    onDone({ exercise, reps, breakdown, offline: true });
  };

  // Video files end on their own.
  useEffect(() => { if (live.status === "ended" && choice === "file" && !finishing) void finish(); }, [live.status]);

  const s = live.snap;
  const valid = live.reps.filter((r) => r.valid).length;
  const noReps = live.reps.length - valid;
  const tempo = live.lastRep ? tempoLabel(live.lastRep.durationS, cfg.tempoBand) : null;
  const paused = s && (s.phase === "paused" || (s.phase === "resume" && s.pauseReason));

  if (!choice) {
    return (
      <div className="space-y-4 px-4 py-6">
        <button className="text-sm text-white/60" onClick={() => navigate("/")}>← Backstage</button>
        <h1 className="title text-3xl">{cfg.label}</h1>
        <p className="card text-sm text-white/80">📷 {cfg.cameraTip}</p>
        <div className="grid gap-3">
          <div className="card space-y-3">
            <div className="flex gap-2">
              <button className={`btn-ghost flex-1 text-sm ${facing === "user" ? "border-neon-cyan" : ""}`} onClick={() => setFacing("user")}>Front cam</button>
              <button className={`btn-ghost flex-1 text-sm ${facing === "environment" ? "border-neon-cyan" : ""}`} onClick={() => setFacing("environment")}>Back cam</button>
            </div>
            <button className="btn-primary w-full text-lg" onClick={() => begin("camera")}>🎤 Take the stage (camera)</button>
          </div>
          <button className="btn-ghost" onClick={() => fileRef.current?.click()}>🎞️ Use a video clip instead</button>
          <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && begin("file", e.target.files[0])} />
          {exercise === "squat" && <button className="btn-ghost text-sm text-white/60" onClick={() => begin("synthetic")}>🤖 Synthetic test (no camera)</button>}
        </div>
        <label className="flex items-center gap-2 text-xs text-white/50">
          Angle source:
          <select className="rounded bg-stage-800 px-2 py-1" value={angleMode} onChange={(e) => setAngleMode(e.target.value as AngleMode)}>
            <option value="world">3D world landmarks</option>
            <option value="2d">2D (aspect-corrected)</option>
          </select>
        </label>
        <p className="text-xs text-white/40">Video stays on this device. Only rep numbers are sent.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col gap-3 px-2 py-3">
      <div className="relative mx-auto w-full overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: String(aspect), maxHeight: "72vh" }}>
        <video ref={videoRef} className={`absolute inset-0 h-full w-full object-fill ${choice === "camera" && facing === "user" ? "-scale-x-100" : ""} ${choice === "synthetic" ? "hidden" : ""}`}
          playsInline muted onLoadedMetadata={(e) => { const v = e.currentTarget; if (v.videoWidth) setAspect(v.videoWidth / v.videoHeight); }} />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        {/* Rep counter */}
        <div className="absolute left-3 top-3 rounded-2xl bg-black/50 px-4 py-2 backdrop-blur">
          <div className="title text-6xl leading-none text-neon-lime">{valid}</div>
          <div className="text-xs text-white/70">clean reps{noReps ? <span className="text-red-400"> · {noReps} no-rep</span> : null}</div>
        </div>

        {/* Hype meter */}
        <div className="absolute right-3 top-3 bottom-3 flex w-4 flex-col-reverse overflow-hidden rounded-full bg-black/50">
          <div className="w-full rounded-full bg-gradient-to-t from-neon-pink via-neon-amber to-neon-lime transition-all duration-300" style={{ height: `${hype}%` }} />
        </div>
        <div className="absolute bottom-3 right-9 text-[10px] uppercase tracking-widest text-white/60">crowd</div>

        {live.status === "loading" && <Center>Loading pose model…</Center>}
        {live.status === "error" && <Center><span className="text-red-300">{live.error}</span></Center>}
        {s?.phase === "calibrating" && live.status === "running" && (
          <Center>
            <div className="title text-7xl text-neon-cyan">{Math.max(1, Math.ceil(3 * (1 - s.calibrationProgress)))}</div>
            <div className="mt-2 px-6 text-sm">
              {s.angle === null && s.pauseReason
                ? <span className="text-neon-amber">{s.pauseReason}</span>
                : <>Hold your start position ({exercise === "pullup" ? "dead hang" : exercise === "pushup" ? "arms locked" : "standing tall"})</>}
            </div>
          </Center>
        )}
        {paused && (
          <div className="absolute inset-x-3 bottom-3 rounded-xl bg-neon-amber/90 px-4 py-2 text-center font-semibold text-black">
            ⏸ {s!.pauseReason ?? "Paused"}
          </div>
        )}
        {live.lastRep && !live.lastRep.valid && (
          <div key={live.lastRep.repIndex} className="absolute inset-x-0 top-1/3 animate-pop text-center">
            <span className="title rounded-xl bg-red-500/90 px-4 py-2 text-2xl">NO REP: {live.lastRep.flags[0]}</span>
          </div>
        )}
      </div>

      {/* Rep chips + tempo */}
      <div className="flex flex-wrap gap-1.5 px-1">
        {live.reps.slice(-14).map((r) => (
          <span key={r.repIndex} className={`animate-pop rounded-full px-2.5 py-1 text-xs font-semibold ${r.valid ? "bg-neon-lime/20 text-neon-lime" : "bg-red-500/20 text-red-300"}`}>
            {r.valid ? `✓ ${r.repIndex + 1}` : `✗ ${r.flags[0]}`}{r.valid && r.flags.length ? ` · ${r.flags[0]}` : ""}
          </span>
        ))}
        {tempo && <span className={`ml-auto rounded-full px-2.5 py-1 text-xs ${tempo.ok ? "bg-neon-cyan/15 text-neon-cyan" : "bg-neon-amber/15 text-neon-amber"}`}>⏱ {live.lastRep!.durationS.toFixed(1)}s · {tempo.text}</span>}
      </div>

      <div className="flex gap-2 px-1">
        <button className="btn-primary flex-1 text-lg" onClick={finish} disabled={finishing || live.status === "loading"}>
          {finishing ? "Scoring…" : "End set 🎤"}
        </button>
        <button className="btn-ghost" onClick={() => setDebug((d) => !d)}>{debug ? "Hide" : "Debug"}</button>
      </div>

      {debug && s && <DebugHud snap={s} cfg={cfg} fps={live.fps} backend={live.backend} angleMode={angleMode} source={choice} />}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-center">{children}</div>;
}

function tempoLabel(d: number, [lo, hi]: [number, number]) {
  if (d < lo) return { ok: false, text: "slow it down" };
  if (d > hi) return { ok: false, text: "pick it up" };
  return { ok: true, text: "in the pocket" };
}
