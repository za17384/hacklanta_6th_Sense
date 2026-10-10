CREATE VIEW user_streaks AS
WITH show_days AS (
  SELECT user_id, (day AT TIME ZONE 'America/New_York')::date AS d
  FROM daily_user_reps
  GROUP BY user_id, day
  HAVING sum(valid_reps) >= 10
), islands AS (
  SELECT user_id, d,
         d - (row_number() OVER (PARTITION BY user_id ORDER BY d))::int AS grp
  FROM show_days
)
SELECT user_id, count(*) AS streak_days, max(d) AS last_show_day
FROM islands
GROUP BY user_id, grp
HAVING max(d) >= (now() AT TIME ZONE 'America/New_York')::date - 1;

CREATE VIEW crew_leaderboard_7d AS
SELECT cm.crew_id, u.id AS user_id, u.display_name,
       coalesce(sum(x.xp), 0) AS xp_7d,
       coalesce(max(s.streak_days), 0) AS streak_days,
       rank() OVER (PARTITION BY cm.crew_id ORDER BY coalesce(sum(x.xp), 0) DESC) AS rank
FROM crew_members cm
JOIN users u ON u.id = cm.user_id
LEFT JOIN daily_user_xp x ON x.user_id = u.id AND x.day >= now() - INTERVAL '7 days'
LEFT JOIN user_streaks s ON s.user_id = u.id
GROUP BY cm.crew_id, u.id, u.display_name;
