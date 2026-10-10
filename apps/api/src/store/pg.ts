import type { Exercise, MessageKind, RepEvent, XpLedgerRow } from "@rep-rally/shared";
import pg from "pg";
import { inviteCode } from "./memory";
import type { BoardRow, Crew, SessionSummary, Store, User, WorkoutSession } from "./types";

// Tiger Cloud / TimescaleDB store. Streaks, "done today" and the leaderboard
// come from the continuous aggregates + views in db/migrations (002, 003).

export function makePool(url: string) {
  const local = /localhost|127\.0\.0\.1|@db[:/]/.test(url);
  return new pg.Pool({ connectionString: url, max: 5, ssl: local ? undefined : { rejectUnauthorized: false } });
}

const TODAY = `time_bucket('1 day', now(), 'America/New_York')`;

const toUser = (r: any): User => ({
  id: r.id, displayName: r.display_name, phone: r.phone_e164, imessageDmSpaceId: r.imessage_dm_space_id,
  smsConsent: r.sms_consent, optedOut: r.opted_out, createdAt: r.created_at,
});
const toCrew = (r: any): Crew => ({
  id: r.id, name: r.name, inviteCode: r.invite_code, imessageGroupSpaceId: r.imessage_group_space_id, createdBy: r.created_by,
});
const toSession = (r: any): WorkoutSession => ({
  id: r.id, userId: r.user_id, exercise: r.exercise, source: r.source, startedAt: r.started_at, endedAt: r.ended_at, totalXp: r.total_xp,
});

export class PgStore implements Store {
  readonly kind = "postgres" as const;
  constructor(readonly pool: pg.Pool) {}

  private async one<T>(sql: string, args: unknown[], map: (r: any) => T): Promise<T | null> {
    const { rows } = await this.pool.query(sql, args);
    return rows[0] ? map(rows[0]) : null;
  }

  async createUser(u: { displayName: string; phone: string | null; smsConsent: boolean }) {
    return (await this.one(
      `INSERT INTO users (display_name, phone_e164, sms_consent) VALUES ($1, $2, $3) RETURNING *`,
      [u.displayName, u.phone, u.smsConsent], toUser))!;
  }
  getUser(id: string) { return this.one(`SELECT * FROM users WHERE id = $1`, [id], toUser); }
  findUserByPhone(phone: string) { return this.one(`SELECT * FROM users WHERE phone_e164 = $1`, [phone], toUser); }
  async updateUser(id: string, p: Partial<User>) {
    const cols: Record<string, unknown> = {
      display_name: p.displayName, sms_consent: p.smsConsent, opted_out: p.optedOut, imessage_dm_space_id: p.imessageDmSpaceId,
    };
    const set = Object.entries(cols).filter(([, v]) => v !== undefined);
    if (!set.length) return;
    await this.pool.query(
      `UPDATE users SET ${set.map(([k], i) => `${k} = $${i + 2}`).join(", ")} WHERE id = $1`,
      [id, ...set.map(([, v]) => v)]);
  }

