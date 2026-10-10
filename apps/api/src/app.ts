import { EXERCISES, levelFor, stats, xpForLevel, type Exercise, type RepEvent, type SessionSource } from "@rep-rally/shared";
import { Hono, type Context } from "hono";
import { getSignedCookie, setSignedCookie } from "hono/cookie";
import { streamSSE } from "hono/streaming";
import { env } from "./env";
import { localDay } from "./lib/time";
import { ConsoleTransport, demoFeed, feedHistory, type FeedItem } from "./messaging/console";
import type { CrewMessenger, MessageTransport } from "./messaging";
import type { CrewAgent } from "./services/crewAgent";
import { recordSet } from "./services/workouts";
import type { Store, User } from "./store/types";

// HACKATHON SIMPLIFICATION: auth is a signed httpOnly cookie holding the user id,
// issued after /join. No passwords; phone numbers are not verified.
const COOKIE = "rr_session";

export interface Deps { store: Store; messenger: CrewMessenger; transport: MessageTransport; agent: CrewAgent }

export function normalizePhone(raw: string): string | null {
  const s = raw.trim();
  const digits = s.replace(/\D/g, "");
  if (s.startsWith("+") && digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`; // HACKATHON SIMPLIFICATION: US default
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export function createApp({ store, messenger, transport, agent }: Deps) {
  const app = new Hono().basePath("/api");

  const currentUser = async (c: Context): Promise<User | null> => {
    const id = await getSignedCookie(c, env.SESSION_SECRET, COOKIE);
    return id ? store.getUser(id) : null;
  };
  const requireUser = async (c: Context) => {
    const u = await currentUser(c);
    if (!u) throw new HttpError(401, "not signed in");
    return u;
  };

  app.onError((err, c) => {
    if (err instanceof HttpError) return c.json({ error: err.message }, err.status as 400);
    if (err instanceof SyntaxError) return c.json({ error: "invalid JSON body" }, 400);
    console.error(err);
    return c.json({ error: "internal error" }, 500);
  });

  app.get("/health", (c) => c.json({
    ok: true, demoMode: env.DEMO_MODE, store: store.kind, messenger: messenger.transportName, mode: env.CREW_MESSAGE_MODE,
  }));

  app.get("/invite/:code", async (c) => {
    const crew = await store.findCrewByInvite(c.req.param("code"));
    if (!crew) return c.json({ error: "unknown invite code" }, 404);
    const members = await store.crewMembers(crew.id);
    return c.json({ crewName: crew.name, memberCount: members.length });
  });

  app.post("/join", async (c) => {
    const body = await c.req.json<{ displayName?: string; phone?: string; inviteCode?: string; consent?: boolean }>();
    const displayName = (body.displayName ?? "").trim().slice(0, 40);
    if (!displayName) throw new HttpError(400, "name required");
    const phone = body.phone ? normalizePhone(body.phone) : null;
    if (body.phone && !phone) throw new HttpError(400, "phone must be a valid number, e.g. +1 404 555 0123");

    let user = phone ? await store.findUserByPhone(phone) : null;
    if (user) {
      await store.updateUser(user.id, { displayName, smsConsent: !!body.consent });
      user = (await store.getUser(user.id))!;
    } else {
      user = await store.createUser({ displayName, phone, smsConsent: !!body.consent });
    }

    let crew = body.inviteCode ? await store.findCrewByInvite(body.inviteCode) : null;
    if (body.inviteCode && !crew) throw new HttpError(404, "unknown invite code");
    if (!crew) crew = (await store.crewsForUser(user.id))[0] ?? (await store.createCrew(`${displayName}'s Crew`, user.id));
    await store.addMember(crew.id, user.id);

    await setSignedCookie(c, COOKIE, user.id, env.SESSION_SECRET, {
      httpOnly: true, sameSite: "Lax", secure: !env.APP_BASE_URL.startsWith("http://"), path: "/", maxAge: 60 * 60 * 24 * 30,
    });
    const welcome = body.consent ? await agent.welcome(user, crew) : "no_consent";
    return c.json({ user: publicUser(user), crew: { id: crew.id, name: crew.name, inviteCode: crew.inviteCode, inviteUrl: inviteUrl(crew.inviteCode) }, welcome });
  });

  app.post("/crews", async (c) => {
    const user = await requireUser(c);
    const { name } = await c.req.json<{ name?: string }>();
    if (!name?.trim()) throw new HttpError(400, "name required");
    const crew = await store.createCrew(name.trim().slice(0, 40), user.id);
    await store.addMember(crew.id, user.id);
    return c.json({ crewId: crew.id, inviteCode: crew.inviteCode, inviteUrl: inviteUrl(crew.inviteCode) });
  });

  app.get("/me", async (c) => {
    const user = await requireUser(c);
    const [xp, byEx, streak, today, crews] = await Promise.all([
      store.totalXp(user.id), store.xpByExercise(user.id), store.streakDays(user.id), store.validRepsToday(user.id), store.crewsForUser(user.id),
    ]);
    const lv = levelFor(xp);
    return c.json({
      user: publicUser(user),
      totalXp: xp, ...lv, nextLevelXp: xpForLevel(lv.level + 1),
      stats: stats(byEx, streak),
      streakDays: streak, validRepsToday: today, doneToday: today > 0,
      crews: crews.map((cr) => ({ id: cr.id, name: cr.name, inviteCode: cr.inviteCode, inviteUrl: inviteUrl(cr.inviteCode) })),
    });
  });

  app.post("/sessions", async (c) => {
    const user = await requireUser(c);
    const b = await c.req.json<{ exercise: Exercise; startedAt?: string; source?: SessionSource }>();
    if (!EXERCISES.includes(b.exercise)) throw new HttpError(400, "bad exercise");
    const source: SessionSource = b.source === "video_file" ? "video_file" : "live"; // clients can't create 'seed'
    const s = await store.createSession({ userId: user.id, exercise: b.exercise, source, startedAt: b.startedAt ? new Date(b.startedAt) : new Date() });
    return c.json({ sessionId: s.id });
  });

  app.post("/sessions/:id/complete", async (c) => {
    const user = await requireUser(c);
    const session = await store.getSession(c.req.param("id"));
    if (!session || session.userId !== user.id) throw new HttpError(404, "session not found");
    if (session.endedAt) throw new HttpError(409, "session already completed");
    const { repEvents } = await c.req.json<{ repEvents: RepEvent[] }>();
    if (!Array.isArray(repEvents) || repEvents.length > 500) throw new HttpError(400, "repEvents must be an array (≤ 500)");

    const xpBefore = await store.totalXp(user.id);
    const breakdown = await recordSet(store, session, repEvents);
    const xpAfter = xpBefore + breakdown.totalXp;
    const notified = await agent.onSetCompleted(user, session, breakdown);
    return c.json({
      breakdown,
      levelBefore: levelFor(xpBefore), levelAfter: levelFor(xpAfter),
      crewNotified: Object.values(notified).filter((r) => r === "sent").length,
      notifyResults: notified,
    });
  });

  app.get("/crews/:id/board", async (c) => {
    const user = await requireUser(c);
    const crewId = c.req.param("id");
    const crew = await store.getCrew(crewId);
    if (!crew) throw new HttpError(404, "crew not found");
    const rows = await store.board(crewId);
    if (!rows.some((r) => r.userId === user.id)) throw new HttpError(403, "not a member");
    return c.json({ crew: { id: crew.id, name: crew.name, inviteCode: crew.inviteCode, inviteUrl: inviteUrl(crew.inviteCode) }, rows, day: localDay(), me: user.id });
  });

  app.post("/crews/:id/nudge", async (c) => {
    const user = await requireUser(c);
    const { userId } = await c.req.json<{ userId: string }>();
    const members = await store.crewMembers(c.req.param("id"));
    if (!members.some((m) => m.id === user.id) || !members.some((m) => m.id === userId)) throw new HttpError(403, "not in this crew");
    return c.json({ result: await agent.nudge(user, userId) });
  });

  app.post("/admin/run-reminders", async (c) => {
    if (c.req.header("authorization") !== `Bearer ${env.ADMIN_TOKEN}`) throw new HttpError(401, "bad admin token");
    const b = await c.req.json<{ kind?: "reminder" | "streak_risk"; force?: boolean; ignoreQuietHours?: boolean }>().catch(() => ({} as never));
    const kind = b?.kind === "streak_risk" ? "streak_risk" : "reminder";
    return c.json({ kind, results: await agent.runReminders(kind, { force: b?.force ?? true, ignoreQuietHours: b?.ignoreQuietHours ?? true }) });
  });

  // ── DEMO_MODE only: fake phone panel ───────────────────────────────────────
  if (env.DEMO_MODE) {
    app.get("/demo/feed", (c) => streamSSE(c, async (stream) => {
      for (const item of feedHistory()) await stream.writeSSE({ data: JSON.stringify(item) });
      const onItem = (item: FeedItem) => void stream.writeSSE({ data: JSON.stringify(item) });
      demoFeed.on("item", onItem);
      stream.onAbort(() => { demoFeed.off("item", onItem); });
      while (!stream.aborted) await stream.sleep(15_000).then(() => stream.writeSSE({ event: "ping", data: "" }));
    }));

    /** Simulate texting the agent (only when using the console transport). */
    app.post("/demo/inbound", async (c) => {
      if (!(transport instanceof ConsoleTransport)) throw new HttpError(400, "inbound simulation needs MESSENGER=console");
      const user = await requireUser(c);
      const { text } = await c.req.json<{ text: string }>();
      if (!user.phone) throw new HttpError(400, "add a phone number to text the agent");
      await transport.simulateInbound(user.phone, String(text ?? "").slice(0, 300));
      return c.json({ ok: true });
    });
  }

  return app;
}

class HttpError extends Error {
  constructor(readonly status: number, msg: string) { super(msg); }
}

const inviteUrl = (code: string) => `${env.APP_BASE_URL}/join/${code}`;
const publicUser = (u: User) => ({ id: u.id, displayName: u.displayName, phone: u.phone, smsConsent: u.smsConsent, optedOut: u.optedOut });
