import type { WorkoutId } from "./data";

/** Stick figures redrawn from the workout cards. No icon files shipped with the designs. */
export function FigureIcon({ id, className = "h-8 w-8" }: { id: WorkoutId; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      {id === "squat" && (
        <>
          <circle cx="24" cy="8" r="3.2" {...common} />
          <path d="M24 12v8M24 16l-8 6M24 16l8 6M24 20l-7 10M24 20l7 12" {...common} />
        </>
      )}
      {id === "pushup" && (
        <>
          <circle cx="12" cy="16" r="3" {...common} />
          <path d="M15 17l14 2 8 6M22 18l2 8M29 19l4 9M18 26h16" {...common} />
        </>
      )}
      {id === "lunge" && (
        <>
          <circle cx="26" cy="8" r="3.2" {...common} />
          <path d="M26 12v9M26 16l-9 5M26 16l7 4M26 21l-10 14M26 21l8 8" {...common} />
        </>
      )}
      {id === "plank" && (
        <>
          <circle cx="10" cy="18" r="3" {...common} />
          <path d="M13 19h18l6 4M20 19v8M28 20v8M16 27h18" {...common} />
        </>
      )}
    </svg>
  );
}

export function FlameIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#ffb15a" d="M12 2s2.2 3.2 2.2 5.2c0 1.2-.7 2-1.4 2.6.8.2 2.2.9 2.2 2.8 0 2.6-2.2 4.4-4.6 4.4S6 15.2 6 12.4c0-2.4 1.6-4 2.6-5.8C9.6 4.6 12 2 12 2z" />
      <path fill="#ffe1a8" d="M12.2 11.2c.6.8.8 1.5.8 2.2 0 1.3-.9 2.2-2.1 2.2-1 0-1.7-.6-1.7-1.6 0-1.2 1.1-2.1 1.6-3.2.3.2 1 .6 1.4.4z" />
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="currentColor" d="M8 5.5v13l11-6.5-11-6.5z" />
    </svg>
  );
}

export function ArrowIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="M14.5 6 8.5 12l6 6" />
    </svg>
  );
}

export function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-formup-faint" aria-hidden>
      <path fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="m9.5 6 6 6-6 6" />
    </svg>
  );
}

export function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-formup-lav" aria-hidden>
      <path fill="currentColor" d="M12 2.5 13.6 9 20 10.5 13.6 12 12 18.5 10.4 12 4 10.5 10.4 9 12 2.5z" />
    </svg>
  );
}

export function TargetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

export function CheckIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5 9-10" />
    </svg>
  );
}

export function TabIcon({ name }: { name: "home" | "workout" | "quests" | "profile" }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      {name === "home" && <path {...p} d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" />}
      {name === "workout" && <path {...p} d="M6 9v6M18 9v6M3 12h3M18 12h3M9 8h6v8H9z" />}
      {name === "quests" && <path {...p} d="M7 4h8l2 3v13H5V7l2-3zm2 7h6M9 15h4" />}
      {name === "profile" && <path {...p} d="M12 12a3.2 3.2 0 1 0-3.2-3.2A3.2 3.2 0 0 0 12 12zm-6 7.2a6 6 0 0 1 12 0" />}
    </svg>
  );
}

/**
 * Stand-in for the blocky coach in the Figma tip card.
 * No pixel-art file was included with the screenshots.
 */
export function PixelCoach({ className = "h-9 w-9" }: { className?: string }) {
  const rows = [
    "..PPPPPP..",
    ".PPPPPPPP.",
    ".PSSSSSSP.",
    ".PSSEESSP.",
    "..SSSSSS..",
    "..OOOOOO..",
    ".OOO..OOO.",
    ".OO....OO.",
    "..OO..OO..",
    "...OOOO...",
  ];
  const fill: Record<string, string> = { P: "#b197ff", S: "#f3c7a4", E: "#1a1230", O: "#f0a060" };
  const cells: { x: number; y: number; c: string }[] = [];
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => { if (fill[ch]) cells.push({ x, y, c: fill[ch]! }); });
  });
  return (
    <svg viewBox="0 0 10 10" className={className} shapeRendering="crispEdges" role="img" aria-label="Placeholder pixel coach">
      {cells.map((cell) => <rect key={`${cell.x}-${cell.y}`} x={cell.x} y={cell.y} width="1" height="1" fill={cell.c} />)}
    </svg>
  );
}
