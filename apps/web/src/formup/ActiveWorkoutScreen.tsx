import { EXERCISE_CONFIGS, levelFor, scoreSet, type Exercise, type RepEvent } from "@rep-rally/shared";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { DebugHud } from "../components/DebugHud";
import { useLiveSet } from "../engine/useLiveSet";
import type { Me } from "../lib/api";
import { api } from "../lib/api";
import { navigate } from "../lib/router";
import { CameraSource, VideoFileSource } from "../vision/sources";
import { NoVideoSource } from "../vision/syntheticProvider";
import type { FrameSource } from "../vision/types";
import { ScreenHeader } from "./components";
import type { RewardPayload, WorkoutOption } from "./data";

type SourceChoice = "camera" | "file" | "synthetic";

export function ActiveWorkoutScreen({ workout, me, offline, level, onDone }: {
  workout: WorkoutOption;
  me: Me | null;
  offline: boolean;
  level: number;
  onDone: (reward: RewardPayload) => void;
}) {
  if (!workout.tracked || !workout.engine) {
    return <SimulatedSet workout={workout} level={level} onDone={onDone} />;
  }
  return <TrackedSet workout={workout} exercise={workout.engine} me={me} offline={offline} level={level} onDone={onDone} />;
}

function TrackedSet({ workout, exercise, me, offline, level, onDone }: {
  workout: WorkoutOption;
  exercise: Exercise;
  me: Me | null;
  offline: boolean;
  level: number;
  onDone: (reward: RewardPayload) => void;
}) {
  const cfg = EXERCISE_CONFIGS[exercise];
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [choice, setChoice] = useState<SourceChoice | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [debug, setDebug] = useState(false);
  const [aspect, setAspect] = useState(3 / 4);
  const [finishing, setFinishing] = useState(false);
  const session = useRef<Promise<string | null> | null>(null);
  const [pending, setPending] = useState<{ src: FrameSource; providerId: string } | null>(null);

  const live = useLiveSet({ exercise, angleMode: "world", videoRef, canvasRef });
  const startRef = useRef(live.start);
  startRef.current = live.start;

  const begin = (c: SourceChoice, file?: File) => {
    setChoice(c);
    const src: FrameSource = c === "camera" ? new CameraSource(facing) : c === "file" ? new VideoFileSource(file!) : new NoVideoSource();
    setAspect(c === "synthetic" ? 1 : 3 / 4);
    const sourceKind = c === "file" ? "video_file" : "live";
    session.current = !me || offline
      ? Promise.resolve(null)
      : api.startSession(exercise, sourceKind).then((r) => r.sessionId).catch(() => null);
    setPending({ src, providerId: c === "synthetic" ? "synthetic" : "mediapipe" });
  };

  useEffect(() => {
    if (!pending || !videoRef.current || !canvasRef.current) return;
    void startRef.current(pending.src, pending.providerId);
    setPending(null);
  }, [pending]);

  const finish = async () => {
    if (finishing) return;
    setFinishing(true);
    const reps = live.end();
    const breakdownLocal = scoreSet({
      exercise, reps, streakDays: me?.streakDays ?? 0, dailyShowEligible: !me?.doneToday,
    });
    const sid = await session.current;
    let saved = false;
    let xp = breakdownLocal.totalXp;
    let levelBefore = me?.level ?? level;
    let levelAfter = me ? levelFor(me.totalXp + xp).level : levelBefore;
    let note = me
      ? "Scored on this device. The crew server did not keep this set."
      : "Scored on this device. Join a crew to save XP.";
    const scripted = choice === "synthetic";
    if (sid && !scripted) {
      try {
        const r = await api.completeSession(sid, reps);
        saved = true;
        xp = r.breakdown.totalXp;
        levelBefore = r.levelBefore.level;
        levelAfter = r.levelAfter.level;
        note = r.crewNotified
          ? `Saved. Crew notified (${r.crewNotified}).`
          : "Saved to your crew.";
      } catch (e) {
        console.warn("complete failed, scoring locally", e);
        note = "Server save failed. This XP was scored on device only.";
        levelAfter = me ? levelFor(me.totalXp + xp).level : levelBefore;
      }
    } else if (scripted) {
      note = "Synthetic demo. The rep counter is real; the poses are scripted. Not saved.";
    } else if (offline && me) {
      note = "Offline. This XP was scored on device and was not saved.";
    }
    onDone(toReward(workout, reps, xp, levelBefore, levelAfter, scripted, saved, note, tempoText(reps, cfg.tempoBand)));
  };

  useEffect(() => {
    if (live.status === "ended" && choice === "file" && !finishing) void finish();
  }, [live.status]);

  const s = live.snap;
  const valid = live.reps.filter((r) => r.valid).length;
  const noReps = live.reps.length - valid;
  const preview = scoreSet({ exercise, reps: live.reps, streakDays: me?.streakDays ?? 0, dailyShowEligible: !me?.doneToday });
  const formPct = live.lastRep ? Math.round(live.lastRep.formScore * 100) : null;
  const tempo = live.lastRep ? tempoLabel(live.lastRep.durationS, cfg.tempoBand) : null;
  const paused = s && (s.phase === "paused" || (s.phase === "resume" && s.pauseReason));
  const cue = paused
    ? (s?.pauseReason ?? "Paused")
    : live.lastRep && !live.lastRep.valid
      ? `No rep · ${live.lastRep.flags[0] ?? "check your form"}`
      : s?.phase === "calibrating"
        ? "Hold your start position"
        : live.lastRep?.valid
          ? "Nice rep. Reset and go again."
          : "Step into frame so the coach can see you.";

  return (
    <div>
      <ScreenHeader title={workout.name} level={level} onBack={() => { live.end(); navigate("/workout"); }} />
      <div className="px-4 pt-4">
        <p className="text-[13px] text-formup-muted">{workout.prescription} · {workout.muscles}</p>

        <div className="relative mt-3 overflow-hidden rounded-[28px] bg-black" style={{ aspectRatio: String(aspect), maxHeight: "62vh" }}>
          <video ref={videoRef}
            className={`absolute inset-0 h-full w-full object-cover ${choice === "camera" && facing === "user" ? "-scale-x-100" : ""} ${choice === "synthetic" || !choice ? "hidden" : ""}`}
            playsInline muted
            onLoadedMetadata={(e) => { const v = e.currentTarget; if (v.videoWidth) setAspect(v.videoWidth / v.videoHeight); }} />
          <canvas ref={canvasRef} className={`absolute inset-0 h-full w-full ${choice ? "" : "hidden"}`} />

          {!choice && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#12182c] px-6 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-formup-lav">Camera preview</div>
              <p className="text-[14px] leading-snug text-formup-muted">Video stays on this phone. Only rep numbers are sent.</p>
              <div className="flex w-full gap-2">
                <button type="button" className={`flex-1 rounded-full border px-3 py-2 text-[13px] ${facing === "user" ? "border-formup-lav text-formup-text" : "border-formup-line text-formup-muted"}`} onClick={() => setFacing("user")}>Front</button>
                <button type="button" className={`flex-1 rounded-full border px-3 py-2 text-[13px] ${facing === "environment" ? "border-formup-lav text-formup-text" : "border-formup-line text-formup-muted"}`} onClick={() => setFacing("environment")}>Back</button>
              </div>
              <button type="button" className="w-full rounded-[16px] bg-formup-lav py-3 text-[15px] font-bold text-formup-ink" onClick={() => begin("camera")}>Use camera</button>
              {exercise === "squat" && (
                <button type="button" className="w-full rounded-[16px] border border-formup-line py-3 text-[14px] font-semibold" onClick={() => begin("synthetic")}>Synthetic demo</button>
              )}
              <button type="button" className="text-[13px] text-formup-muted" onClick={() => fileRef.current?.click()}>Use a video clip</button>
              <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && begin("file", e.target.files[0])} />
            </div>
          )}

          {choice && (
            <>
              <div className="absolute left-3 top-3 rounded-2xl bg-black/55 px-3 py-2 backdrop-blur-sm">
                <div className="text-[42px] font-bold leading-none text-formup-mint">{valid}</div>
                <div className="text-[11px] text-white/70">/ {workout.reps} clean{noReps ? ` · ${noReps} no-rep` : ""}</div>
              </div>
              <div className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-formup-mint">
                {choice === "synthetic" ? "Synthetic demo" : choice === "file" ? "Video clip" : "Live camera"}
              </div>
              {live.status === "loading" && <Center>Loading pose model…</Center>}
              {live.status === "error" && <Center><span className="text-[#ffb4c0]">{live.error}</span></Center>}
              {s?.phase === "calibrating" && live.status === "running" && (
                <Center>
                  <div className="text-6xl font-bold text-formup-lav">{Math.max(1, Math.ceil(3 * (1 - s.calibrationProgress)))}</div>
                  <div className="mt-2 px-6 text-sm text-white/80">Hold still to calibrate</div>
                </Center>
              )}
              {(paused || (live.lastRep && !live.lastRep.valid)) && (
                <div className="absolute inset-x-3 bottom-16 rounded-xl bg-black/70 px-3 py-2 text-center text-[13px] font-semibold text-[#ffd7a8]">
                  {cue}
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat k="Form" v={formPct === null ? "—" : `${formPct}%`} />
          <Stat k="Tempo" v={tempo ? tempo.text : "—"} sub={live.lastRep ? `${live.lastRep.durationS.toFixed(1)}s` : undefined} />
          <Stat k="XP" v={`+${preview.totalXp}`} />
        </div>
        {choice && <p className="mt-3 text-center text-[13px] text-formup-muted">{cue}</p>}

        <button type="button" disabled={!choice || finishing || live.status === "loading"}
          onClick={() => void finish()}
          className="mt-4 w-full rounded-[22px] bg-formup-lav py-3.5 text-[16px] font-bold text-formup-ink disabled:opacity-40">
          {finishing ? "Scoring…" : valid >= workout.reps ? "Finish & claim XP" : "End set"}
        </button>
        {choice && choice !== "synthetic" && (
          <button type="button" className="mt-3 w-full text-center text-[12px] text-formup-faint" onClick={() => setDebug((d) => !d)}>
            {debug ? "Hide form debug" : "Form debug"}
          </button>
        )}
        {debug && s && <div className="mt-3"><DebugHud snap={s} cfg={cfg} fps={live.fps} backend={live.backend} angleMode="world" source={choice ?? "camera"} /></div>}
        <p className="mt-4 text-center text-[11px] leading-relaxed text-formup-faint">
          {choice === "synthetic"
            ? "Scripted poses, real rep engine. This set is not saved."
            : "MediaPipe runs in the browser. The server only receives rep events."}
        </p>
      </div>
    </div>
  );
}

function SimulatedSet({ workout, level, onDone }: {
  workout: WorkoutOption;
  level: number;
  onDone: (reward: RewardPayload) => void;
}) {
  const [running, setRunning] = useState(false);
  const [ticks, setTicks] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const plank = workout.id === "plank";

  useEffect(() => {
    if (!running) return;
    // Planks advance one displayed second per tick so a 30s hold doesn't take a real half minute.
    const t = window.setInterval(() => setTicks((n) => n + 1), plank ? 400 : 1800);
    return () => window.clearInterval(t);
  }, [running, plank]);

  const reps = Math.min(workout.reps, plank ? Math.floor(ticks / 30) : ticks);
  useEffect(() => {
    if (running && reps >= workout.reps) setRunning(false);
  }, [running, reps, workout.reps]);

  const credited = plank ? Math.min(workout.reps, Math.floor(ticks / 30) + (ticks % 30 > 0 ? 1 : 0)) : reps;
  const formPct = credited === 0 ? null : plank ? 90 : scriptedForm(credited);
  const xpEach = plank ? 15 : 8;
  const xp = credited * xpEach;
  const holdLeft = plank ? ticks % 30 : 0;

  const finish = () => {
    if (finishing) return;
    setFinishing(true);
    setRunning(false);
    onDone({
      exerciseName: workout.name,
      workoutId: workout.id,
      simulated: true,
      saved: false,
      reps: credited,
      noReps: 0,
      target: workout.reps,
      formPct,
      tempoText: plank ? "Hold" : "In the pocket",
      xp,
      levelBefore: level,
      levelAfter: level,
      note: "Simulated set. No pose model is counting this exercise, and nothing was saved.",
    });
  };

  return (
    <div>
      <ScreenHeader title={workout.name} level={level} onBack={() => navigate("/workout")} />
      <div className="px-4 pt-4">
        <p className="text-[13px] text-formup-muted">{workout.prescription} · {workout.muscles}</p>
        <div className="relative mt-3 flex aspect-[3/4] max-h-[62vh] flex-col items-center justify-center overflow-hidden rounded-[28px] bg-[#12182c] px-6 text-center">
          <div className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#ffd7a8]">Simulated</div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-formup-lav">Camera preview</div>
          <div className="mt-3 text-[64px] font-bold leading-none text-formup-mint">{plank ? credited : reps}</div>
          <div className="mt-1 text-[13px] text-formup-muted">/ {workout.reps} {workout.id === "plank" ? "holds" : "reps"}</div>
          {plank && <div className="mt-3 text-[15px] text-formup-text">Hold {holdLeft}s / 30s</div>}
          <p className="mt-4 max-w-[240px] text-[13px] leading-snug text-formup-faint">
            This movement does not have a pose model yet. The counters below are placeholder data.
          </p>
          {!running && reps === 0 && (
            <button type="button" className="mt-5 w-full rounded-[16px] bg-formup-lav py-3 text-[15px] font-bold text-formup-ink" onClick={() => setRunning(true)}>
              Start simulated set
            </button>
          )}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat k="Form" v={formPct === null ? "—" : `${formPct}%`} />
          <Stat k="Tempo" v={plank ? "Hold" : reps ? "In the pocket" : "—"} />
          <Stat k="XP" v={`+${xp}`} />
        </div>
        <button type="button" disabled={ticks === 0 || finishing} onClick={finish}
          className="mt-4 w-full rounded-[22px] bg-formup-lav py-3.5 text-[16px] font-bold text-formup-ink disabled:opacity-40">
          {finishing ? "Scoring…" : "Finish simulated set"}
        </button>
      </div>
    </div>
  );
}

function Stat({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-formup-line bg-formup-card px-2 py-2.5 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-formup-faint">{k}</div>
      <div className="mt-1 text-[14px] font-bold leading-tight">{v}</div>
      {sub && <div className="text-[11px] text-formup-muted">{sub}</div>}
    </div>
  );
}

function Center({ children }: { children: ReactNode }) {
  return <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 text-center">{children}</div>;
}

function tempoLabel(d: number, band: [number, number]) {
  if (d < band[0]) return { text: "Slow down" };
  if (d > band[1]) return { text: "Pick it up" };
  return { text: "In the pocket" };
}

function scriptedForm(n: number) {
  let sum = 0;
  for (let i = 1; i <= n; i++) sum += i % 4 === 0 ? 72 : 88;
  return Math.round(sum / n);
}

function tempoText(reps: RepEvent[], band: [number, number]) {
  const last = [...reps].reverse().find((r) => r.valid);
  if (!last) return "—";
  return `${tempoLabel(last.durationS, band).text} · ${last.durationS.toFixed(1)}s`;
}

function toReward(
  workout: WorkoutOption,
  reps: RepEvent[],
  xp: number,
  levelBefore: number,
  levelAfter: number,
  simulated: boolean,
  saved: boolean,
  note: string,
  tempo: string,
): RewardPayload {
  const valid = reps.filter((r) => r.valid);
  const formPct = valid.length ? Math.round((valid.reduce((s, r) => s + r.formScore, 0) / valid.length) * 100) : null;
  return {
    exerciseName: workout.name,
    workoutId: workout.id,
    simulated,
    saved,
    reps: valid.length,
    noReps: reps.length - valid.length,
    target: workout.reps,
    formPct,
    tempoText: tempo,
    xp,
    levelBefore,
    levelAfter,
    note,
  };
}
