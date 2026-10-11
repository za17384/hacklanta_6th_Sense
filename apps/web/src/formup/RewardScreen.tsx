import { navigate } from "../lib/router";
import { WORLDS, type RewardPayload } from "./data";

export function RewardScreen({ reward }: { reward: RewardPayload | null }) {
  if (!reward) {
    return (
      <div className="px-5 pt-10 text-center">
        <h1 className="text-[28px] font-semibold">No set yet</h1>
        <button type="button" className="mt-6 text-formup-lav" onClick={() => navigate("/workout")}>Choose a workout</button>
      </div>
    );
  }
  const leveled = reward.levelAfter > reward.levelBefore;
  const unlocked = WORLDS.filter((w) => reward.levelBefore < w.minLevel && reward.levelAfter >= w.minLevel);
  return (
    <div className="px-5 pt-8">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-formup-lav">
        {reward.simulated ? "Simulated reward" : reward.saved ? "Set saved" : "Set scored on device"}
      </div>
      <h1 className="mt-2 text-[32px] font-semibold leading-tight tracking-[-0.03em]">{reward.exerciseName} complete</h1>
      <p className="mt-2 text-[14px] text-formup-muted">{reward.reps} / {reward.target} clean reps{reward.noReps ? ` · ${reward.noReps} no-rep` : ""}</p>

      <div className="mt-5 rounded-[22px] border border-formup-line bg-formup-card px-4 py-5 text-center">
        <div className="text-[12px] uppercase tracking-[0.16em] text-formup-faint">XP earned</div>
        <div className="mt-1 text-[56px] font-bold leading-none text-formup-mint">+{reward.xp}</div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Mini k="Form" v={reward.formPct === null ? "—" : `${reward.formPct}%`} />
        <Mini k="Tempo" v={reward.tempoText} />
        <Mini k="Level" v={`${reward.levelAfter}`} />
      </div>

      {leveled && (
        <div className="mt-3 rounded-[18px] border border-[#1e4d3a] bg-[#12261e] px-4 py-3 text-center">
          <div className="text-[13px] font-semibold text-formup-mint">Level up</div>
          <div className="text-[20px] font-bold">Level {reward.levelAfter}</div>
        </div>
      )}

      {unlocked.length > 0 && (
        <div className="mt-3 rounded-[18px] border border-formup-line bg-formup-card px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-formup-mint">World unlocked · preview</div>
          {unlocked.map((w) => <div key={w.id} className="mt-1 text-[15px] font-semibold">{w.name}</div>)}
        </div>
      )}

      <p className="mt-4 text-[13px] leading-relaxed text-formup-muted">{reward.note}</p>

      <button type="button" onClick={() => navigate("/")}
        className="mt-5 w-full rounded-[22px] bg-formup-lav py-3.5 text-[16px] font-bold text-formup-ink">
        Back home
      </button>
      <button type="button" onClick={() => navigate(`/session/${reward.workoutId}`)}
        className="mt-3 w-full text-center text-[14px] font-semibold text-formup-muted">
        Train again
      </button>
    </div>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl border border-formup-line bg-formup-card px-2 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-formup-faint">{k}</div>
      <div className="mt-1 text-[13px] font-bold leading-tight">{v}</div>
    </div>
  );
}
