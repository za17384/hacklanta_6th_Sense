import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

// DEMO_MODE only: shows what the iMessage agent sends (console transport) and
// lets you "text" the agent. With MESSENGER=photon, real phones get these instead.

interface FeedItem { id: number; ts: string; direction: "out" | "in"; to?: string; from?: string; group?: string; text: string }

export function FakePhone({ hasPhone, lift = false }: { hasPhone: boolean; lift?: boolean }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    const es = new EventSource("/api/demo/feed");
    es.onmessage = (e) => {
      if (!e.data) return;
      const item = JSON.parse(e.data) as FeedItem;
      setItems((xs) => (xs.some((x) => x.id === item.id) ? xs : [...xs, item].slice(-80)));
      if (!openRef.current && item.direction === "out") setUnread((n) => n + 1);
    };
    return () => es.close();
  }, []);
  useEffect(() => { if (open) { setUnread(0); endRef.current?.scrollIntoView(); } }, [open, items.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const t = text; setText("");
    await api.demoText(t).catch((err) => alert(err.message));
  };

  return (
    <>
      <button onClick={() => setOpen((o) => !o)}
        className={`fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-neon-cyan text-2xl text-black shadow-[0_0_24px_rgba(34,227,255,.5)] ${lift ? "bottom-24" : "bottom-4"}`}>
        💬{unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-neon-pink px-1.5 text-xs text-white">{unread}</span>}
      </button>
      {open && (
        <div className={`fixed right-4 z-40 flex h-[70vh] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[2rem] border-4 border-white/20 bg-black ${lift ? "bottom-40" : "bottom-20"}`}>
          <div className="border-b border-white/10 py-2 text-center text-xs text-white/60">
            <div className="font-semibold text-white">Rep Rally Agent</div>DEMO phone · console messenger
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
            {items.map((m) => (
              <div key={m.id} className={`flex ${m.direction === "in" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 ${m.direction === "in" ? "bg-[#0a84ff] text-white" : "bg-[#26252a] text-white"}`}>
                  {m.direction === "out" && <div className="mb-0.5 text-[10px] text-white/40">to {m.group ? `group ${m.group}` : m.to}</div>}
                  {m.text}
                </div>
              </div>
            ))}
            {!items.length && <p className="text-center text-white/40">No messages yet. Finish a set or text HELP.</p>}
            <div ref={endRef} />
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-white/10 p-2">
            <input className="flex-1 rounded-full bg-[#1c1c1e] px-4 py-2 text-sm outline-none" value={text} onChange={(e) => setText(e.target.value)}
              placeholder={hasPhone ? "Text BOARD, ME, STREAK, HELP…" : "Add a phone on join to text the agent"} disabled={!hasPhone} />
            <button className="rounded-full bg-[#0a84ff] px-4 text-sm font-semibold" disabled={!hasPhone}>↑</button>
          </form>
        </div>
      )}
    </>
  );
}
