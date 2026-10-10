import { env } from "../env";
import type { Store } from "../store/types";
import { ConsoleTransport } from "./console";
import { GuardedCrewMessenger } from "./crewMessenger";
import { PhotonTransport } from "./photon";
import type { MessageTransport } from "./transport";

export * from "./crewMessenger";
export type { InboundMessage, MessageTransport } from "./transport";

/** MESSENGER=photon → real iMessage; anything else → console (demo). Falls back to console if Photon can't connect. */
export async function createTransport(): Promise<MessageTransport> {
  if (env.MESSENGER === "photon") {
    try {
      const t = await PhotonTransport.connect(env.SPECTRUM_PROJECT_ID, env.SPECTRUM_PROJECT_SECRET);
      console.log("[messaging] Photon Spectrum iMessage transport connected");
      return t;
    } catch (e) {
      if (!env.DEMO_MODE) throw e;
      console.warn("[messaging] Photon unavailable, falling back to console transport:", (e as Error).message);
    }
  }
  console.log("[messaging] console transport (DEMO) — messages appear in the fake phone panel");
  return new ConsoleTransport();
}

export function createMessenger(store: Store, transport: MessageTransport) {
  return new GuardedCrewMessenger(store, transport, env.CREW_MESSAGE_MODE);
}
