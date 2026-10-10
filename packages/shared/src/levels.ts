// RPG layer. Level L requires cumulative round(100 × L^1.5) XP (spec §9).
// Taken literally, 0–99 XP is level 0; we display it with the level-1 title.

export function xpForLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5));
}

export function levelFor(totalXp: number): { level: number; title: string; intoLevel: number; levelSpan: number } {
  let level = 0;
  while (totalXp >= xpForLevel(level + 1)) level++;
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, title: titleFor(level), intoLevel: totalXp - base, levelSpan: next - base };
}

export function titleFor(level: number): string {
  if (level >= 15) return "Legend";
  if (level >= 10) return "Headliner";
  if (level >= 6) return "Main Stage";
  if (level >= 3) return "Side Stage";
  return "Opener";
}

export function stats(xpByExercise: { squat: number; pushup: number; pullup: number }, streakDays: number) {
  return {
    STR: Math.floor((xpByExercise.pushup + xpByExercise.pullup) / 100),
    LEGS: Math.floor(xpByExercise.squat / 100),
    GRIT: streakDays,
  };
}
