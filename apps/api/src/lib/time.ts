import { TZ } from "../env";

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const hmFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** Local calendar day in America/New_York, as YYYY-MM-DD. */
export const localDay = (d: Date = new Date()) => dayFmt.format(d);

/** Minutes since local midnight in America/New_York. */
export function localMinutes(d: Date = new Date()): number {
  const [h, m] = hmFmt.format(d).split(":").map(Number);
  return h! * 60 + m!;
}

/** Quiet hours 22:00–08:00 ET. */
export const isQuietHours = (d: Date = new Date()) => {
  const m = localMinutes(d);
  return m >= 22 * 60 || m < 8 * 60;
};

/** Previous calendar day for a YYYY-MM-DD string. */
export function prevDay(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
