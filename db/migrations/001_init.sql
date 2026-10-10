-- Rep Rally schema. Requires TimescaleDB >= 2.13 for by_range() (Tiger Cloud is newer).
-- Check: SELECT extversion FROM pg_extension WHERE extname='timescaledb';
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  phone_e164 text UNIQUE,
  imessage_dm_space_id text,
  sms_consent boolean NOT NULL DEFAULT false,
  opted_out boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE crews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text UNIQUE NOT NULL,
  imessage_group_space_id text,          -- only set when a real group chat exists (dedicated line)
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE crew_members (
  crew_id uuid REFERENCES crews(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (crew_id, user_id)
);

CREATE TABLE workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  exercise text NOT NULL CHECK (exercise IN ('squat','pushup','pullup')),
  source text NOT NULL DEFAULT 'live' CHECK (source IN ('live','video_file','seed')),
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  valid_reps int, no_reps int, avg_form real, tempo_score real,
  rep_consistency real, streak_mult real, total_xp int
);

CREATE TABLE rep_events (
  ts timestamptz NOT NULL,
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  exercise text NOT NULL,
  rep_index int NOT NULL,
  valid boolean NOT NULL,
  form_score real NOT NULL,
  duration_s real NOT NULL,
  min_angle_deg real,
  flags text[] NOT NULL DEFAULT '{}'
);

CREATE TABLE xp_ledger (
  ts timestamptz NOT NULL,
  user_id uuid NOT NULL,
  session_id uuid,
  source text NOT NULL CHECK (source IN ('rep','set_bonus','streak_bonus','daily_show')),
  amount int NOT NULL
);

CREATE TABLE messages_log (
  id bigserial PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  user_id uuid, crew_id uuid,
  kind text NOT NULL,              -- welcome | completion | reminder | streak_risk | reply | nudge
  dedupe_key text UNIQUE,          -- e.g. 'reminder:<user>:<date>'
  body text NOT NULL
);

SELECT create_hypertable('rep_events', by_range('ts'));
SELECT create_hypertable('xp_ledger',  by_range('ts'));

CREATE INDEX ON rep_events (user_id, ts DESC);
CREATE INDEX ON xp_ledger (user_id, ts DESC);
