import type { ReactNode } from "react";
import { navigate } from "../lib/router";
import type { Hud } from "./data";
import { weekMarks } from "./data";
import { ArrowIcon, CheckIcon, ChevronLeft, FlameIcon, PlayIcon, SparkIcon, TabIcon } from "./icons";

export function Logo() {
  return (
    <div className="text-[22px] font-extrabold tracking-[-0.04em] text-[#c4b6ff]">
      <span className="relative inline-block">
        FORMUP
        <span className="absolute -right-2 -top-0.5 h-2 w-2 rounded-[2px] bg-formup-mint" aria-hidden />
      </span>
    </div>
  );
}

export function RankCard({ hud }: { hud: Hud }) {
  return (
    <section className="rounded-[22px] border border-formup-line bg-formup-card px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-formup-muted">Current rank</div>
          <div className="mt-2 flex items-end gap-2">
            <span className="border-b-2 border-white/80 pb-0.5 text-[15px] font-bold tracking-[0.12em]">LEVEL</span>
            <span className="text-[28px] font-bold leading-none">{hud.level}</span>
          </div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-formup-line bg-formup-raised">
          <SparkIcon />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-[13px]">
        <span className="text-formup-muted">{hud.into.toLocaleString()} / {hud.span.toLocaleString()} XP</span>
        <span className="font-semibold text-formup-text">{hud.pct}%</span>
      </div>
      <div className="fu-bar mt-2" aria-hidden>
        <span style={{ width: `${hud.pct}%` }} />
      </div>
    </section>
  );
}

export function StreakRow({ hud }: { hud: Hud }) {
  const marks = weekMarks(hud.streak, hud.includeToday);
  return (
    <section className="flex items-center gap-2.5 rounded-[22px] border border-formup-line bg-formup-card px-3 py-2.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#241c33]">
        <FlameIcon />
      </div>
      <div className="min-w-0">
        <div className="whitespace-nowrap text-[14px] font-semibold leading-tight">{hud.streak} day streak</div>
        <div className="mt-0.5 whitespace-nowrap text-[12px] text-formup-faint">{hud.streakSub}</div>
      </div>
      <div className="ml-auto flex shrink-0 gap-1">
        {marks.map((m, i) => (
          <span
            key={i}
            className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-bold ${m.on ? "bg-formup-mint text-[#102016]" : "bg-[#2a3148] text-[#8b90a6]"}`}
          >
            {m.on ? <CheckIcon className="h-2.5 w-2.5" /> : m.letter}
          </span>
        ))}
      </div>
    </section>
  );
}

export function CtaButton({ title, subtitle, play = false, onClick }: {
  title: string; subtitle: string; play?: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[22px] bg-formup-lav px-4 py-3.5 text-left text-formup-ink shadow-[0_10px_28px_rgba(177,151,255,0.28)] transition active:scale-[0.99]"
    >
      {play && (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2a2158]/25">
          <PlayIcon />
        </span>
      )}
      <span className={`min-w-0 flex-1 ${play ? "text-center" : ""}`}>
        <span className="block text-[17px] font-bold leading-tight">{title}</span>
        <span className="mt-0.5 block text-[12px] font-medium text-formup-ink/70">{subtitle}</span>
      </span>
      <ArrowIcon />
    </button>
  );
}

export function BackButton({ onClick, label = "Back" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-formup-line bg-formup-card text-formup-text">
      <ChevronLeft />
    </button>
  );
}

export function ScreenHeader({ title, level, onBack }: { title: string; level: number; onBack: () => void }) {
  return (
    <header className="grid grid-cols-[40px_1fr_56px] items-center px-4 pt-4">
      <BackButton onClick={onBack} />
      <h1 className="text-center text-[15px] font-semibold">{title}</h1>
      <div className="text-right text-[12px] font-semibold tracking-wide text-formup-muted">LV. {level}</div>
    </header>
  );
}

const TABS = [
  { id: "home", label: "Home", href: "/", icon: "home" as const },
  { id: "workout", label: "Workout", href: "/workout", icon: "workout" as const },
  { id: "quests", label: "Quests", href: "/quests", icon: "quests" as const },
  { id: "profile", label: "Profile", href: "/profile", icon: "profile" as const },
];

export function TabBar({ path }: { path: string }) {
  const active = path === "/" ? "home" : path.startsWith("/workout") || path.startsWith("/session") ? "workout" : path.startsWith("/quests") ? "quests" : path.startsWith("/profile") || path.startsWith("/reward") ? "profile" : "";
  return (
    <nav className="fu-tabs fixed bottom-0 left-1/2 z-30 w-full max-w-[420px] -translate-x-1/2 border-t border-formup-line bg-[#0e1422]/95 backdrop-blur">
      <ul className="grid grid-cols-4 px-2 pt-2 pb-2">
        {TABS.map((tab) => {
          const on = tab.id === active;
          return (
            <li key={tab.id}>
              <button type="button" onClick={() => navigate(tab.href)}
                className={`flex w-full flex-col items-center gap-1 text-[11px] font-medium ${on ? "text-formup-text" : "text-formup-faint"}`}>
                <span className={`h-[3px] w-7 rounded-full ${on ? "bg-formup-lav" : "bg-transparent"}`} />
                <TabIcon name={tab.icon} />
                {tab.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Shell({ children, tabs, path }: { children: ReactNode; tabs: boolean; path: string }) {
  return (
    <div className="min-h-dvh bg-formup-bg text-formup-text">
      <div className={`relative mx-auto min-h-dvh w-full max-w-[420px] ${tabs ? "fu-page" : "fu-page-plain"}`}>
        {children}
        {tabs && <TabBar path={path} />}
      </div>
    </div>
  );
}
