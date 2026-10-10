// Copies MediaPipe WASM from node_modules and downloads the pose models into
// apps/web/public so the app never depends on a CDN at demo time.
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const pub = join(root, "apps/web/public");
const candidates = [
  join(root, "apps/web/node_modules/@mediapipe/tasks-vision/wasm"),
  join(root, "node_modules/@mediapipe/tasks-vision/wasm"),
];
const wasm = candidates.find(existsSync);
if (!wasm) throw new Error("run `bun install` first — @mediapipe/tasks-vision not found");
mkdirSync(join(pub, "mediapipe/wasm"), { recursive: true });
cpSync(wasm, join(pub, "mediapipe/wasm"), { recursive: true });
console.log("✓ wasm copied");

const MODELS = {
  "pose_landmarker_full.task": "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task",
  "pose_landmarker_lite.task": "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
};
mkdirSync(join(pub, "models"), { recursive: true });
for (const [name, url] of Object.entries(MODELS)) {
  const dest = join(pub, "models", name);
  if (existsSync(dest)) { console.log(`✓ ${name} (cached)`); continue; }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  writeFileSync(dest, new Uint8Array(await res.arrayBuffer()));
  console.log(`✓ ${name}`);
}
