-- Continuous aggregates (CASE instead of FILTER for compatibility).
-- materialized_only = false → real-time aggregates, so the board reflects a set immediately.
CREATE MATERIALIZED VIEW daily_user_reps
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT time_bucket('1 day', ts, 'America/New_York') AS day,
       user_id, exercise,
       sum(CASE WHEN valid THEN 1 ELSE 0 END) AS valid_reps,
       avg(form_score) AS avg_form
FROM rep_events
GROUP BY 1, 2, 3
WITH NO DATA;

CREATE MATERIALIZED VIEW daily_user_xp
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT time_bucket('1 day', ts, 'America/New_York') AS day,
       user_id, sum(amount) AS xp
FROM xp_ledger
GROUP BY 1, 2
WITH NO DATA;

SELECT add_continuous_aggregate_policy('daily_user_reps',
  start_offset => INTERVAL '30 days', end_offset => INTERVAL '1 minute', schedule_interval => INTERVAL '1 minute');
SELECT add_continuous_aggregate_policy('daily_user_xp',
  start_offset => INTERVAL '30 days', end_offset => INTERVAL '1 minute', schedule_interval => INTERVAL '1 minute');
