import type { MessageKind } from "@rep-rally/shared";
import { isQuietHours } from "../lib/time";
import type { Store } from "../store/types";
import type { InboundMessage, MessageTransport } from "./transport";

// The spec's CrewMessenger: transport + guardrails.
//   - only text users who consented and haven't opted out
//   - quiet hours 22:00–08:00 ET for agent-initiated messages
//   - max 4 agent-initiated messages per user per day
//   - dedupe via messages_log.dedupe_key
// Replies to inbound texts skip quiet hours/caps (the user just texted us),
// but still respect STOP (except the reply that confirms STOP/START).

export interface SendOpts {
  dedupeKey?: string;
  crewId?: string;
  /** Replies and STOP/START confirmations bypass quiet hours + daily cap. */
  isReply?: boolean;
  ignoreQuietHours?: boolean;
}

export type SendResult = "sent" | "no_consent" | "opted_out" | "quiet_hours" | "daily_cap" | "duplicate" | "no_phone" | "error";

export interface CrewMessenger {
  sendDM(userId: string, text: string, kind: MessageKind, opts?: SendOpts): Promise<SendResult>;
  broadcastToCrew(crewId: string, text: string | ((recipientId: string) => string), opts?: { excludeUserId?: string; kind?: MessageKind; dedupeKey?: string }): Promise<Record<string, SendResult>>;
  onInbound(handler: (msg: InboundMessage) => Promise<void>): void;
  readonly transportName: string;
}

const DAILY_CAP = 4;

export class GuardedCrewMessenger implements CrewMessenger {
  constructor(private store: Store, private transport: MessageTransport, private mode: "fanout" | "group") {}

  get transportName() { return this.transport.name; }

  async sendDM(userId: string, text: string, kind: MessageKind, opts: SendOpts = {}): Promise<SendResult> {
    const u = await this.store.getUser(userId);
    if (!u?.phone) return "no_phone";
    if (!u.smsConsent) return "no_consent";
    if (u.optedOut && !opts.isReply) return "opted_out";
    if (!opts.isReply) {
      if (!opts.ignoreQuietHours && isQuietHours()) return "quiet_hours";
      if ((await this.store.agentMessagesToday(userId)) >= DAILY_CAP) return "daily_cap";
    }
    // Log first: the unique dedupe_key is the lock that prevents double sends.
    const fresh = await this.store.logMessage({ userId, crewId: opts.crewId, kind, dedupeKey: opts.dedupeKey, body: text });
    if (!fresh) return "duplicate";
    try {
      const spaceId = await this.transport.sendToAddress(u.phone, text, u.imessageDmSpaceId);
      if (spaceId && spaceId !== u.imessageDmSpaceId) await this.store.updateUser(userId, { imessageDmSpaceId: spaceId });
      return "sent";
    } catch (e) {
      console.error(`[messenger] send to ${userId} failed`, e);
      return "error";
    }
  }

  async broadcastToCrew(
    crewId: string,
    text: string | ((recipientId: string) => string),
    opts: { excludeUserId?: string; kind?: MessageKind; dedupeKey?: string } = {},
  ) {
    const kind = opts.kind ?? "completion";
    const crew = await this.store.getCrew(crewId);
    const results: Record<string, SendResult> = {};
    if (this.mode === "group" && crew?.imessageGroupSpaceId && typeof text === "string") {
      const fresh = await this.store.logMessage({ crewId, kind, dedupeKey: opts.dedupeKey ? `${opts.dedupeKey}:group` : null, body: text });
      if (fresh) await this.transport.sendToGroup(crew.imessageGroupSpaceId, text);
      results.group = fresh ? "sent" : "duplicate";
      return results;
    }
    // Fan-out: individual DMs (works on Photon's free shared-line pool).
    for (const m of await this.store.crewMembers(crewId)) {
      if (m.id === opts.excludeUserId) continue;
      const body = typeof text === "function" ? text(m.id) : text;
      results[m.id] = await this.sendDM(m.id, body, kind, {
        crewId, dedupeKey: opts.dedupeKey ? `${opts.dedupeKey}:${m.id}` : undefined,
      });
    }
    return results;
  }

  onInbound(handler: (msg: InboundMessage) => Promise<void>) { this.transport.listen(handler); }
}
