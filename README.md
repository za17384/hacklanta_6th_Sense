# 🎤 Rep Rally

**A camera-based workout RPG for your crew — built at Hacklanta 2026 (theme: Music Festival).**

Do a set of squats, push-ups, or pull-ups in front of your phone. An on-device pose model counts your reps and rejects bad ones ("no rep!"). Each set earns XP for form, tempo, and consistency, plus a streak boost. An iMessage agent (Photon Spectrum) tells your crew when you finish, posts the Headliner Board, and nudges whoever hasn't shown up today.

> Form feedback and rep counting only. Not medical advice; thresholds are heuristics.

---

## Quick start (zero credentials)

```bash
bun install
bun run fetch-models      # copies MediaPipe WASM + downloads pose models into apps/web/public
cp .env.example .env      # defaults = DEMO_MODE: in-memory DB, seeded demo crew, console messenger
bun dev                   # API :8080 + web :5173
```

Open http://localhost:5173/join/DEMO to join the seeded **Demo Crew**. The 💬 button opens the fake phone, which shows every message the agent would send. You can text the agent from it (`BOARD`, `ME`, `STREAK`, `NUDGE <name>`, `STOP`, `START`, `HELP`).

No camera handy? On the Squats screen, pick **🤖 Synthetic test**: a scripted stick figure does 12 squats, two of them shallow.

```bash
bun test                  # rep engine + scoring tests (synthetic poses)
```

**Phone testing:** browsers only allow the camera on HTTPS or localhost. Use the deployed HTTPS site, or a tunnel (e.g. `cloudflared tunnel --url http://localhost:5173`).

---

## Plug-in map: where each integration lives

Every external piece sits behind an interface with a mock, and you swap implementations with an env var or the registry.

| Concern | Interface | Implementations | Selected by |
|---|---|---|---|
| **Pose model (CV)** | `PoseProvider` — [apps/web/src/vision/types.ts](apps/web/src/vision/types.ts) | `MediaPipePoseProvider` (GPU→CPU fallback), `SyntheticPoseProvider` | [vision/registry.ts](apps/web/src/vision/registry.ts) |
| **Video input** | `FrameSource` — same file | `CameraSource`, `VideoFileSource`, `NoVideoSource` | user's choice on the On Stage screen |
| **Pose → reps** | `PoseFrame` → `RepEngine` — [packages/shared/src/repEngine.ts](packages/shared/src/repEngine.ts) | one generic state machine | — |
| **Exercises** | `ExerciseConfig` — [packages/shared/src/exercises.ts](packages/shared/src/exercises.ts) | squat, push-up, pull-up | add a config to add an exercise |
| **Scoring** | `scoreSet()` — [packages/shared/src/scoring.ts](packages/shared/src/scoring.ts) | shared by web (live) and API (source of truth) | — |
| **Database** | `Store` — [apps/api/src/store/types.ts](apps/api/src/store/types.ts) | `PgStore` (Tiger Cloud/TimescaleDB), `MemoryStore` (demo) | `DATABASE_URL` set or not |
| **Messaging transport** | `MessageTransport` — [apps/api/src/messaging/transport.ts](apps/api/src/messaging/transport.ts) | `PhotonTransport` (iMessage), `ConsoleTransport` (fake phone) | `MESSENGER=photon\|console` |
| **Messaging policy** | `CrewMessenger` — [apps/api/src/messaging/crewMessenger.ts](apps/api/src/messaging/crewMessenger.ts) | `GuardedCrewMessenger` (consent, STOP, quiet hours, 4/day cap, dedupe, fan-out/group) | `CREW_MESSAGE_MODE` |
| **Agent behaviour** | `CrewAgent` — [apps/api/src/services/crewAgent.ts](apps/api/src/services/crewAgent.ts) | welcome, completion broadcast, reminders, streak-at-risk, commands | — |
| **UI screens** | [apps/web/src/screens/](apps/web/src/screens/) | Join, Backstage, OnStage, Encore, Board + FakePhone | [App.tsx](apps/web/src/App.tsx) routes |

**Data flow:**

```
Camera/clip ─▶ PoseProvider (in browser) ─▶ PoseFrame ─▶ RepEngine ─▶ RepEvent[] ──JSON──▶ API
                                                         │                               │ sanitize + rescore (shared/scoring)
                                                         └─▶ overlay, HUD, live score     │ Store: rep_events, xp_ledger (hypertables)
                                                                                         └▶ CrewAgent ─▶ CrewMessenger ─▶ Photon iMessage
```

