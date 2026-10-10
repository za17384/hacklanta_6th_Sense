import { EXERCISE_CONFIGS } from "./exercises";
import { clamp, mean, std } from "./geometry";
import type { Exercise, RepEvent, XpLedgerRow } from "./types";

// One scoring implementation shared by web (live preview) and api (source of truth).

export const DAILY_SHOW_REPS = 10;
export const DAILY_SHOW_BONUS = 25;

/** 1.0 inside the band; linear down to 0.5 at 50% outside the band; floor 0.5. */
export function tempoScore(durationS: number, [lo, hi]: [number, number]): number {
  let frac = 0;
  if (durationS < lo) frac = (lo - durationS) / lo;
  else if (durationS > hi) frac = (durationS - hi) / hi;
  return Math.max(0.5, 1 - frac);
}

/** clamp(1 − CV(valid durations), 0, 1); needs ≥ 3 valid reps, else 0. */
export function repConsistency(validDurations: number[]): number {
  if (validDurations.length < 3) return 0;
  const m = mean(validDurations);
  if (m === 0) return 0;
  return clamp(1 - std(validDurations) / m, 0, 1);
}

export function streakMult(streakDays: number): number {
  return 1 + 0.1 * Math.min(Math.max(streakDays, 0), 10);
}

export interface ScoreInput {
  exercise: Exercise;
  reps: RepEvent[];
  /** Streak length counting today if this set makes today a show day. */
  streakDays: number;
  /** True if this is the first set today that reaches ≥10 valid reps on its own. */
  dailyShowEligible: boolean;
}

export interface ScoreBreakdown {
  validReps: number;
  noReps: number;
  avgForm: number;
  tempoScore: number;
  repConsistency: number;
  streakDays: number;
  streakMult: number;
  repXpSum: number;
  setXp: number;
  dailyShowBonus: number;
  totalXp: number;
  /** Append-only ledger rows. Sum(amount) === totalXp exactly. */
  ledger: XpLedgerRow[];
  perRep: { repIndex: number; valid: boolean; form: number; tempo: number; xp: number; flags: string[] }[];
}

export function scoreSet(input: ScoreInput): ScoreBreakdown {
  const cfg = EXERCISE_CONFIGS[input.exercise];
  const perRep = input.reps.map((r) => {
    const form = clamp(r.formScore, 0, 1);
    const tempo = tempoScore(r.durationS, cfg.tempoBand);
    // Integer per-rep XP so ledger rows sum exactly.
    const xp = r.valid ? Math.round(cfg.baseXp * form * tempo) : 0;
    return { repIndex: r.repIndex, valid: r.valid, form, tempo, xp, flags: r.flags };
  });
  const valid = perRep.filter((r) => r.valid);
  const consistency = repConsistency(input.reps.filter((r) => r.valid).map((r) => r.durationS));
  const repXpSum = valid.reduce((s, r) => s + r.xp, 0);
  const setBonus = Math.round(repXpSum * 0.2 * consistency);
  const setXp = repXpSum + setBonus;
  const mult = streakMult(input.streakDays);
  const afterStreak = Math.round(setXp * mult);
  const streakBonus = afterStreak - setXp;
  const daily = input.dailyShowEligible && valid.length >= DAILY_SHOW_REPS ? DAILY_SHOW_BONUS : 0;

  const ledger: XpLedgerRow[] = valid.map((r) => ({ source: "rep" as const, amount: r.xp, repIndex: r.repIndex }));
  if (setBonus) ledger.push({ source: "set_bonus", amount: setBonus });
  if (streakBonus) ledger.push({ source: "streak_bonus", amount: streakBonus });
  if (daily) ledger.push({ source: "daily_show", amount: daily });

  return {
    validReps: valid.length,
    noReps: perRep.length - valid.length,
    avgForm: perRep.length ? mean(perRep.map((r) => r.form)) : 0,
    tempoScore: valid.length ? mean(valid.map((r) => r.tempo)) : 0,
    repConsistency: consistency,
    streakDays: input.streakDays,
    streakMult: mult,
    repXpSum,
    setXp,
    dailyShowBonus: daily,
    totalXp: afterStreak + daily,
    ledger,
    perRep,
  };
}

/** Server-side anti-cheat lite: drop <0.4 s reps, cap 60 reps/min, clamp scores. Client XP is never read. */
export function sanitizeReps(reps: RepEvent[]): RepEvent[] {
  const sorted = [...reps]
    .filter((r) => Number.isFinite(r.durationS) && r.durationS >= 0.4 && Number.isFinite(r.ts))
    .sort((a, b) => a.ts - b.ts)
    .map((r) => ({
      ...r,
      formScore: clamp(Number(r.formScore) || 0, 0, 1),
      flags: Array.isArray(r.flags) ? r.flags.slice(0, 5).map((f) => String(f).slice(0, 40)) : [],
    }));
  const out: RepEvent[] = [];
  for (const r of sorted) {
    const inLastMinute = out.filter((x) => r.ts - x.ts < 60_000).length;
    if (inLastMinute < 60) out.push(r);
  }
  // A rep is valid only if depth passed and form ≥ 0.6 — recomputed, not trusted.
  return out.map((r, i) => ({ ...r, repIndex: i, valid: !!r.depthPass && r.formScore >= 0.6 }));
}
