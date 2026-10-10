import { seedDemo } from "../../../../db/seed/seed_demo";
import { env } from "../env";
import { MemoryStore } from "./memory";
import { PgStore, makePool } from "./pg";
import type { Store } from "./types";

export type { Store } from "./types";

/** DATABASE_URL set → Postgres/Tiger Cloud. Otherwise (DEMO_MODE) → in-memory store with the demo crew seeded. */
export async function createStore(): Promise<Store> {
  if (env.DATABASE_URL) {
    const pool = makePool(env.DATABASE_URL);
    await pool.query("SELECT 1");
    console.log("[store] Postgres/TimescaleDB connected");
    return new PgStore(pool);
  }
  const store = new MemoryStore();
  await seedDemo(store);
  console.log("[store] in-memory store (DEMO) — seeded Demo Crew, invite code DEMO");
  return store;
}
