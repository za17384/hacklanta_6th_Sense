// DEMO SEED DATA — clearly labeled, source='seed'. Not real users or workouts.
// Creates "Demo Crew" (invite code DEMO) with four fictional members and
// 7 days of history. Seeded users have sms_consent=false, so the agent never
// texts their fictional 555-01xx numbers.
//
// In-memory mode the API calls seedDemo() on boot. Against Postgres:
//   DATABASE_URL=... bun run db/seed/seed_demo.ts
import type { Exercise, RepEvent } from "@rep-rally/shared";
import { recordSet } from "../../apps/api/src/services/workouts";
import type { Store } from "../../apps/api/src/store/types";

const MEMBERS: { name: string; phone: string; days: number[]; exercise: Exercise; reps: [number, number]; form: number }[] = [
  // days = how many days ago they worked out (0 = today)
  { name: "Sam (demo)",    phone: "+15555550101", days: [1, 2, 3, 4, 5, 6],  exercise: "squat",  reps: [18, 26], form: 0.92 },
  { name: "Priya (demo)",  phone: "+15555550102", days: [0, 1, 2, 4, 5, 6],  exercise: "pushup", reps: [14, 22], form: 0.88 },
  { name: "Jordan (demo)", phone: "+15555550103", days: [2, 3, 5],          exercise: "squat",  reps: [12, 20], form: 0.8 },
  { name: "Alex (demo)",   phone: "+15555550104", days: [1, 3, 6],          exercise: "pullup", reps: [8, 12],  form: 0.85 },
];

// Deterministic PRNG so every demo boot looks the same.
let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const between = (a: number, b: number) => a + rand() * (b - a);

function fakeReps(start: Date, n: number, exercise: Exercise, form: number): RepEvent[] {
  const tempo = exercise === "pushup" ? 2.2 : exercise === "pullup" ? 3 : 2.8;
  let t = start.getTime();
  return Array.from({ length: n }, (_, i) => {
    const shallow = rand() > form;
    const durationS = Math.round(between(tempo - 0.4, tempo + 0.4) * 100) / 100;
    const r: RepEvent = {
      repIndex: i, ts: t, durationS, eccentricS: durationS / 2, concentricS: durationS / 2,
      minAngleDeg: shallow ? 120 : 85, valid: !shallow, formScore: shallow ? 0.4 : rand() > 0.8 ? 0.8 : 1,
      depthPass: !shallow, lockoutPass: true, secondaryPass: true, flags: shallow ? ["go deeper"] : [],
    };
    t += durationS * 1000 + 600;
    return r;
  });
}

export async function seedDemo(store: Store) {
  if (await store.findCrewByInvite("DEMO")) return null;
  const crew = await store.createCrew("Demo Crew", null, "DEMO");
  const now = new Date();
  for (const m of MEMBERS) {
    const user = await store.createUser({ displayName: m.name, phone: m.phone, smsConsent: false });
    await store.addMember(crew.id, user.id);
    const days = [...m.days].sort((a, b) => b - a); // oldest first so streaks build up
    let streak = 0, prev: number | null = null;
    for (const ago of days) {
      streak = prev !== null && prev - ago === 1 ? streak + 1 : 1;
      prev = ago;
      const at = new Date(now.getTime() - ago * 86400_000);
      at.setHours(ago === 0 ? Math.max(0, now.getHours() - 1) : 12 + Math.floor(rand() * 6), Math.floor(rand() * 60));
      if (at > now) at.setTime(now.getTime() - 3600_000);
      const n = Math.round(between(...m.reps));
      const session = await store.createSession({ userId: user.id, exercise: m.exercise, source: "seed", startedAt: at });
      const reps = fakeReps(at, n, m.exercise, m.form);
      const end = new Date(reps.at(-1)!.ts + 3000);
      const validCount = reps.filter((r) => r.valid).length;
      await recordSet(store, session, reps, { at: end, streakOverride: validCount >= 10 ? streak : 0, dailyShowOverride: true });
    }
  }
  return crew;
}

if (import.meta.main) {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("Set DATABASE_URL to seed Postgres. (In-memory DEMO_MODE seeds automatically.)"); process.exit(1); }
  const { PgStore, makePool } = await import("../../apps/api/src/store/pg");
  const pool = makePool(url);
  const crew = await seedDemo(new PgStore(pool));
  console.log(crew ? `seeded Demo Crew (invite DEMO) ${crew.id}` : "Demo Crew already exists — skipped");
  await pool.end();
}
