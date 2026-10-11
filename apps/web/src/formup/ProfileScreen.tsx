import type { Me } from "../lib/api";
import { navigate } from "../lib/router";
import type { Hud } from "./data";
import { PixelCoach } from "./icons";
import { RankCard, StreakRow } from "./components";

export function ProfileScreen({ hud, me }: { hud: Hud; me: Me | null }) {
  return (
    <div className="px-5 pt-6">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-formup-lav">Profile</div>
      <div className="mt-4 flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-formup-line bg-[#12182c]">
          <PixelCoach className="h-12 w-12" />
        </span>
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.03em]">{hud.name}</h1>
          <div className="text-[14px] text-formup-muted">Level {hud.level} · {hud.title}</div>
          {hud.preview && <div className="mt-1 text-[12px] text-[#ffd7a8]">Preview profile — not signed in</div>}
        </div>
      </div>

      <div className="mt-5"><RankCard hud={hud} /></div>
      <div className="mt-3"><StreakRow hud={hud} /></div>

      {me && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {(["STR", "LEGS", "GRIT"] as const).map((k) => (
            <div key={k} className="rounded-2xl border border-formup-line bg-formup-card py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-formup-faint">{k}</div>
              <div className="mt-1 text-[22px] font-bold">{me.stats[k]}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {me ? (
          <>
            {me.crews[0] && (
              <div className="rounded-[18px] border border-formup-line bg-formup-card px-4 py-3 text-[14px]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-formup-faint">Crew</div>
                <div className="mt-1 font-semibold">{me.crews[0].name}</div>
              </div>
            )}
            <Ghost onClick={() => navigate("/board")}>Headliner board</Ghost>
            <Ghost onClick={() => navigate("/backstage")}>Classic backstage</Ghost>
          </>
        ) : (
          <button type="button" onClick={() => navigate("/join")}
            className="w-full rounded-[22px] bg-formup-lav py-3.5 text-[16px] font-bold text-formup-ink">
            Join a crew
          </button>
        )}
      </div>

      <p className="mt-6 text-[12px] leading-relaxed text-formup-faint">
        The pixel coach is a placeholder. No character art was included with the designs.
        {me ? " STR, LEGS, and GRIT come from your saved workouts." : " Rank, streak, and quests on Home are preview data until you join."}
      </p>
    </div>
  );
}

function Ghost({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full rounded-[18px] border border-formup-line bg-formup-card px-4 py-3 text-left text-[15px] font-semibold">
      {children}
    </button>
  );
}
