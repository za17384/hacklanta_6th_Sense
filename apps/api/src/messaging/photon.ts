import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import type { InboundMessage, MessageTransport } from "./transport";

// Real iMessage via Photon Spectrum (spectrum-ts 12.x, cloud mode).
// Types checked against node_modules/@spectrum-ts/{core,imessage}/dist/*.d.ts:
//   - Spectrum({ projectId, projectSecret, providers: [imessage.config()] })
//   - imessage(app).user(phone) / .space.create(user) / .space.get(id)
//   - app.messages: AsyncIterable<[Space, Message]>; text is content.type === "text" → content.text
// Shared-line (Free/Pro) plans: DMs only, no group creation / group events.

type SpectrumApp = Awaited<ReturnType<typeof createApp>>;

function createApp(projectId: string, projectSecret: string) {
  return Spectrum({ projectId, projectSecret, providers: [imessage.config()] });
}

export class PhotonTransport implements MessageTransport {
  readonly name = "photon" as const;
  private constructor(private app: SpectrumApp) {}

  static async connect(projectId: string, projectSecret: string): Promise<PhotonTransport> {
    if (!projectId || !projectSecret) throw new Error("SPECTRUM_PROJECT_ID / SPECTRUM_PROJECT_SECRET missing");
    return new PhotonTransport(await createApp(projectId, projectSecret));
  }

  private get im() { return imessage(this.app); }

  async sendToAddress(address: string, text: string, knownSpaceId?: string | null) {
    let space;
    if (knownSpaceId) {
      try { space = await this.im.space.get(knownSpaceId); } catch { space = undefined; }
    }
    space ??= await this.im.space.create(await this.im.user(address));
    await space.send(text);
    return space.id ?? null;
  }

  async sendToGroup(spaceId: string, text: string) {
    const space = await this.im.space.get(spaceId);
    await space.send(text);
  }

  listen(handler: (m: InboundMessage) => Promise<void>) {
    void (async () => {
      for await (const [space, message] of this.app.messages) {
        try {
          if (message.direction !== "inbound") continue;
          if (message.content.type !== "text") continue;
          const from = message.sender?.id;
          if (!from) continue;
          const isGroup = imessage.is(space) ? space.type === "group" : false;
          await handler({
            from,
            text: message.content.text,
            spaceId: (space as { id?: string }).id ?? "",
            isGroup,
            reply: async (t) => { await space.responding(async () => { await message.reply(t); }); },
          });
        } catch (e) {
          console.error("[photon] inbound handler failed", e);
        }
      }
    })();
  }

  async stop() { await this.app.stop(); }
}
