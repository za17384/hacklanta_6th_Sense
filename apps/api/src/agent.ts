// Agent process: Photon inbound-message loop + reminder scheduler.
// Same image as the API, different command (see infra/docker-compose.yml).
import { createMessenger, createTransport } from "./messaging";
import { CrewAgent } from "./services/crewAgent";
import { createStore } from "./store";

const store = await createStore();
const transport = await createTransport();
const messenger = createMessenger(store, transport);
const agent = new CrewAgent(store, messenger);

messenger.onInbound((m) => agent.handleInbound(m));
agent.startScheduler();
console.log(`🤖 Rep Rally agent listening (store=${store.kind}, messenger=${transport.name})`);

process.on("SIGTERM", async () => { await transport.stop?.(); process.exit(0); });