---

## Architecture

- **Web:** React + Vite + Tailwind, MediaPipe Pose Landmarker running in the browser (WASM/WebGPU). Model and WASM files are served from `/public`, so there's no CDN dependency at demo time.
- **API + agent:** Bun + Hono + `pg`, plain SQL migrations. `apps/api/src/index.ts` serves the API. `apps/api/src/agent.ts` runs the Photon inbound loop and the reminder scheduler (same image, different command).
- **DB:** Tiger Cloud (Postgres + TimescaleDB). `rep_events` and `xp_ledger` are hypertables. Daily rollups are real-time continuous aggregates.
- **Hosting:** Vultr VM + Docker Compose + Caddy (automatic HTTPS) behind a GoDaddy Registry domain. See [infra/vultr-setup.md](infra/vultr-setup.md).

### Privacy
Video never leaves the device. Inference runs in the browser. The server only ever receives rep events: timestamps, durations, angles, form scores, and flags.

### Tiger Data usage
Migrations: [db/migrations](db/migrations). The leaderboard, streaks, and "done today" all come from TimescaleDB objects:

```sql
-- streak (current run of days with ≥10 valid reps, ending today or yesterday)
SELECT streak_days FROM user_streaks WHERE user_id = $1;

-- reps today (real-time continuous aggregate)
SELECT coalesce(sum(valid_reps), 0) FROM daily_user_reps
WHERE user_id = $1 AND day = time_bucket('1 day', now(), 'America/New_York');

-- Headliner Board
SELECT b.*, EXISTS (SELECT 1 FROM daily_user_reps r WHERE r.user_id = b.user_id
                    AND r.day = time_bucket('1 day', now(), 'America/New_York') AND r.valid_reps > 0) AS done_today
FROM crew_leaderboard_7d b WHERE b.crew_id = $1 ORDER BY rank;
```
Code: [apps/api/src/store/pg.ts](apps/api/src/store/pg.ts). The XP ledger is append-only, and its rows sum exactly to each set's total (unit-tested).

```bash
DATABASE_URL=... bun run migrate        # prints the TimescaleDB version, applies 001–003
DATABASE_URL=... bun run seed           # demo crew, source='seed'
```

### Photon Spectrum usage
[apps/api/src/messaging/photon.ts](apps/api/src/messaging/photon.ts) uses `Spectrum({ projectId, projectSecret, providers: [imessage.config()] })`, then `imessage(app).space.create(user)` for DMs and `app.messages` for inbound commands. Crew updates are **fan-out DMs**, because group creation needs a dedicated line. Admin trigger for judging:

```bash
curl -X POST https://<domain>/api/admin/run-reminders -H "authorization: Bearer $ADMIN_TOKEN" \
     -H "content-type: application/json" -d '{"kind":"reminder"}'
```

---

## Scoring (summary)
`rep_xp = base × form × tempo` · `set = Σrep × (1 + 0.2·consistency)` · `total = round(set × streak_mult) + daily_show (25)`. The server recomputes everything from raw rep events and ignores any XP sent by the client. Full spec: [packages/shared/src/scoring.ts](packages/shared/src/scoring.ts).

## Limitations (honest)
- Form rules are **heuristics** (joint-angle thresholds), not validated biomechanics or medical advice.
- Single camera, single person, side-on (squat/push-up) or front-on (pull-up) placement.
- Fast movement or baggy clothing can reduce landmark visibility; counting pauses when key joints aren't visible.

## Hackathon simplifications
- **Single timezone** (`America/New_York`) for days, streaks, quiet hours.
- **Lightweight auth:** signed httpOnly cookie after `/join`; phone numbers are not verified.
- Phone parsing defaults to US numbers.
- `MemoryStore` resets on restart (DEMO_MODE only).

## Built before Hacklanta
- No project code existed before the hacking period. Open-source libraries used: React, Vite, Tailwind, Hono, `pg`, MediaPipe Tasks Vision (Google's pretrained Pose Landmarker models), `spectrum-ts`.
- Planning docs (`Hacklanta_2026_Agent_Reference.md`, build prompt) were written at the start of the event. Code was written with an AI coding assistant during the event.
