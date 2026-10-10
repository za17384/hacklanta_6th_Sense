// ── Messaging plug-in boundary ───────────────────────────────────────────────
// A transport only moves text to/from an address. Policy (consent, STOP, quiet
// hours, caps, dedupe, fan-out vs group) lives in CrewMessenger, so every
// transport (Photon iMessage, console/demo, anything later) gets it for free.

export interface InboundMessage {
  /** Sender address: E.164 phone or email. */
  from: string;
  text: string;
  spaceId: string;
  isGroup: boolean;
  reply(text: string): Promise<void>;
}

export interface MessageTransport {
  readonly name: "photon" | "console";
  /** Send a DM. Returns the DM space id so callers can cache it. */
  sendToAddress(address: string, text: string, knownSpaceId?: string | null): Promise<string | null>;
  /** Post to an existing group space (needs a Photon dedicated line). */
  sendToGroup(spaceId: string, text: string): Promise<void>;
  /** Start receiving inbound messages. Only the agent process should call this. */
  listen(handler: (msg: InboundMessage) => Promise<void>): void;
  stop?(): Promise<void>;
}
