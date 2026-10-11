import { useMemo, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import type { Me } from "../lib/api";
import { navigate } from "../lib/router";
import { Shell } from "./components";
import {
  EMPTY_PROGRESS, firstName, previewMeter, workoutById,
  type Hud, type Progress, type RewardPayload, type WorkoutId,
} from "./data";
import { ActiveWorkoutScreen } from "./ActiveWorkoutScreen";
import { HomeScreen } from "./HomeScreen";
import { ProfileScreen } from "./ProfileScreen";
import { QuestsScreen } from "./QuestsScreen";
import { RewardScreen } from "./RewardScreen";
import { WorkoutSelectScreen } from "./WorkoutSelectScreen";
import "./formup.css";

export function FormUpLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-formup-bg text-formup-muted">
      Loading FormUp…
    </div>
  );
}

export function FormUpApp({ path, sessionId, me, offline, onRefresh }: {
  path: string;
  sessionId: string | null;
  me: Me | null;
  offline: boolean;
  onRefresh: () => void;
}) {
  const [selected, setSelected] = useState<WorkoutId>("squat");
  const [reward, setReward] = useState<RewardPayload | null>(null);
  const [previewXp, setPreviewXp] = useState(0);
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);

  const hud: Hud = useMemo(() => {
    const formPct = progress.formN ? Math.round((progress.formSum / progress.formN) * 100) : null;
    if (!me) {
      const meter = previewMeter(previewXp);
      const started = progress.sessions > 0;
      return {
        preview: true,
        name: "Alex",
        level: meter.level,
        into: meter.into,
        span: meter.span,
        pct: meter.pct,
        streak: started ? 6 : 5,
        streakSub: "Best: 12 days",
        includeToday: started,
        title: "Contender",
        squatReps: started ? progress.squatReps : Math.max(4, progress.squatReps),
        pushupReps: progress.pushupReps,
        sessions: started ? progress.sessions : 0,
        formPct,
      };
    }
    const span = Math.max(1, me.levelSpan);
    return {
      preview: false,
      name: firstName(me.user.displayName),
      level: me.level,
      into: me.intoLevel,
      span,
      pct: Math.min(100, Math.round((me.intoLevel / span) * 100)),
      streak: me.streakDays,
      streakSub: `Today: ${me.validRepsToday} clean reps`,
      includeToday: me.doneToday,
      title: me.title,
      squatReps: progress.squatReps,
      pushupReps: progress.pushupReps,
      sessions: progress.sessions,
      formPct,
    };
  }, [me, previewXp, progress]);

  const finish = (next: RewardPayload) => {
    let payload = next;
    if (!me && !next.saved) {
      const before = previewMeter(previewXp);
      const after = previewMeter(previewXp + next.xp);
      payload = { ...next, levelBefore: before.level, levelAfter: after.level };
      setPreviewXp((xp) => xp + next.xp);
    }
    flushSync(() => {
      setReward(payload);
      setProgress((p) => ({
        squatReps: p.squatReps + (next.workoutId === "squat" ? next.reps : 0),
        pushupReps: p.pushupReps + (next.workoutId === "pushup" ? next.reps : 0),
        sessions: p.sessions + (next.reps > 0 ? 1 : 0),
        formSum: p.formSum + (next.formPct ?? 0) / 100,
        formN: p.formN + (next.formPct === null ? 0 : 1),
      }));
    });
    if (next.saved) onRefresh();
    navigate("/reward");
  };

  const session = sessionId ? workoutById(sessionId) : null;
  const tabs = !session;

  let body: ReactNode;
  if (session) {
    body = <ActiveWorkoutScreen workout={session} me={me} offline={offline} level={hud.level} onDone={finish} />;
  } else if (path === "/workout") {
    body = <WorkoutSelectScreen level={hud.level} selected={selected} onSelect={setSelected} />;
  } else if (path === "/quests") {
    body = <QuestsScreen hud={hud} onTrain={() => { setSelected("squat"); navigate("/workout"); }} />;
  } else if (path === "/profile") {
    body = <ProfileScreen hud={hud} me={me} />;
  } else if (path === "/reward") {
    body = <RewardScreen reward={reward} />;
  } else if (sessionId) {
    body = <WorkoutSelectScreen level={hud.level} selected={selected} onSelect={setSelected} />;
  } else {
    body = <HomeScreen hud={hud} onQuest={() => navigate("/quests")} />;
  }

  return <Shell tabs={tabs} path={path}>{body}</Shell>;
}
