// Plain-SQL migration runner. Statements run one at a time (no wrapping
// transaction) because continuous aggregates can't be created inside one.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { makePool } from "./store/pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. (DEMO_MODE without a DB uses the in-memory store; nothing to migrate.)");
  process.exit(1);
}

const dir = join(import.meta.dir, "../../../db/migrations");
const pool = makePool(url);

await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
const ver = await pool.query(`SELECT extversion FROM pg_extension WHERE extname = 'timescaledb'`);
console.log(`TimescaleDB version: ${ver.rows[0]?.extversion ?? "(not installed yet)"}`);

const done = new Set((await pool.query(`SELECT name FROM schema_migrations`)).rows.map((r) => r.name));
for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  if (done.has(file)) continue;
  const sql = readFileSync(join(dir, file), "utf8").replace(/--.*$/gm, "");
  const statements = sql.split(/;\s*(?:\r?\n|$)/).map((s) => s.trim()).filter(Boolean);
  console.log(`→ ${file} (${statements.length} statements)`);
  for (const st of statements) await pool.query(st);
  await pool.query(`INSERT INTO schema_migrations (name) VALUES ($1)`, [file]);
}
console.log("migrations up to date");
await pool.end();
