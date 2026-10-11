import { navigate } from "../lib/router";
import { greeting, type Hud } from "./data";
import { ChevronRight, TargetIcon } from "./icons";
import { CtaButton, Logo, RankCard, StreakRow } from "./components";

export function HomeScreen({ hud, onQuest }: { hud: Hud; onQuest: () => void }) {
  const pct = Math.min(100, Math.round((hud.squatReps / 12) * 100));
  return (
    <div className="px-5 pt-5">
      <Logo />
      <p className="mt-6 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#c5c6cc]">
        {greeting(hud.name)}
      </p>
      <h1 className="mt-2 text-[32px] font-semibold leading-[1.15] tracking-[-0.03em]">
        Ready to level up?
      </h1>

      <div className="mt-5">
        <RankCard hud={hud} />
      </div>
      <div className="mt-3">
        <StreakRow hud={hud} />
      </div>

      <div className="mt-4">
        <CtaButton play title="Start Workout" subtitle="AI coaching is ready" onClick={() => navigate("/workout")} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-formup-muted">Today&apos;s quest</div>
        <div className="text-[13px] font-bold text-formup-mint">+120 XP</div>
      </div>
      <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.02em]">Foundation Builder</h2>

      <button type="button" onClick={onQuest}
        className="mt-3 w-full rounded-[22px] border border-formup-line bg-formup-card px-3.5 py-3.5 text-left">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-formup-mint/15 text-formup-mint">
            <TargetIcon />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">Complete 12 squats</span>
            <span className="mt-0.5 block text-[13px] text-formup-faint">Keep your form score above 80%</span>
          </span>
          <ChevronRight />
        </div>
        <div className="fu-bar mt-3">
          <span style={{ width: `${pct}%` }} />
        </div>
        {(hud.sessions > 0 || !hud.preview) && hud.squatReps > 0 && (
          <div className="mt-2 text-[11px] text-formup-faint">{Math.min(hud.squatReps, 12)} / 12 squats{hud.formPct !== null ? ` · form ${hud.formPct}%` : ""}</div>
        )}
      </button>

      <p className="mt-8 text-center text-[12px] leading-relaxed text-formup-faint">
        {hud.preview
          ? "FormUp uses simulated coaching in this prototype."
          : "Form feedback stays on this device. Not medical advice."}
      </p>
    </div>
  );
}
