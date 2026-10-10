import type { BoardRow } from "../store/types";

// Template bank. Variables in, copy out. An optional LLM rewrite step can wrap
// these later behind LLM_PROVIDER; with it unset (default) these are final.

const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]!;
const n = (x: number) => x.toLocaleString("en-US");
const EX: Record<string, string> = { squat: "squats", pushup: "push-ups", pullup: "pull-ups" };

export function boardLine(rows: BoardRow[], viewerId?: string, top = 3): string {
  return rows.slice(0, top)
    .map((r) => `${r.rank}. ${r.userId === viewerId ? "You" : r.displayName} ${n(r.xp7d)}`)
    .join(" · ");
}

export function gapLine(rows: BoardRow[], viewerId: string): string {
  const me = rows.find((r) => r.userId === viewerId);
  if (!me || !rows.length) return "";
  if (me.rank === 1) return "You're holding the top spot 👑";
  const leader = rows[0]!;
  return `You're ${n(leader.xp7d - me.xp7d)} XP off the top.`;
}

export const T = {
  welcome: (name: string, crew: string, others: string[], appUrl: string) =>
    `🎤 Welcome to Rep Rally, ${name}! You're in "${crew}"${others.length ? ` with ${others.join(", ")}` : ""}. ` +
    `Do a set on stage at ${appUrl} and I'll tell the crew. Text BOARD, ME, STREAK, or HELP. Reply STOP to opt out.`,

  completion: (p: { name: string; reps: number; exercise: string; formPct: number; streak: number; xp: number; board: string; gap: string }) =>
    `${pick(["🎤", "🔊", "🎸"])} ${p.name} just dropped ${p.reps} ${EX[p.exercise] ?? p.exercise} — ${p.formPct}% form` +
    `${p.streak >= 2 ? `, 🔥 ${p.streak}-day streak` : ""}, +${n(p.xp)} XP. Board: ${p.board}. ${p.gap}`.trim(),

  reminderLeader: (name: string, secondName: string, gap: number) =>
    `👑 ${name}, you're headlining — but ${secondName} is ${n(gap)} XP behind. Defend your spot with a set today.`,
  reminderChasing: (name: string, gap: number, aheadName: string) =>
    `🎶 ${name}, the stage is waiting. You're ${n(gap)} XP behind ${aheadName} — one set could flip it.`,
  reminderSolo: (name: string) => `🎶 ${name}, no set yet today. The crowd's waiting — 10 clean reps keeps the show going.`,

  streakRisk: (name: string, streak: number) =>
    `🔥 ${name}, your ${streak}-day streak ends at midnight. 10 clean reps keeps it alive.`,

  nudge: (from: string, to: string) => `👋 ${to}, ${from} is calling you to the stage. Your crew is waiting on a set!`,

  help: () => `Rep Rally commands: BOARD (crew ranks) · ME (your stats) · STREAK · NUDGE <name> · STOP · START`,
  stop: () => `You're unsubscribed from Rep Rally texts. Reply START to come back.`,
  start: () => `🎤 You're back on the list! Text HELP for commands.`,
  unknown: () => pick([
    "🎧 I only speak gym. Try BOARD, ME, STREAK, or HELP.",
    "🎤 Mic check! Text HELP to see what I can do.",
  ]),
  notMember: () => `I don't know this number yet — join a crew on the Rep Rally site first 🎟️`,
};
