import { describe, expect, test } from "bun:test";
import {
  RepEngine, SQUAT, levelFor, repConsistency, sanitizeReps, scoreSet, squatPose, syntheticSquatFrames, tempoScore,
  type SynthRep,
} from "../src";

const run = (reps: SynthRep[]) => {
  const eng = new RepEngine(SQUAT, { angleMode: "2d" });
  for (const f of syntheticSquatFrames(reps)) eng.push(f);
  return eng;
};

describe("squat rep engine", () => {
  test("10 slow full squats → exactly 10 valid", () => {
    const eng = run(Array.from({ length: 10 }, () => ({ depthDeg: 85, durS: 3 })));
    expect(eng.events.length).toBe(10);
    expect(eng.events.every((r) => r.valid)).toBe(true);
  });

  test("5 half squats → 5 no-reps with go-deeper cue", () => {
    const eng = run(Array.from({ length: 5 }, () => ({ depthDeg: 125, durS: 2.5 })));
    expect(eng.events.length).toBe(5);
    expect(eng.events.every((r) => !r.valid && r.flags[0] === "go deeper")).toBe(true);
  });

  test("demo script: 6 squats, 2 shallow", () => {
    const eng = run([85, 125, 85, 85, 125, 85].map((d) => ({ depthDeg: d, durS: 2.8 })));
    expect(eng.events.map((r) => r.valid)).toEqual([true, false, true, true, false, true]);
  });

  test("excessive lean → chest-up flag, still valid at form 0.8", () => {
    const eng = run([{ depthDeg: 85, durS: 3, leanDeg: 65 }]);
    expect(eng.events[0]!.flags).toContain("chest up");
    expect(eng.events[0]!.valid).toBe(true);
    expect(eng.events[0]!.formScore).toBeCloseTo(0.8);
  });

  test("jitter < 0.5 s is ignored", () => {
    const eng = run([{ depthDeg: 85, durS: 0.3 }]);
    expect(eng.events.length).toBe(0);
  });

  test("stepping out of frame pauses counting and discards the in-progress rep", () => {
    const eng = new RepEngine(SQUAT, { angleMode: "2d" });
    let t = 0;
    for (; t < 4000; t += 33) eng.push(squatPose(t, 175));
    expect(eng.state.phase).toBe("ready");
    for (let k = 0; k < 20; k++, t += 33) eng.push(squatPose(t, 175 - k * 4));
    expect(eng.state.phase).toBe("down");
    for (let k = 0; k < 30; k++, t += 33) eng.push(squatPose(t, 90, 20, false));
    expect(eng.state.phase).toBe("paused");
    for (let k = 0; k < 30; k++, t += 33) eng.push(squatPose(t, 175));
    expect(eng.events.length).toBe(0);
    expect(eng.state.phase).toBe("ready");
  });

  test("calibration must complete before counting", () => {
    const eng = new RepEngine(SQUAT, { angleMode: "2d" });
    for (let t = 0; t < 2000; t += 33) eng.push(squatPose(t, 175));
    expect(eng.state.phase).toBe("calibrating");
    expect(eng.state.calibrationProgress).toBeGreaterThan(0.5);
  });
});

describe("scoring", () => {
  test("tempo score", () => {
    expect(tempoScore(3, [2, 4])).toBe(1);
    expect(tempoScore(1, [2, 4])).toBe(0.5);
    expect(tempoScore(5, [2, 4])).toBeCloseTo(0.75);
    expect(tempoScore(0.2, [2, 4])).toBe(0.5);
  });

  test("consistency needs ≥ 3 reps", () => {
    expect(repConsistency([3, 3])).toBe(0);
    expect(repConsistency([3, 3, 3])).toBe(1);
  });

  test("ledger rows sum exactly to total", () => {
    const eng = run(Array.from({ length: 12 }, (_, i) => ({ depthDeg: i % 4 ? 85 : 125, durS: 2.5 + (i % 3) * 0.3 })));
    for (const streak of [0, 1, 6, 15]) {
      const s = scoreSet({ exercise: "squat", reps: [...eng.events], streakDays: streak, dailyShowEligible: true });
      expect(s.ledger.reduce((a, r) => a + r.amount, 0)).toBe(s.totalXp);
    }
  });

  test("sanitizeReps drops fast reps and recomputes validity", () => {
    const base = { repIndex: 0, eccentricS: 1, concentricS: 1, minAngleDeg: 90, lockoutPass: true, secondaryPass: true, flags: [] };
    const out = sanitizeReps([
      { ...base, ts: 1000, durationS: 0.2, valid: true, formScore: 1, depthPass: true },
      { ...base, ts: 2000, durationS: 2, valid: true, formScore: 0.4, depthPass: false },
      { ...base, ts: 5000, durationS: 2, valid: false, formScore: 7, depthPass: true },
    ]);
    expect(out.length).toBe(2);
    expect(out[0]!.valid).toBe(false);
    expect(out[1]!.valid).toBe(true);
    expect(out[1]!.formScore).toBe(1);
  });

  test("levels", () => {
    expect(levelFor(0).level).toBe(0);
    expect(levelFor(100).level).toBe(1);
    expect(levelFor(283).level).toBe(2);
    expect(levelFor(3163).title).toBe("Headliner");
  });
});
