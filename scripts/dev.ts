// `bun dev` — runs API (DEMO_MODE by default) + web together.
const procs = [
  Bun.spawn(["bun", "run", "dev"], { cwd: "apps/api", stdout: "inherit", stderr: "inherit", env: { ...process.env } }),
  Bun.spawn(["bun", "run", "dev"], { cwd: "apps/web", stdout: "inherit", stderr: "inherit", env: { ...process.env } }),
];
const stop = () => { for (const p of procs) p.kill(); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
await Promise.race(procs.map((p) => p.exited));
stop();
