import type { AngleMode, EngineSnapshot, ExerciseConfig } from "@rep-rally/shared";

// What the computer-vision judges want to see: live joint angles, thresholds,
// visibility and the state-machine phase.

export function DebugHud({ snap, cfg, fps, backend, angleMode, source }: {
  snap: EngineSnapshot; cfg: ExerciseConfig; fps: number; backend: string; angleMode: AngleMode; source: string;
}) {
  const a = snap.angle;
  const pct = (x: number) => `${Math.max(0, Math.min(100, (x / 180) * 100))}%`;
  return (
    <div className="card font-mono text-xs">
      <div className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
        <Kv k="phase" v={snap.phase} hi />
        <Kv k="side" v={cfg.bilateral ? "both" : snap.side} />
        <Kv k="fps" v={String(fps)} />
        <Kv k="model" v={backend || "…"} />
        <Kv k="angle src" v={angleMode} />
        <Kv k="input" v={source} />
        <Kv k="min vis" v={snap.visibility.toFixed(2)} warn={snap.visibility < 0.5} />
        <Kv k="secondary" v={snap.secondaryValue === null ? "–" : snap.secondaryValue.toFixed(2)} />
      </div>
      <div className="mb-4 flex justify-between text-white/60">
        <span>{cfg.debugLabel}</span>
        <span>raw {snap.rawAngle?.toFixed(0) ?? "–"}° · smooth {a?.toFixed(0) ?? "–"}°</span>
      </div>
      {/* Angle gauge with thresholds: bottom, start, lockout */}
      <div className="relative h-4 rounded bg-white/10">
        {cfg.id !== "pullup" && <Tick at={pct(cfg.bottomDeg)} color="bg-neon-lime" label={`depth ≤${cfg.bottomDeg}`} />}
        <Tick at={pct(snap.startDeg)} color="bg-neon-amber" label={`start <${snap.startDeg.toFixed(0)}`} />
        <Tick at={pct(snap.lockoutDeg)} color="bg-neon-cyan" label={`lockout ≥${snap.lockoutDeg.toFixed(0)}`} above />
        {a !== null && <div className="absolute top-0 h-4 w-1.5 -translate-x-1/2 rounded bg-white shadow-[0_0_8px_white]" style={{ left: pct(a) }} />}
      </div>
      <div className="h-5" />
      <div className="text-white/40">Thresholds are heuristics, tunable in packages/shared/src/exercises.ts. Valid = depth reached and form ≥ 0.6.</div>
    </div>
  );
}

function Kv({ k, v, hi, warn }: { k: string; v: string; hi?: boolean; warn?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-white/40">{k}</span>
      <span className={warn ? "text-red-400" : hi ? "text-neon-cyan" : ""}>{v}</span>
    </div>
  );
}

function Tick({ at, color, label, above }: { at: string; color: string; label: string; above?: boolean }) {
  return (
    <div className="absolute top-0 h-4" style={{ left: at }}>
      <div className={`h-4 w-0.5 ${color}`} />
      <div className={`absolute ${above ? "-top-3.5" : "top-4"} -translate-x-1/2 whitespace-nowrap text-[9px] text-white/50`}>{label}</div>
    </div>
  );
}
