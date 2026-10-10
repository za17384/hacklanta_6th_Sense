import { LM, type ExerciseConfig, type PoseFrame, type Side } from "@rep-rally/shared";

const BONES: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28], [27, 31], [28, 32], [0, 11], [0, 12],
];

export interface OverlayOpts {
  cfg: ExerciseConfig;
  side: Side;
  /** "ok" green, "bad" red, "idle" cyan — colours the tracked limb. */
  tone: "ok" | "bad" | "idle";
  mirror: boolean;
  angle: number | null;
  /** Clear before drawing (false when something was drawn underneath, e.g. synthetic backdrop). */
  clear?: boolean;
}

const TONE = { ok: "#b6ff3b", bad: "#ff3e6c", idle: "#22e3ff" };

/** Draws the skeleton in canvas pixel space. Canvas must match the displayed video box. */
export function drawOverlay(ctx: CanvasRenderingContext2D, frame: PoseFrame | null, o: OverlayOpts) {
  const { width: w, height: h } = ctx.canvas;
  if (o.clear !== false) ctx.clearRect(0, 0, w, h);
  if (!frame) return;
  const lm = frame.landmarks;
  const X = (x: number) => (o.mirror ? 1 - x : x) * w;
  const Y = (y: number) => y * h;
  const vis = (i: number) => (lm[i]?.visibility ?? 0) > 0.5;

  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(3, w / 200);
  ctx.strokeStyle = "rgba(255,255,255,.55)";
  for (const [a, b] of BONES) {
    if (!vis(a) || !vis(b)) continue;
    ctx.beginPath(); ctx.moveTo(X(lm[a]!.x), Y(lm[a]!.y)); ctx.lineTo(X(lm[b]!.x), Y(lm[b]!.y)); ctx.stroke();
  }

  // Highlight the tracked joint chain.
  const sides: Side[] = o.cfg.bilateral ? ["left", "right"] : [o.side];
  ctx.strokeStyle = TONE[o.tone];
  ctx.lineWidth = Math.max(6, w / 110);
  ctx.shadowColor = TONE[o.tone];
  ctx.shadowBlur = 18;
  for (const s of sides) {
    const [a, b, c] = o.cfg.primary[s];
    ctx.beginPath(); ctx.moveTo(X(lm[a]!.x), Y(lm[a]!.y)); ctx.lineTo(X(lm[b]!.x), Y(lm[b]!.y)); ctx.lineTo(X(lm[c]!.x), Y(lm[c]!.y)); ctx.stroke();
  }
  ctx.shadowBlur = 0;

  for (let i = 0; i < Math.min(lm.length, 33); i++) {
    if (!vis(i) || (i > 0 && i < 11)) continue;
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(X(lm[i]!.x), Y(lm[i]!.y), Math.max(3, w / 220), 0, Math.PI * 2); ctx.fill();
  }

  // Angle label at the vertex joint.
  if (o.angle !== null) {
    const v = o.cfg.primary[sides[0]!][1];
    ctx.font = `bold ${Math.max(14, w / 32)}px Inter, sans-serif`;
    ctx.fillStyle = TONE[o.tone];
    ctx.fillText(`${Math.round(o.angle)}°`, X(lm[v]!.x) + 12, Y(lm[v]!.y) - 12);
  }

  // Pull-up depth line (wrists).
  if (o.cfg.id === "pullup") {
    const y = Y((lm[LM.lWrist]!.y + lm[LM.rWrist]!.y) / 2);
    ctx.setLineDash([10, 8]); ctx.strokeStyle = "rgba(255,176,32,.8)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); ctx.setLineDash([]);
  }
}

/** For the synthetic provider: draw on a dark backdrop since there's no video. */
export function drawBackdrop(ctx: CanvasRenderingContext2D) {
  const { width: w, height: h } = ctx.canvas;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#1a1033"); g.addColorStop(1, "#07040f");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,.35)";
  ctx.font = `bold ${Math.max(12, w / 40)}px Inter, sans-serif`;
  ctx.fillText("SYNTHETIC POSE — not a camera", 16, h - 16);
}
