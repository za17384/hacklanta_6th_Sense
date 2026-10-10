// Central config. Every external integration is selected here, so swapping a
// mock for the real thing is an env change, never a code change.

const bool = (v: string | undefined, d = false) => (v === undefined || v === "" ? d : /^(1|true|yes)$/i.test(v));

export const env = {
  DEMO_MODE: bool(process.env.DEMO_MODE, true),
  PORT: Number(process.env.PORT ?? 8080),
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  MESSENGER: (process.env.MESSENGER ?? "console") as "console" | "photon",
  CREW_MESSAGE_MODE: (process.env.CREW_MESSAGE_MODE ?? "fanout") as "fanout" | "group",
  SPECTRUM_PROJECT_ID: process.env.SPECTRUM_PROJECT_ID ?? "",
  SPECTRUM_PROJECT_SECRET: process.env.SPECTRUM_PROJECT_SECRET ?? "",
  SESSION_SECRET: process.env.SESSION_SECRET || "dev-only-session-secret",
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || "dev-admin",
  APP_BASE_URL: process.env.APP_BASE_URL ?? "http://localhost:5173",
  /** Run the inbound-message loop + reminder scheduler inside the API process (single-process dev/demo). */
  RUN_AGENT_IN_API: bool(process.env.RUN_AGENT_IN_API, true),
  SOLANA_ENABLED: bool(process.env.SOLANA_ENABLED, false),
};

if (!env.DEMO_MODE) {
  for (const k of ["DATABASE_URL", "SESSION_SECRET", "ADMIN_TOKEN"] as const) {
    if (!process.env[k]) throw new Error(`${k} is required when DEMO_MODE=false`);
  }
}

/** HACKATHON SIMPLIFICATION: one timezone for every user. */
export const TZ = "America/New_York";
