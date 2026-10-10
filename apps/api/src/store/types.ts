import type { Exercise, MessageKind, RepEvent, SessionSource, XpLedgerRow } from "@rep-rally/shared";

// ── Persistence plug-in boundary ─────────────────────────────────────────────
// PgStore (Tiger Cloud / local TimescaleDB) and MemoryStore (DEMO_MODE with no
// DATABASE_URL) both implement this. Routes and the agent only see Store.

export interface User {
  id: string;
  displayName: string;
  phone: string | null;
  imessageDmSpaceId: string | null;
  smsConsent: boolean;
  optedOut: boolean;
  createdAt: Date;
}

export interface Crew {
  id: string;
  name: string;
  inviteCode: string;
  imessageGroupSpaceId: string | null;
  createdBy: string | null;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  exercise: Exercise;
  source: SessionSource;
  startedAt: Date;
  endedAt: Date | null;
  totalXp: number | null;
}

export interface SessionSummary {
  validReps: number;
  noReps: number;
  avgForm: number;
  tempoScore: number;
  repConsistency: number;
  streakMult: number;
  totalXp: number;
}

export interface BoardRow {
  userId: string;
  displayName: string;
  xp7d: number;
  streakDays: number;
  rank: number;
  doneToday: boolean;
}

export interface Store {
  readonly kind: "memory" | "postgres";

  createUser(u: { displayName: string; phone: string | null; smsConsent: boolean }): Promise<User>;
  getUser(id: string): Promise<User | null>;
  findUserByPhone(phone: string): Promise<User | null>;
  updateUser(id: string, patch: Partial<Pick<User, "displayName" | "smsConsent" | "optedOut" | "imessageDmSpaceId">>): Promise<void>;

  createCrew(name: string, createdBy: string | null, inviteCode?: string): Promise<Crew>;
  getCrew(id: string): Promise<Crew | null>;
  findCrewByInvite(code: string): Promise<Crew | null>;
  addMember(crewId: string, userId: string): Promise<void>;
  crewsForUser(userId: string): Promise<Crew[]>;
  crewMembers(crewId: string): Promise<User[]>;
  allCrews(): Promise<Crew[]>;

  createSession(s: { userId: string; exercise: Exercise; source: SessionSource; startedAt: Date }): Promise<WorkoutSession>;
  getSession(id: string): Promise<WorkoutSession | null>;
  insertRepEvents(session: WorkoutSession, reps: RepEvent[]): Promise<void>;
  /** Appends ledger rows and fills the session summary. Rows are append-only. */
  completeSession(session: WorkoutSession, summary: SessionSummary, ledger: XpLedgerRow[], at: Date): Promise<void>;

  /** Current streak in days (≥10 valid reps/day, run must include today or yesterday). */
  streakDays(userId: string): Promise<number>;
  /** Valid reps today (local day) across all exercises. */
  validRepsToday(userId: string): Promise<number>;
  /** Whether a daily_show bonus was already awarded today. */
  hadDailyShowToday(userId: string): Promise<boolean>;
  totalXp(userId: string): Promise<number>;
  xpByExercise(userId: string): Promise<Record<Exercise, number>>;
  board(crewId: string): Promise<BoardRow[]>;

  /** Returns false if dedupeKey already exists (message must not be sent). */
  logMessage(m: { userId?: string | null; crewId?: string | null; kind: MessageKind; dedupeKey?: string | null; body: string }): Promise<boolean>;
  /** Agent-initiated messages (not replies) sent to this user today. */
  agentMessagesToday(userId: string): Promise<number>;
}
