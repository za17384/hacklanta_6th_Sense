import { createApp } from "./app";
import { env } from "./env";
import { createMessenger, createTransport } from "./messaging";
import { CrewAgent } from "./services/crewAgent";
import { createStore } from "./store";

const store = await createStore();
const transport = await createTransport();
const messenger = createMessenger(store, transport);
const agent = new CrewAgent(store, messenger);

// Single-process mode (dev/demo): the API also runs the inbound loop + scheduler.
// In docker-compose, the `agent` service does this instead (RUN_AGENT_IN_API=false here).
if (env.RUN_AGENT_IN_API) {
  messenger.onInbound((m) => agent.handleInbound(m));
  agent.startScheduler();
}

const app = createApp({ store, messenger, transport, agent });
console.log(`🎤 Rep Rally API on :${env.PORT} (DEMO_MODE=${env.DEMO_MODE}, store=${store.kind}, messenger=${transport.name})`);

export default { port: env.PORT, fetch: app.fetch, idleTimeout: 120 };
