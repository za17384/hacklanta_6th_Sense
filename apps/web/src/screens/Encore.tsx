import { EXERCISE_CONFIGS, type Exercise, type RepEvent, type ScoreBreakdown } from "@rep-rally/shared";
import type { LevelInfo } from "../lib/api";
import { navigate } from "../lib/router";

export interface EncoreData {
  exercise: Exercise;
  reps: RepEvent[];
  breakdown: ScoreBreakdown;
  levelBefore?: LevelInfo;
  levelAfter?: LevelInfo;
  crewNotified?: number;
  /** true = scored on-device only (no server / no crew update). */
  offline: boolean;
}

const LABEL = { rep: "Clean rep", set_bonus: "Consistency bonus", streak_bonus: "Streak boost", daily_show: "Daily show bonus" } as const;

export function Encore({ data }: { data: EncoreData }) {
  const b = data.breakdown;
  const cfg = EXERCISE_CONFIGS[data.exercise];
  const leveledUp = data.levelBefore && data.levelAfter && data.levelAfter.level > data.levelBefore.level;
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const repRows = b.ledger.filter((r) => r.source === "rep");

  return (
    <div className="space-y-4 px-4 py-6 pb-28">
      <div className="text-center">
        <div className="label">Encore</div>
        <h1 className="title text-4xl text-neon-pink">{b.validReps} {cfg.label}</h1>
        {b.noReps > 0 && <div className="text-sm text-red-300">{b.noReps} no-rep{b.noReps > 1 ? "s" : ""}</div>}
      </div>

      {leveledUp && (
        <div className="card animate-pop border-neon-lime/50 bg-neon-lime/10 text-center">
          <div className="text-4xl">🎉</div>
          <div className="title text-2xl text-neon-lime">LEVEL UP — Lv {data.levelAfter!.level}</div>
          <div className="text-white/70">{data.levelAfter!.title}</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat k="Form" v={pct(b.avgForm)} />
        <Stat k="Tempo" v={pct(b.tempoScore)} />
        <Stat k="Consistency" v={pct(b.repConsistency)} />
        <Stat k="Streak" v={`×${b.streakMult.toFixed(1)}`} sub={`${b.streakDays} day${b.streakDays === 1 ? "" : "s"}`} />
      </div>

      <section className="card font-mono text-sm">
        <div className="label mb-2 font-body">XP math</div>
        {repRows.length > 0 && (
          <Line l={`${LABEL.rep} × ${repRows.length}  (${cfg.baseXp} × form × tempo)`} r={`+${b.repXpSum}`} />
        )}
        {b.ledger.filter((r) => r.source !== "rep").map((r, i) => <Line key={i} l={LABEL[r.source]} r={`+${r.amount}`} />)}
        <div className="my-2 border-t border-white/10" />
        <Line l="Total" r={`+${b.totalXp} XP`} bold />
        <div className="mt-2 text-xs text-white/40">
          set = Σrep × (1 + 0.2 × consistency) = {b.setXp} · × streak {b.streakMult.toFixed(1)}{b.dailyShowBonus ? ` + ${b.dailyShowBonus} daily show` : ""}
        </div>
      </section>

      <section className="card">
        <div className="label mb-2">Rep by rep</div>
        <div className="flex flex-wrap gap-1.5">
          {b.perRep.map((r) => (
            <span key={r.repIndex} title={r.flags.join(", ")}
              className={`rounded-full px-2.5 py-1 text-xs ${r.valid ? "bg-neon-lime/15 text-neon-lime" : "bg-red-500/20 text-red-300"}`}>
              {r.repIndex + 1}: {r.valid ? `+${r.xp}` : r.flags[0] ?? "no rep"}
            </span>
          ))}
          {!b.perRep.length && <span className="text-sm text-white/50">No reps detected this time.</span>}
        </div>
      </section>

      <div className={`rounded-xl px-4 py-3 text-center text-sm ${data.offline ? "bg-neon-amber/10 text-neon-amber" : "bg-neon-cyan/10 text-neon-cyan"}`}>
        {data.offline
          ? "Scored on this device (offline) — not saved to the crew board."
          : data.crewNotified ? `Crew notified ✓ (${data.crewNotified} message${data.crewNotified > 1 ? "s" : ""})` : "Saved ✓ (no crew members opted in to texts)"}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button className="btn-ghost" onClick={() => navigate(`/stage/${data.exercise}`)}>Another set</button>
        <button className="btn-primary" onClick={() => navigate(data.offline ? "/" : "/board")}>{data.offline ? "Backstage" : "🏆 Board"}</button>
      </div>
      <button className="w-full text-sm text-white/50" onClick={() => navigate("/")}>Backstage</button>
    </div>
  );
}

function Stat({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="card py-3 text-center">
      <div className="label">{k}</div>
      <div className="text-2xl font-extrabold">{v}</div>
      {sub && <div className="text-xs text-white/50">{sub}</div>}
    </div>
  );
}

function Line({ l, r, bold }: { l: string; r: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-0.5 ${bold ? "text-lg font-bold text-neon-lime" : ""}`}>
      <span className="text-white/80">{l}</span><span>{r}</span>
    </div>
  );
}
