import type { Exercise, RepEvent, ScoreBreakdown, SessionSource } from "@rep-rally/shared";

// Thin typed client for apps/api. Every call can fail (bad venue Wi-Fi); callers
// fall back to local scoring so the set is never lost on screen.

export interface CrewInfo { id: string; name: string; inviteCode: string; inviteUrl: string }
export interface LevelInfo { level: number; title: string; intoLevel: number; levelSpan: number }
export interface Me extends LevelInfo {
  user: { id: string; displayName: string; phone: string | null; smsConsent: boolean; optedOut: boolean };
  totalXp: number;
  nextLevelXp: number;
  stats: { STR: number; LEGS: number; GRIT: number };
  streakDays: number;
  validRepsToday: number;
  doneToday: boolean;
  crews: CrewInfo[];
}
export interface BoardRow { userId: string; displayName: string; xp7d: number; streakDays: number; rank: number; doneToday: boolean }
export interface Health { ok: boolean; demoMode: boolean; store: string; messenger: string; mode: string }
export interface CompleteResult {
  breakdown: ScoreBreakdown;
  levelBefore: LevelInfo;
  levelAfter: LevelInfo;
  crewNotified: number;
}

export class ApiError extends Error {
  constructor(readonly status: number, msg: string) { super(msg); }
}

async function call<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    ...init,
    headers: init?.json !== undefined ? { "content-type": "application/json" } : undefined,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    signal: init?.signal ?? AbortSignal.timeout(10_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? res.statusText);
  return data as T;
}

export const api = {
  health: () => call<Health>("/health", { signal: AbortSignal.timeout(4000) }),
  invite: (code: string) => call<{ crewName: string; memberCount: number }>(`/invite/${encodeURIComponent(code)}`),
  join: (b: { displayName: string; phone: string; inviteCode?: string; consent: boolean }) =>
    call<{ crew: CrewInfo; welcome: string }>("/join", { method: "POST", json: b }),
  me: () => call<Me>("/me"),
  createCrew: (name: string) => call<{ crewId: string; inviteCode: string; inviteUrl: string }>("/crews", { method: "POST", json: { name } }),
  startSession: (exercise: Exercise, source: SessionSource) =>
    call<{ sessionId: string }>("/sessions", { method: "POST", json: { exercise, source, startedAt: new Date().toISOString() } }),
  completeSession: (id: string, repEvents: RepEvent[]) =>
    call<CompleteResult>(`/sessions/${id}/complete`, { method: "POST", json: { repEvents }, signal: AbortSignal.timeout(15_000) }),
  board: (crewId: string) => call<{ crew: CrewInfo; rows: BoardRow[]; me: string }>(`/crews/${crewId}/board`),
  nudge: (crewId: string, userId: string) => call<{ result: string }>(`/crews/${crewId}/nudge`, { method: "POST", json: { userId } }),
  demoText: (text: string) => call<{ ok: true }>("/demo/inbound", { method: "POST", json: { text } }),
};
