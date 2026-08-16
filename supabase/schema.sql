create table scores (
  id bigint generated always as identity primary key,
  difficulty text not null check (difficulty in ('small', 'medium', 'large')),
  name text not null check (char_length(name) between 1 and 12),
  steps integer not null check (steps > 0),
  created_at timestamptz not null default now()
);

create index scores_difficulty_steps_idx on scores (difficulty, steps, created_at);
