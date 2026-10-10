import { sanitizeReps, scoreSet, type RepEvent, type ScoreBreakdown } from "@rep-rally/shared";
import type { Store, WorkoutSession } from "../store/types";

export interface RecordOpts {
  at?: Date;
  /** Seed only: historical sets can't ask "today's" views for their streak. */
  streakOverride?: number;
  dailyShowOverride?: boolean;
}

/**
 * Server is the source of truth: sanitize client rep events, store them,
 * read the streak from the DB (which now includes this set), score, and append the ledger.
 * Any XP the client computed is ignored.
 */
export async function recordSet(store: Store, session: WorkoutSession, rawReps: RepEvent[], o: RecordOpts = {}): Promise<ScoreBreakdown> {
  const reps = sanitizeReps(rawReps);
  const dailyShowEligible = o.dailyShowOverride ?? !(await store.hadDailyShowToday(session.userId));
  await store.insertRepEvents(session, reps);
  const streakDays = o.streakOverride ?? (await store.streakDays(session.userId));
  const b = scoreSet({ exercise: session.exercise, reps, streakDays, dailyShowEligible });
  await store.completeSession(session, b, b.ledger, o.at ?? new Date());
  return b;
}
