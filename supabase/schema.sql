create table scores (
  id bigint generated always as identity primary key,
  difficulty text not null check (difficulty in ('small', 'medium', 'large')),
  name text not null check (name ~ '^[A-Z]{1,8}$'),
  steps integer not null check (steps > 0),
  created_at timestamptz not null default now()
);

create index scores_difficulty_steps_idx on scores (difficulty, steps, created_at);

-- Backs the POST /api/scores rate limit: one row per submission attempt,
-- keyed by a hash of the client IP, so a rolling window can be counted.
create table score_submission_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index score_submission_attempts_ip_hash_idx on score_submission_attempts (ip_hash, created_at);
