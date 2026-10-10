import { useEffect, useState } from "react";
import { api, type BoardRow, type CrewInfo, type Me } from "../lib/api";
import { navigate } from "../lib/router";

export function Board({ me }: { me: Me }) {
  const [crewId, setCrewId] = useState(me.crews[0]?.id ?? "");
  const [crew, setCrew] = useState<CrewInfo | null>(null);
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = () => {
    if (!crewId) return;
    api.board(crewId).then((r) => { setCrew(r.crew); setRows(r.rows); setErr(null); }).catch((e) => setErr(e.message));
  };
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [crewId]);

  const nudge = async (r: BoardRow) => {
    try {
      const { result } = await api.nudge(crewId, r.userId);
      setToast(result === "sent" ? `👋 Nudged ${r.displayName}` : `Couldn't nudge ${r.displayName}: ${result.replace("_", " ")}`);
    } catch (e) { setToast((e as Error).message); }
    setTimeout(() => setToast(null), 3000);
  };

  const top = rows[0]?.xp7d ?? 0;
  return (
    <div className="space-y-4 px-4 py-6 pb-28">
      <button className="text-sm text-white/60" onClick={() => navigate("/")}>← Backstage</button>
      <div className="text-center">
        <div className="label">7-day lineup</div>
        <h1 className="title text-4xl text-neon-pink">Headliner Board</h1>
        {me.crews.length > 1 ? (
          <select className="mt-2 rounded bg-stage-800 px-3 py-1" value={crewId} onChange={(e) => setCrewId(e.target.value)}>
            {me.crews.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        ) : <div className="text-white/60">{crew?.name}</div>}
      </div>
      {err && <p className="text-center text-red-400">{err}</p>}

      <ol className="space-y-2">
        {rows.map((r) => {
          const mine = r.userId === me.user.id;
          return (
            <li key={r.userId} className={`card flex items-center gap-3 ${mine ? "border-neon-pink/60" : ""} ${r.rank === 1 ? "bg-gradient-to-r from-neon-amber/15 to-transparent" : ""}`}>
              <div className="title w-8 text-center text-2xl">{r.rank === 1 ? "👑" : r.rank}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{r.displayName}{mine && <span className="text-neon-pink"> (you)</span>}</div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-gradient-to-r from-neon-pink to-neon-cyan" style={{ width: `${top ? (r.xp7d / top) * 100 : 0}%` }} />
                </div>
                <div className="mt-1 text-xs text-white/60">
                  {r.xp7d.toLocaleString()} XP · {r.streakDays ? `🔥 ${r.streakDays}` : "no streak"} · {r.doneToday ? "✅ done today" : "⏳ not yet"}
                </div>
              </div>
              {!mine && !r.doneToday && <button className="btn-ghost px-3 py-2 text-xs" onClick={() => nudge(r)}>Nudge</button>}
            </li>
          );
        })}
      </ol>

      {crew && (
        <button className="btn-ghost w-full text-sm" onClick={() => { void navigator.clipboard?.writeText(crew.inviteUrl); setToast("Invite link copied"); setTimeout(() => setToast(null), 2000); }}>
          📋 Copy invite link · code {crew.inviteCode}
        </button>
      )}
      <p className="text-center text-xs text-white/30">Board, streaks and "done today" come from TimescaleDB continuous aggregates (or the in-memory demo store).</p>
      {toast && <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-xl bg-white px-4 py-3 text-center text-black">{toast}</div>}
    </div>
  );
}
