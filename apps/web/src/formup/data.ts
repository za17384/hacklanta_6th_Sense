import type { Exercise } from "@rep-rally/shared";

export type WorkoutId = "squat" | "pushup" | "lunge" | "plank";

export interface WorkoutOption {
  id: WorkoutId;
  name: string;
  muscles: string;
  prescription: string;
  detail: string;
  reps: number;
  minutes: number;
  /** Pose model + rep engine exist for this movement. */
  tracked: boolean;
  engine: Exercise | null;
}

export const WORKOUTS: WorkoutOption[] = [
  { id: "squat", name: "Squats", muscles: "Quads · Glutes", prescription: "3 × 12", detail: "12 reps · ~4 min", reps: 12, minutes: 4, tracked: true, engine: "squat" },
  { id: "pushup", name: "Push-ups", muscles: "Chest · Triceps", prescription: "3 × 10", detail: "10 reps · ~4 min", reps: 10, minutes: 4, tracked: true, engine: "pushup" },
  { id: "lunge", name: "Lunges", muscles: "Quads · Glutes", prescription: "3 × 10", detail: "10 reps · ~4 min", reps: 10, minutes: 4, tracked: false, engine: null },
  { id: "plank", name: "Planks", muscles: "Core · Shoulders", prescription: "3 × 30s", detail: "3 × 30s · ~3 min", reps: 3, minutes: 3, tracked: false, engine: null },
];

export function workoutById(id: string | null): WorkoutOption | null {
  return WORKOUTS.find((w) => w.id === id) ?? null;
}

export interface QuestDef {
  id: string;
  name: string;
  title: string;
  detail: string;
  xp: number;
  target: number;
  unit: string;
}

export const QUESTS: QuestDef[] = [
  { id: "foundation", name: "Foundation Builder", title: "Complete 12 squats", detail: "Keep your form score above 80%", xp: 120, target: 12, unit: "squats" },
  { id: "tempo", name: "Tempo Keeper", title: "Complete 10 push-ups", detail: "Stay inside the tempo band", xp: 80, target: 10, unit: "push-ups" },
  { id: "show", name: "Daily Show", title: "Finish any coached set", detail: "One saved session keeps the streak", xp: 25, target: 1, unit: "session" },
];

export interface WorldDef {
  id: string;
  name: string;
  blurb: string;
  minLevel: number;
}

/** Preview map. Levels follow the on-screen rank, not a server table. */
export const WORLDS: WorldDef[] = [
  { id: "foundation", name: "Foundation", blurb: "Home gym · first reps", minLevel: 0 },
  { id: "neon", name: "Neon Court", blurb: "Night sessions downtown", minLevel: 5 },
  { id: "skyline", name: "Skyline Arena", blurb: "Rooftop sets", minLevel: 8 },
  { id: "spire", name: "Legend Spire", blurb: "The last climb", minLevel: 12 },
];

export interface RewardPayload {
  exerciseName: string;
  workoutId: WorkoutId;
  /** Scripted or untracked movement. Not a camera-counted set. */
  simulated: boolean;
  /** Posted to the crew API. */
  saved: boolean;
  reps: number;
  noReps: number;
  target: number;
  formPct: number | null;
  tempoText: string;
  xp: number;
  levelBefore: number;
  levelAfter: number;
  note: string;
}

export interface Progress {
  squatReps: number;
  pushupReps: number;
  sessions: number;
  formSum: number;
  formN: number;
}

export const EMPTY_PROGRESS: Progress = { squatReps: 0, pushupReps: 0, sessions: 0, formSum: 0, formN: 0 };

const PREVIEW_INTO = 640;
const PREVIEW_SPAN = 1000;
const PREVIEW_LEVEL = 7;

export interface Hud {
  preview: boolean;
  name: string;
  level: number;
  into: number;
  span: number;
  pct: number;
  streak: number;
  streakSub: string;
  /** Count today toward the week dots. */
  includeToday: boolean;
  title: string;
  squatReps: number;
  pushupReps: number;
  sessions: number;
  formPct: number | null;
}

export function firstName(displayName: string | undefined): string {
  const token = displayName?.trim().split(/\s+/)[0];
  return token || "Alex";
}

export function greeting(name: string, now = new Date()): string {
  const h = now.getHours();
  const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${part}, ${name}`;
}

/** Cosmetic meter used only when nobody is signed in. Matches the Figma home screen at 0 extra XP. */
export function previewMeter(extraXp: number) {
  let level = PREVIEW_LEVEL;
  let into = PREVIEW_INTO + Math.max(0, extraXp);
  while (into >= PREVIEW_SPAN) {
    into -= PREVIEW_SPAN;
    level += 1;
  }
  return { level, into, span: PREVIEW_SPAN, pct: Math.round((into / PREVIEW_SPAN) * 100) };
}

export function weekMarks(streak: number, includeToday: boolean, now = new Date()): { on: boolean; letter: string }[] {
  const letters = ["m", "t", "w", "t", "f", "s", "s"];
  const mondayIndex = (now.getDay() + 6) % 7;
  if (streak <= 0) return letters.map((letter) => ({ on: false, letter }));
  const end = mondayIndex - (includeToday ? 0 : 1);
  const start = end - streak + 1;
  return letters.map((letter, i) => ({
    on: i <= mondayIndex && i >= start && i <= end,
    letter,
  }));
}
