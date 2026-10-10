# STATUS — updated Sat Oct 10, end of Phase 0 + Phase 1 (+ Phase 2/3 scaffolding)

## ✅ Verified working (actually run)
- `bun install`, `bun dev` → API :8080 + web :5173 in DEMO_MODE with zero credentials.
- `bun test` → 12/12 pass: 10 full squats = exactly 10 valid; 5 half squats = 5 no-reps "go deeper"; demo script (6 squats, 2 shallow) = ✓✗✓✓✗✓; out-of-frame pauses and discards the in-progress rep; jitter < 0.5 s ignored; calibration gate; tempo/consistency math; ledger rows sum exactly to total; server sanitizer; levels.
- API via curl: join (+ welcome DM), /me, sessions, complete (server rescoring, ledger, level-up), board, nudge, admin run-reminders (respects consent/STOP), demo inbound commands BOARD/ME/STOP/START, double-complete rejected (409).
- Headless Chrome E2E (synthetic pose provider): Join → Backstage → On Stage → 10 clean + 2 no-reps → Encore (XP math, level-up, "Crew notified ✓") → Headliner Board → fake phone shows completion broadcast + BOARD reply.
- MediaPipe Pose Landmarker loads from local `/public` files with the **GPU delegate** (~59 fps in headless Chrome with a fake camera); with nobody in frame it stays in calibration and reports low visibility.
- `tsc` clean for apps/api (including Photon adapter against spectrum-ts 12.10.1 types) and apps/web; `vite build` succeeds.

## 🟡 Mocked / written but NOT yet run against the real service
- **Real-person squat counting with MediaPipe** — the pipeline is built, but nobody has squatted in front of a camera yet. **Next:** 10 slow squats, 5 half squats, step out of frame, two lighting setups, a phone.
- **Video-file mode** — built (skips calibration, waits for lockout); not yet tested with a real clip.
- **Tiger Cloud / TimescaleDB** (`PgStore`, migrations, caggs, views) — written; no DB was available (no Docker on this machine, no Tiger credentials yet). DEMO_MODE uses `MemoryStore`, which mirrors the view semantics.
- **Photon iMessage** (`PhotonTransport`) — typechecks against the SDK; never connected (no project credentials). DEMO uses `ConsoleTransport` + fake phone.
- **Deploy** (Dockerfile, compose, Caddyfile, vultr-setup.md) — written, not run. The `oven/bun:1.4.3` image tag is unverified.
- **Push-up / pull-up configs** — implemented in `exercises.ts`; not tested with real movement (Phase 4).

## ⬜ Not started
- LLM rewrite of message templates (`LLM_PROVIDER`) — templates only for now.
- Solana memo proofs (Phase 5 stretch, `SOLANA_ENABLED=false`).
- Group-chat mode against a real dedicated line.
- Festival polish beyond the base skin (sound, crowd animation).

## Humans: unblockers
1. Create **Tiger Cloud** service → put `DATABASE_URL` in `.env` → `bun run migrate` (prints TimescaleDB version) → `bun run seed`.
2. Create **Photon** project → `SPECTRUM_PROJECT_ID/SECRET`, `MESSENGER=photon` → join with a real phone + consent → expect the welcome DM.
3. **Vultr VM + GoDaddy DNS A records** (do DNS now; propagation).
4. Install **Docker Desktop** if you want local TimescaleDB (`infra/docker-compose.local-db.yml`).
