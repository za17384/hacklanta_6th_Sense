import { EventEmitter } from "node:events";
import type { InboundMessage, MessageTransport } from "./transport";

// DEMO_MODE transport. Logs every message and streams it to /api/demo/feed
// (SSE) for the on-screen fake phone. Inbound "texts" come from
// POST /api/demo/inbound, so the agent can be demoed with no iMessage account.

export interface FeedItem {
  id: number;
  ts: string;
  direction: "out" | "in";
  to?: string;
  from?: string;
  group?: string;
  text: string;
}

export const demoFeed = new EventEmitter();
const history: FeedItem[] = [];
let seq = 0;

export function feedHistory() { return history.slice(-100); }

function emit(item: Omit<FeedItem, "id" | "ts">) {
  const full = { ...item, id: ++seq, ts: new Date().toISOString() };
  history.push(full);
  if (history.length > 500) history.shift();
  demoFeed.emit("item", full);
}

export class ConsoleTransport implements MessageTransport {
  readonly name = "console" as const;
  private handler: ((m: InboundMessage) => Promise<void>) | null = null;

  async sendToAddress(address: string, text: string) {
    console.log(`📱 → ${address}: ${text}`);
    emit({ direction: "out", to: address, text });
    return `console-dm:${address}`;
  }

  async sendToGroup(spaceId: string, text: string) {
    console.log(`📱 → [group ${spaceId}]: ${text}`);
    emit({ direction: "out", group: spaceId, text });
  }

  listen(handler: (m: InboundMessage) => Promise<void>) { this.handler = handler; }

  /** Simulate an inbound text (fake phone panel). */
  async simulateInbound(from: string, text: string) {
    emit({ direction: "in", from, text });
    if (!this.handler) return;
    await this.handler({
      from, text, spaceId: `console-dm:${from}`, isGroup: false,
      reply: async (t) => { await this.sendToAddress(from, t); },
    });
  }
}