  async createCrew(name: string, createdBy: string | null, code?: string) {
    return (await this.one(`INSERT INTO crews (name, invite_code, created_by) VALUES ($1, $2, $3) RETURNING *`,
      [name, code ?? inviteCode(), createdBy], toCrew))!;
  }
  getCrew(id: string) { return this.one(`SELECT * FROM crews WHERE id = $1`, [id], toCrew); }
  findCrewByInvite(code: string) { return this.one(`SELECT * FROM crews WHERE upper(invite_code) = upper($1)`, [code], toCrew); }
  async addMember(crewId: string, userId: string) {
    await this.pool.query(`INSERT INTO crew_members (crew_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [crewId, userId]);
  }
  async crewsForUser(userId: string) {
    const { rows } = await this.pool.query(
      `SELECT c.* FROM crews c JOIN crew_members m ON m.crew_id = c.id WHERE m.user_id = $1 ORDER BY m.joined_at`, [userId]);
    return rows.map(toCrew);
  }
  async crewMembers(crewId: string) {
    const { rows } = await this.pool.query(
      `SELECT u.* FROM users u JOIN crew_members m ON m.user_id = u.id WHERE m.crew_id = $1 ORDER BY m.joined_at`, [crewId]);
    return rows.map(toUser);
  }
  async allCrews() { return (await this.pool.query(`SELECT * FROM crews`)).rows.map(toCrew); }

  async createSession(s: { userId: string; exercise: Exercise; source: WorkoutSession["source"]; startedAt: Date }) {
    return (await this.one(
      `INSERT INTO workout_sessions (user_id, exercise, source, started_at) VALUES ($1, $2, $3, $4) RETURNING *`,
      [s.userId, s.exercise, s.source, s.startedAt], toSession))!;
  }
  getSession(id: string) { return this.one(`SELECT * FROM workout_sessions WHERE id = $1`, [id], toSession); }

  async insertRepEvents(s: WorkoutSession, reps: RepEvent[]) {
    if (!reps.length) return;
    const vals: unknown[] = [];
    const tuples = reps.map((r, i) => {
      vals.push(new Date(r.ts), s.id, s.userId, s.exercise, r.repIndex, r.valid, r.formScore, r.durationS, r.minAngleDeg, r.flags);
      const b = i * 10;
      return `(${Array.from({ length: 10 }, (_, k) => `$${b + k + 1}`).join(",")})`;
    });
    await this.pool.query(
      `INSERT INTO rep_events (ts, session_id, user_id, exercise, rep_index, valid, form_score, duration_s, min_angle_deg, flags)
       VALUES ${tuples.join(",")}`, vals);
  }

  async completeSession(s: WorkoutSession, sum: SessionSummary, ledger: XpLedgerRow[], at: Date) {
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      for (const row of ledger) {
        await c.query(`INSERT INTO xp_ledger (ts, user_id, session_id, source, amount) VALUES ($1, $2, $3, $4, $5)`,
          [at, s.userId, s.id, row.source, row.amount]);
      }
      await c.query(
        `UPDATE workout_sessions SET ended_at = $2, valid_reps = $3, no_reps = $4, avg_form = $5, tempo_score = $6,
           rep_consistency = $7, streak_mult = $8, total_xp = $9 WHERE id = $1`,
        [s.id, at, sum.validReps, sum.noReps, sum.avgForm, sum.tempoScore, sum.repConsistency, sum.streakMult, sum.totalXp]);
      await c.query("COMMIT");
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }

  async streakDays(userId: string) {
    return (await this.one(`SELECT streak_days FROM user_streaks WHERE user_id = $1`, [userId], (r) => Number(r.streak_days))) ?? 0;
  }
  async validRepsToday(userId: string) {
    return (await this.one(
      `SELECT coalesce(sum(valid_reps), 0) AS n FROM daily_user_reps WHERE user_id = $1 AND day = ${TODAY}`,
      [userId], (r) => Number(r.n))) ?? 0;
  }
  async hadDailyShowToday(userId: string) {
    return !!(await this.one(
      `SELECT 1 FROM xp_ledger WHERE user_id = $1 AND source = 'daily_show' AND ts >= ${TODAY} LIMIT 1`, [userId], () => true));
  }
  async totalXp(userId: string) {
    return (await this.one(`SELECT coalesce(sum(xp), 0) AS xp FROM daily_user_xp WHERE user_id = $1`, [userId], (r) => Number(r.xp))) ?? 0;
  }
  async xpByExercise(userId: string) {
    const out: Record<Exercise, number> = { squat: 0, pushup: 0, pullup: 0 };
    const { rows } = await this.pool.query(
      `SELECT s.exercise, sum(x.amount) AS xp FROM xp_ledger x JOIN workout_sessions s ON s.id = x.session_id
       WHERE x.user_id = $1 GROUP BY s.exercise`, [userId]);
    for (const r of rows) out[r.exercise as Exercise] = Number(r.xp);
    return out;
  }
  async board(crewId: string): Promise<BoardRow[]> {
    const { rows } = await this.pool.query(
      `SELECT b.user_id, b.display_name, b.xp_7d, b.streak_days, b.rank,
              EXISTS (SELECT 1 FROM daily_user_reps r WHERE r.user_id = b.user_id AND r.day = ${TODAY} AND r.valid_reps > 0) AS done_today
       FROM crew_leaderboard_7d b WHERE b.crew_id = $1 ORDER BY b.rank, b.display_name`, [crewId]);
    return rows.map((r) => ({
      userId: r.user_id, displayName: r.display_name, xp7d: Number(r.xp_7d), streakDays: Number(r.streak_days),
      rank: Number(r.rank), doneToday: r.done_today,
    }));
  }

  async logMessage(m: { userId?: string | null; crewId?: string | null; kind: MessageKind; dedupeKey?: string | null; body: string }) {
    const { rowCount } = await this.pool.query(
      `INSERT INTO messages_log (user_id, crew_id, kind, dedupe_key, body) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (dedupe_key) DO NOTHING`,
      [m.userId ?? null, m.crewId ?? null, m.kind, m.dedupeKey ?? null, m.body]);
    return rowCount === 1;
  }
  async agentMessagesToday(userId: string) {
    return (await this.one(
      `SELECT count(*) AS n FROM messages_log WHERE user_id = $1 AND kind <> 'reply' AND ts >= ${TODAY}`,
      [userId], (r) => Number(r.n))) ?? 0;
  }
}
