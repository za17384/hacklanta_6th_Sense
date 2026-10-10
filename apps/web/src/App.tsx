import type { Exercise } from "@rep-rally/shared";
import { useCallback, useEffect, useState } from "react";
import { FakePhone } from "./components/FakePhone";
import { api, type Health, type Me } from "./lib/api";
import { match, navigate, usePath } from "./lib/router";
import { Backstage } from "./screens/Backstage";
import { Board } from "./screens/Board";
import { Encore, type EncoreData } from "./screens/Encore";
import { Join } from "./screens/Join";
import { OnStage } from "./screens/OnStage";

export function App() {
  const path = usePath();
  const [me, setMe] = useState<Me | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [encore, setEncore] = useState<EncoreData | null>(null);

  const refreshMe = useCallback(async () => {
    try { setMe(await api.me()); } catch { setMe(null); }
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refreshMe();
    api.health().then(setHealth).catch(() => setHealth(null));
  }, [refreshMe]);

  const offline = loaded && health === null;
  let screen: React.ReactNode = null;
  const joinCode = match(path, "/join/:code");
  const stage = match(path, "/stage/:exercise");

  if (!loaded) screen = <div className="p-8 text-center text-white/50">Tuning instruments…</div>;
  else if (path === "/join" || joinCode) screen = <Join inviteCode={joinCode?.code} onJoined={async () => { await refreshMe(); navigate("/"); }} />;
  else if (stage && ["squat", "pushup", "pullup"].includes(stage.exercise)) {
    screen = <OnStage exercise={stage.exercise as Exercise} me={me} offline={offline}
      onDone={(d) => { setEncore(d); navigate("/encore"); void refreshMe(); }} />;
  } else if (path === "/encore" && encore) screen = <Encore data={encore} />;
  else if (path === "/board") screen = me ? <Board me={me} /> : <Join onJoined={async () => { await refreshMe(); }} />;
  else if (!me && !offline) screen = <Join onJoined={async () => { await refreshMe(); }} />;
  else screen = <Backstage me={me} offline={offline} />;

  return (
    <div className="beams relative min-h-screen overflow-x-hidden">
      <div className="relative z-10 mx-auto w-full max-w-3xl">{screen}</div>
      {health?.demoMode && me && <FakePhone hasPhone={!!me.user.phone} />}
    </div>
  );
}
