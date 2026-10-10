import { useEffect, useState } from "react";
import { api } from "../lib/api";

export function Join({ inviteCode, onJoined }: { inviteCode?: string; onJoined: () => void | Promise<void> }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState(inviteCode ?? "");
  const [consent, setConsent] = useState(false);
  const [crewName, setCrewName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!code || code.length < 4) { setCrewName(null); return; }
    const t = setTimeout(() => api.invite(code).then((r) => setCrewName(r.crewName)).catch(() => setCrewName(null)), 300);
    return () => clearTimeout(t);
  }, [code]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await api.join({ displayName: name, phone, inviteCode: code || undefined, consent });
      await onJoined();
    } catch (e) {
      setErr((e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <div className="px-4 py-10">
      <h1 className="title text-center text-5xl leading-none text-neon-pink drop-shadow-[0_0_20px_rgba(255,62,165,.6)]">REP<br />RALLY</h1>
      <p className="mt-3 text-center text-white/70">Your workout is the set. Your crew is the crowd.</p>

      <form onSubmit={submit} className="card mx-auto mt-8 max-w-md space-y-4">
        {crewName && (
          <div className="rounded-xl bg-neon-cyan/10 px-4 py-3 text-sm text-neon-cyan">🎟️ You're invited to <b>{crewName}</b></div>
        )}
        <label className="block space-y-1">
          <span className="label">Stage name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sam" required maxLength={40} />
        </label>
        <label className="block space-y-1">
          <span className="label">Phone (for iMessage crew updates)</span>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 404 555 0123" inputMode="tel" autoComplete="tel" />
        </label>
        <label className="block space-y-1">
          <span className="label">Invite code (optional — blank starts a new crew)</span>
          <input className="input uppercase" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="DEMO" maxLength={12} />
        </label>
        <label className="flex items-start gap-3 text-sm text-white/80">
          <input type="checkbox" className="mt-1 h-5 w-5 accent-neon-pink" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>Text me crew updates, reminders and leaderboard news via iMessage (max 4/day, never 10 PM–8 AM). Reply STOP anytime.</span>
        </label>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button className="btn-primary w-full" disabled={busy || !name.trim()}>{busy ? "Getting backstage…" : "Join the lineup 🎤"}</button>
        <p className="text-center text-xs text-white/40">Your camera video never leaves your device — only rep counts and angles are sent.</p>
      </form>
    </div>
  );
}
