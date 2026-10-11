import type { Exercise } from "@rep-rally/shared";
import { useCallback, useEffect, useState } from "react";
import { FakePhone } from "./components/FakePhone";
import { FormUpApp, FormUpLoading } from "./formup/FormUpApp";
import { api, type Health, type Me } from "./lib/api";
import { match, navigate, usePath } from "./lib/router";
import { Backstage } from "./screens/Backstage";
import { Board } from "./screens/Board";
import { Encore, type EncoreData } from "./screens/Encore";
import { Join } from "./screens/Join";
import { OnStage } from "./screens/OnStage";

const STAGE_EXERCISES = ["squat", "pushup", "pullup"];

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
  const joinCode = match(path, "/join/:code");
  const stage = match(path, "/stage/:exercise");
  const session = match(path, "/session/:id");
  const classicJoin = path === "/join" || !!joinCode;
  const classicStage = !!stage && STAGE_EXERCISES.includes(stage.exercise);
  const classicEncore = path === "/encore" && !!encore;
  const classicBoard = path === "/board";
  const classicBackstage = path === "/backstage";
  const classic = classicJoin || classicStage || classicEncore || classicBoard || classicBackstage;

  let screen: React.ReactNode = null;
  if (!loaded) screen = <FormUpLoading />;
  else if (classicJoin) screen = <Join inviteCode={joinCode?.code} onJoined={async () => { await refreshMe(); navigate("/"); }} />;
  else if (classicStage) {
    screen = <OnStage exercise={stage!.exercise as Exercise} me={me} offline={offline}
      onDone={(d) => { setEncore(d); navigate("/encore"); void refreshMe(); }} />;
  } else if (classicEncore) screen = <Encore data={encore!} />;
  else if (classicBoard) screen = me ? <Board me={me} /> : <Join onJoined={async () => { await refreshMe(); navigate("/"); }} />;
  else if (classicBackstage) screen = <Backstage me={me} offline={offline} />;
  else screen = (
    <FormUpApp
      path={path}
      sessionId={session?.id ?? null}
      me={me}
      offline={offline}
      onRefresh={() => void refreshMe()}
    />
  );

  return (
    <div className={classic ? "beams relative min-h-screen overflow-x-hidden" : "min-h-dvh bg-formup-bg"}>
      <div className={classic ? "relative z-10 mx-auto w-full max-w-3xl" : ""}>{screen}</div>
      {health?.demoMode && me && <FakePhone hasPhone={!!me.user.phone} lift={!classic} />}
    </div>
  );
}
