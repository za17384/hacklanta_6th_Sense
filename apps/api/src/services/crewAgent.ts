import { levelFor, type ScoreBreakdown } from "@rep-rally/shared";
import { env } from "../env";
import { localDay, localMinutes } from "../lib/time";
import type { CrewMessenger, InboundMessage, SendResult } from "../messaging";
import { T, boardLine, gapLine } from "../messaging/templates";
import type { Crew, Store, User, WorkoutSession } from "../store/types";

// The iMessage agent's behaviour. Transport-agnostic: runs identically on
// Photon (real phones) and the console transport (fake phone panel).

export class CrewAgent {
  constructor(private store: Store, private messenger: CrewMessenger) {}

  // 1. Welcome DM after join
  async welcome(user: User, crew: Crew) {
    const others = (await this.store.crewMembers(crew.id)).filter((m) => m.id !== user.id).map((m) => m.displayName);
    return this.messenger.sendDM(user.id, T.welcome(user.displayName, crew.name, others.slice(0, 4), env.APP_BASE_URL), "welcome", {
      crewId: crew.id, dedupeKey: `welcome:${user.id}:${crew.id}`, ignoreQuietHours: true,
    });
  }

  // 2. Completion broadcast (fan-out DMs, personalised per recipient)
  async onSetCompleted(user: User, session: WorkoutSession, b: ScoreBreakdown) {
    const out: Record<string, SendResult> = {};
    if (b.validReps === 0) return out;
    for (const crew of await this.store.crewsForUser(user.id)) {
      const rows = await this.store.board(crew.id);
      const res = await this.messenger.broadcastToCrew(crew.id, (rid) => T.completion({
        name: rid === user.id ? "You" : user.displayName,
        reps: b.validReps,
        exercise: session.exercise,
        formPct: Math.round(b.avgForm * 100),
        streak: b.streakDays,
        xp: b.totalXp,
        board: boardLine(rows, rid),
        gap: gapLine(rows, rid),
      }), { kind: "completion", dedupeKey: `completion:${session.id}` });
      Object.assign(out, res);
    }
    return out;
  }

  // 3 + 4. Daily reminder (18:00 ET) and streak-at-risk (20:30 ET)
  async runReminders(kind: "reminder" | "streak_risk", o: { force?: boolean; ignoreQuietHours?: boolean } = {}) {
    const day = localDay();
    const results: { user: string; result: SendResult }[] = [];
    const seen = new Set<string>();
    for (const crew of await this.store.allCrews()) {
      const rows = await this.store.board(crew.id);
      for (const r of rows) {
        if (seen.has(r.userId) || r.doneToday) continue;
        seen.add(r.userId);
        let text: string | null;
        if (kind === "streak_risk") {
          text = r.streakDays >= 2 ? T.streakRisk(r.displayName, r.streakDays) : null;
        } else if (rows.length < 2) {
          text = T.reminderSolo(r.displayName);
        } else if (r.rank === 1) {
          const second = rows.find((x) => x.userId !== r.userId)!;
          text = T.reminderLeader(r.displayName, second.displayName, r.xp7d - second.xp7d);
        } else {
          const idx = rows.indexOf(r);
          const ahead = rows[Math.max(0, idx - 1)]!;
          text = T.reminderChasing(r.displayName, ahead.xp7d - r.xp7d, ahead.displayName);
        }
        if (!text) continue;
        // force=true (admin demo trigger) uses a unique key so it can fire more than once a day.
        const dedupeKey = `${kind}:${r.userId}:${day}${o.force ? `:${Date.now()}` : ""}`;
        const result = await this.messenger.sendDM(r.userId, text, kind, { crewId: crew.id, dedupeKey, ignoreQuietHours: o.ignoreQuietHours });
        results.push({ user: r.displayName, result });
      }
    }
    return results;
  }

  async nudge(from: User, toUserId: string) {
    const to = await this.store.getUser(toUserId);
    if (!to) return "no_phone" as SendResult;
    return this.messenger.sendDM(to.id, T.nudge(from.displayName, to.displayName), "nudge", {
      dedupeKey: `nudge:${from.id}:${to.id}:${localDay()}`,
    });
  }

  // 5. Inbound commands
  async handleInbound(msg: InboundMessage) {
    const user = await this.store.findUserByPhone(msg.from);
    const reply = async (text: string) => {
      await this.store.logMessage({ userId: user?.id, kind: "reply", body: text });
      await msg.reply(text);
    };
    if (!user) return reply(T.notMember());

    const [cmdRaw, ...rest] = msg.text.trim().split(/\s+/);
    const cmd = (cmdRaw ?? "").toUpperCase();

    if (cmd === "STOP") { await this.store.updateUser(user.id, { optedOut: true }); return reply(T.stop()); }
    if (cmd === "START") { await this.store.updateUser(user.id, { optedOut: false }); return reply(T.start()); }
    if (user.optedOut) return; // STOP is honoured: silence until START

    const crew = (await this.store.crewsForUser(user.id))[0];
    switch (cmd) {
      case "BOARD": {
        if (!crew) return reply("You're not in a crew yet.");
        const rows = await this.store.board(crew.id);
        const lines = rows.slice(0, 5).map((r) =>
          `${r.rank}. ${r.userId === user.id ? `${r.displayName} (you)` : r.displayName} — ${r.xp7d.toLocaleString("en-US")} XP${r.streakDays ? ` 🔥${r.streakDays}` : ""}${r.doneToday ? " ✅" : ""}`);
        return reply(`🏆 ${crew.name} Headliner Board (7d)\n${lines.join("\n")}\n${gapLine(rows, user.id)}`);
      }
      case "ME": {
        const xp = await this.store.totalXp(user.id);
        const lv = levelFor(xp);
        const streak = await this.store.streakDays(user.id);
        const today = await this.store.validRepsToday(user.id);
        return reply(`🎤 ${user.displayName}: Lv ${lv.level} ${lv.title} · ${xp.toLocaleString("en-US")} XP · 🔥 ${streak}-day streak · ${today ? `✅ ${today} reps today` : "no set yet today"}`);
      }
      case "STREAK": {
        const streak = await this.store.streakDays(user.id);
        const today = await this.store.validRepsToday(user.id);
        return reply(streak
          ? `🔥 ${streak}-day streak.${today >= 10 ? " Today's locked in." : ` ${10 - today} more clean reps today keeps it going.`}`
          : "No streak yet — 10 clean reps today starts one 🔥");
      }
      case "NUDGE": {
        if (!crew) return reply("You're not in a crew yet.");
        const name = rest.join(" ").toLowerCase();
        const target = (await this.store.crewMembers(crew.id)).find((m) => m.id !== user.id && m.displayName.toLowerCase().startsWith(name));
        if (!name || !target) return reply("Who? Try NUDGE <name> with someone in your crew.");
        const r = await this.nudge(user, target.id);
        return reply(r === "sent" ? `👋 Nudged ${target.displayName}.` : `Couldn't nudge ${target.displayName} right now (${r.replace("_", " ")}).`);
      }
      case "HELP": return reply(T.help());
      default: return reply(T.unknown());
    }
  }

  /** Minute-tick scheduler. Dedupe keys make each reminder fire at most once per user per day. */
  startScheduler() {
    const tick = async () => {
      const m = localMinutes();
      try {
        if (m >= 18 * 60 && m < 22 * 60) await this.runReminders("reminder");
        if (m >= 20 * 60 + 30 && m < 22 * 60) await this.runReminders("streak_risk");
      } catch (e) { console.error("[scheduler]", e); }
    };
    return setInterval(tick, 60_000);
  }
}
