import { navigate } from "../lib/router";
import { WORKOUTS, type WorkoutId } from "./data";
import { CheckIcon, FigureIcon, PixelCoach } from "./icons";
import { CtaButton, ScreenHeader } from "./components";

const TIPS: Record<WorkoutId, string> = {
  squat: "Choose Squats for the full interactive demo.",
  pushup: "Push-ups use the on-device camera. The scripted demo is squats only.",
  lunge: "Lunges are simulated. Camera counting for this move is not connected yet.",
  plank: "Planks are simulated holds. Camera counting for this move is not connected yet.",
};

export function WorkoutSelectScreen({ level, selected, onSelect }: {
  level: number;
  selected: WorkoutId;
  onSelect: (id: WorkoutId) => void;
}) {
  const current = WORKOUTS.find((w) => w.id === selected) ?? WORKOUTS[0]!;
  return (
    <div>
      <ScreenHeader title="Choose your workout" level={level} onBack={() => navigate("/")} />
      <div className="px-5 pt-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-formup-lav">Choose your workout</div>
        <h2 className="mt-2 text-[32px] font-semibold leading-[1.15] tracking-[-0.03em]">Train with intention.</h2>
        <p className="mt-2 text-[15px] leading-snug text-formup-muted">
          Select an exercise and your AI coach will guide each rep.
        </p>

        <div className="mt-5 space-y-3">
          {WORKOUTS.map((w) => {
            const on = w.id === selected;
            return (
              <button key={w.id} type="button" onClick={() => onSelect(w.id)}
                className={`flex w-full items-center gap-3 rounded-[22px] border-2 bg-formup-card px-3 py-3 text-left ${on ? "border-formup-lav" : "border-formup-line"}`}>
                <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-[#12182c] text-[#c4b8f5]">
                  <FigureIcon id={w.id} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold">{w.name}</span>
                  <span className="mt-0.5 block text-[13px] text-formup-faint">{w.muscles}</span>
                </span>
                <span className="text-[13px] text-formup-muted">{w.prescription}</span>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${on ? "bg-formup-mint text-[#102016]" : "border-2 border-[#3a4258]"}`}>
                  {on && <CheckIcon />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-[18px] border border-[#1e4d3a] bg-[#12261e] px-3.5 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0e1c16]">
            <PixelCoach />
          </span>
          <div>
            <div className="text-[13px] font-semibold text-formup-mint">Coach tip</div>
            <p className="text-[13px] leading-snug text-[#d5e8dc]">{TIPS[current.id]}</p>
          </div>
        </div>

        <div className="mt-4">
          <CtaButton
            title={`Start ${current.name}`}
            subtitle={current.detail}
            onClick={() => navigate(`/session/${current.id}`)}
          />
        </div>
      </div>
    </div>
  );
}
