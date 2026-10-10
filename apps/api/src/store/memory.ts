import type { Exercise, MessageKind, RepEvent, XpLedgerRow } from "@rep-rally/shared";
import { localDay, prevDay } from "../lib/time";
import type { BoardRow, Crew, SessionSummary, Store, User, WorkoutSession } from "./types";

// DEMO_MODE store: same semantics as the SQL views in db/migrations, in memory.
// Lets the full app run with zero credentials and no Docker. Data resets on restart.

interface RepRow { ts: Date; sessionId: string; userId: string; exercise: Exercise; valid: boolean; formScore: number }
interface LedgerRow { ts: Date; userId: string; sessionId: string | null; source: XpLedgerRow["source"]; amount: number; exercise: Exercise }
interface MsgRow { ts: Date; userId: string | null; crewId: string | null; kind: MessageKind; dedupeKey: string | null; body: string }

const AGENT_KINDS: MessageKind[] = ["welcome", "completion", "reminder", "streak_risk", "nudge"];

export class MemoryStore implements Store {
  readonly kind = "memory" as const;
  private users = new Map<string, User>();
  private crews = new Map<string, Crew>();
  private members: { crewId: string; userId: string; joinedAt: Date }[] = [];
  private sessions = new Map<string, WorkoutSession>();
  private reps: RepRow[] = [];
  private ledger: LedgerRow[] = [];
  private msgs: MsgRow[] = [];

  async createUser(u: { displayName: string; phone: string | null; smsConsent: boolean }): Promise<User> {
    if (u.phone && (await this.findUserByPhone(u.phone))) throw new Error("phone already registered");
    const user: User = { id: crypto.randomUUID(), displayName: u.displayName, phone: u.phone, imessageDmSpaceId: null, smsConsent: u.smsConsent, optedOut: false, createdAt: new Date() };
    this.users.set(user.id, user);
    return user;
  }
  async getUser(id: string) { return this.users.get(id) ?? null; }
  async findUserByPhone(phone: string) { return [...this.users.values()].find((u) => u.phone === phone) ?? null; }
  async updateUser(id: string, patch: Partial<User>) {
    const u = this.users.get(id);
    if (u) Object.assign(u, patch);
  }

  async createCrew(name: string, createdBy: string | null, code?: string): Promise<Crew> {
    const crew: Crew = { id: crypto.randomUUID(), name, inviteCode: code ?? inviteCode(), imessageGroupSpaceId: null, createdBy };
    this.crews.set(crew.id, crew);
    return crew;
  }
  async getCrew(id: string) { return this.crews.get(id) ?? null; }
  async findCrewByInvite(code: string) { return [...this.crews.values()].find((c) => c.inviteCode.toLowerCase() === code.toLowerCase()) ?? null; }
  async addMember(crewId: string, userId: string) {
    if (!this.members.some((m) => m.crewId === crewId && m.userId === userId)) this.members.push({ crewId, userId, joinedAt: new Date() });
  }
  async crewsForUser(userId: string) { return this.members.filter((m) => m.userId === userId).map((m) => this.crews.get(m.crewId)!).filter(Boolean); }
  async crewMembers(crewId: string) { return this.members.filter((m) => m.crewId === crewId).map((m) => this.users.get(m.userId)!).filter(Boolean); }
  async allCrews() { return [...this.crews.values()]; }

  async createSession(s: { userId: string; exercise: Exercise; source: WorkoutSession["source"]; startedAt: Date }) {
    const ws: WorkoutSession = { id: crypto.randomUUID(), ...s, endedAt: null, totalXp: null };
    this.sessions.set(ws.id, ws);
    return ws;
  }
  async getSession(id: string) { return this.sessions.get(id) ?? null; }
  async insertRepEvents(s: WorkoutSession, reps: RepEvent[]) {
    for (const r of reps) this.reps.push({ ts: new Date(r.ts), sessionId: s.id, userId: s.userId, exercise: s.exercise, valid: r.valid, formScore: r.formScore });
  }
  async completeSession(s: WorkoutSession, summary: SessionSummary, ledger: XpLedgerRow[], at: Date) {
    for (const row of ledger) this.ledger.push({ ts: at, userId: s.userId, sessionId: s.id, source: row.source, amount: row.amount, exercise: s.exercise });
    Object.assign(s, { endedAt: at, totalXp: summary.totalXp, summary });
  }

  private showDays(userId: string): Set<string> {
    const perDay = new Map<string, number>();
    for (const r of this.reps) if (r.userId === userId && r.valid) perDay.set(localDay(r.ts), (perDay.get(localDay(r.ts)) ?? 0) + 1);
    return new Set([...perDay].filter(([, n]) => n >= 10).map(([d]) => d));
  }
  async streakDays(userId: string) {
    const days = this.showDays(userId);
    const today = localDay();
    let d = days.has(today) ? today : days.has(prevDay(today)) ? prevDay(today) : null;
    let n = 0;
    while (d && days.has(d)) { n++; d = prevDay(d); }
    return n;
  }
  async validRepsToday(userId: string) {
    const today = localDay();
    return this.reps.filter((r) => r.userId === userId && r.valid && localDay(r.ts) === today).length;
  }
  async hadDailyShowToday(userId: string) {
    const today = localDay();
    return this.ledger.some((l) => l.userId === userId && l.source === "daily_show" && localDay(l.ts) === today);
  }
  async totalXp(userId: string) { return this.ledger.filter((l) => l.userId === userId).reduce((s, l) => s + l.amount, 0); }
  async xpByExercise(userId: string) {
    const out: Record<Exercise, number> = { squat: 0, pushup: 0, pullup: 0 };
    for (const l of this.ledger) if (l.userId === userId) out[l.exercise] += l.amount;
    return out;
  }
  async board(crewId: string): Promise<BoardRow[]> {
    const since = Date.now() - 7 * 86400_000;
    const rows = await Promise.all((await this.crewMembers(crewId)).map(async (u) => ({
      userId: u.id,
      displayName: u.displayName,
      xp7d: this.ledger.filter((l) => l.userId === u.id && l.ts.getTime() >= since).reduce((s, l) => s + l.amount, 0),
      streakDays: await this.streakDays(u.id),
      rank: 0,
      doneToday: (await this.validRepsToday(u.id)) > 0,
    })));
    rows.sort((a, b) => b.xp7d - a.xp7d);
    rows.forEach((r, i) => (r.rank = i > 0 && rows[i - 1]!.xp7d === r.xp7d ? rows[i - 1]!.rank : i + 1));
    return rows;
  }

  async logMessage(m: { userId?: string | null; crewId?: string | null; kind: MessageKind; dedupeKey?: string | null; body: string }) {
    if (m.dedupeKey && this.msgs.some((x) => x.dedupeKey === m.dedupeKey)) return false;
    this.msgs.push({ ts: new Date(), userId: m.userId ?? null, crewId: m.crewId ?? null, kind: m.kind, dedupeKey: m.dedupeKey ?? null, body: m.body });
    return true;
  }
  async agentMessagesToday(userId: string) {
    const today = localDay();
    return this.msgs.filter((m) => m.userId === userId && AGENT_KINDS.includes(m.kind) && localDay(m.ts) === today).length;
  }
}

export function inviteCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => alphabet[b % alphabet.length]).join("");
}
