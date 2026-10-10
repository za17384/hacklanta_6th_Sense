import { EXERCISE_CONFIGS, EXERCISES } from "@rep-rally/shared";
import type { Me } from "../lib/api";
import { navigate } from "../lib/router";

const ICON = { squat: "🦵", pushup: "💪", pullup: "🧗" } as const;

export function Backstage({ me, offline }: { me: Me | null; offline: boolean }) {
  const pct = me ? Math.min(100, Math.round((me.intoLevel / Math.max(1, me.levelSpan)) * 100)) : 0;
  return (
    <div className="space-y-4 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="title text-2xl text-neon-pink">REP RALLY</h1>
        {me && <button className="btn-ghost px-3 py-2 text-sm" onClick={() => navigate("/board")}>🏆 Headliner Board</button>}
      </header>

      {offline && (
        <div className="rounded-xl border border-neon-amber/40 bg-neon-amber/10 px-4 py-3 text-sm text-neon-amber">
          Offline mode — sets are scored on this device and won't reach the crew board.
        </div>
      )}

      {me && (
        <section className="card relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-neon-pink/20 blur-3xl" />
          <div className="flex items-start justify-between">
            <div>
              <div className="label">Backstage pass</div>
              <div className="title mt-1 text-3xl">{me.user.displayName}</div>
              <div className="mt-1 text-neon-cyan">Lv {me.level} · {me.title}</div>
            </div>
            <div className="text-right">
              <div className={`text-4xl ${me.streakDays ? "" : "grayscale opacity-40"}`}>🔥</div>
              <div className="text-sm font-semibold">{me.streakDays}-day streak</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-white/60">
              <span>{me.totalXp.toLocaleString()} XP</span><span>Lv {me.level + 1} at {me.nextLevelXp.toLocaleString()}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-neon-pink to-neon-cyan transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {(["STR", "LEGS", "GRIT"] as const).map((k) => (
              <div key={k} className="rounded-xl bg-white/5 py-2">
                <div className="label">{k}</div>
                <div className="text-2xl font-extrabold">{me.stats[k]}</div>
              </div>
            ))}
          </div>
          <div className={`mt-4 rounded-xl px-3 py-2 text-sm ${me.doneToday ? "bg-neon-lime/10 text-neon-lime" : "bg-white/5 text-white/70"}`}>
            {me.doneToday ? `✅ On stage today — ${me.validRepsToday} clean reps` : "🎶 No set yet today. The crowd is waiting."}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="label px-1">Pick your set</div>
        {EXERCISES.map((ex) => {
          const cfg = EXERCISE_CONFIGS[ex];
          return (
            <button key={ex} onClick={() => navigate(`/stage/${ex}`)}
              className="card flex w-full items-center gap-4 text-left transition hover:border-neon-pink/60">
              <div className="text-4xl">{ICON[ex]}</div>
              <div className="flex-1">
                <div className="title text-xl">{cfg.label}</div>
                <div className="text-xs text-white/60">📷 {cfg.cameraTip}</div>
              </div>
              <div className="text-sm text-neon-cyan">{cfg.baseXp} XP/rep</div>
            </button>
          );
        })}
      </section>

      {me?.crews[0] && (
        <button className="btn-ghost w-full text-sm" onClick={() => navigator.clipboard?.writeText(me.crews[0]!.inviteUrl)}>
          📋 Copy invite link for {me.crews[0].name} ({me.crews[0].inviteCode})
        </button>
      )}
      <p className="pb-24 text-center text-xs text-white/30">Form feedback & rep counting only — not medical advice.</p>
    </div>
  );
}
