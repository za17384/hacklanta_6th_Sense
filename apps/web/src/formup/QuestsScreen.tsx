import type { Hud } from "./data";
import { QUESTS, WORLDS } from "./data";
import { navigate } from "../lib/router";
import { TargetIcon } from "./icons";

export function QuestsScreen({ hud, onTrain }: { hud: Hud; onTrain: () => void }) {
  const counts: Record<string, number> = {
    foundation: hud.squatReps,
    tempo: hud.pushupReps,
    show: hud.sessions,
  };
  return (
    <div className="px-5 pt-6">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-formup-lav">Quests</div>
      <h1 className="mt-2 text-[32px] font-semibold leading-[1.15] tracking-[-0.03em]">Today&apos;s board.</h1>
      <p className="mt-2 text-[14px] leading-snug text-formup-muted">
        {hud.preview
          ? "Preview quests. Squat progress here is local until you join a crew."
          : "Squat and push-up counts are from sets you finish in this browser. Saved XP still comes from the server."}
      </p>

      <div className="mt-5 space-y-3">
        {QUESTS.map((q) => {
          const done = Math.min(counts[q.id] ?? 0, q.target);
          const pct = Math.round((done / q.target) * 100);
          const complete = done >= q.target;
          return (
            <button key={q.id} type="button" onClick={onTrain}
              className="w-full rounded-[22px] border border-formup-line bg-formup-card px-3.5 py-3.5 text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-formup-muted">{q.name}</div>
                <div className="text-[13px] font-bold text-formup-mint">+{q.xp} XP</div>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-formup-mint/15 text-formup-mint">
                  <TargetIcon />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold">{q.title}</span>
                  <span className="mt-0.5 block text-[13px] text-formup-faint">{q.detail}</span>
                </span>
              </div>
              <div className="fu-bar mt-3"><span style={{ width: `${pct}%` }} /></div>
              <div className="mt-2 flex items-center justify-between text-[12px] text-formup-faint">
                <span>{done} / {q.target} {q.unit}</span>
                {complete && <span className="font-semibold text-formup-mint">Complete</span>}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-formup-muted">Worlds</h2>
        <span className="rounded-full border border-[#1e4d3a] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-formup-mint">Preview</span>
      </div>
      <div className="mt-3 space-y-2">
        {WORLDS.map((w) => {
          const open = hud.level >= w.minLevel;
          return (
            <div key={w.id} className={`flex items-center justify-between rounded-[18px] border px-3.5 py-3 ${open ? "border-formup-line bg-formup-card" : "border-formup-line/60 bg-formup-card/50 text-formup-faint"}`}>
              <div>
                <div className="text-[15px] font-semibold">{w.name}</div>
                <div className="text-[12px] text-formup-faint">{w.blurb}</div>
              </div>
              <div className={`text-[12px] font-semibold ${open ? "text-formup-mint" : "text-formup-faint"}`}>
                {open ? "Open" : `Lv ${w.minLevel}`}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[12px] leading-relaxed text-formup-faint">
        Worlds unlock from your level for this prototype. They do not change the workout yet.
      </p>
      <button type="button" onClick={() => navigate("/workout")} className="mt-4 w-full text-center text-[13px] font-semibold text-formup-lav">
        Train to advance
      </button>
    </div>
  );
}
