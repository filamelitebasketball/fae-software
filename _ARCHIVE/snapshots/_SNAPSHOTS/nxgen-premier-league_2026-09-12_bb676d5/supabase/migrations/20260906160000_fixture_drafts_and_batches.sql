-- Fixtures need a way back.
--
-- The round-robin scheduler writes a whole season in one go — up to 380 rows
-- for twenty teams playing home and away. Until now a mis-set start date or the
-- wrong division meant deleting every one of those by hand, one at a time, on
-- the fixtures screen.
--
-- Two things fix that. `batch_id` groups everything one publish created, so the
-- batch can be reviewed and removed as a unit. A `draft` status lets a season be
-- laid down, looked at properly, and only then released — which is what actually
-- happens when a schedule is being planned.
--
-- Draft games are hidden in the SELECT policy rather than in each page's query.
-- The public schedule, standings, homepage scores and the storyboard all read
-- `games`, and one of them forgetting to filter is exactly the kind of leak
-- that goes unnoticed until someone spots next season's fixtures on the site.

alter table public.games add column if not exists batch_id uuid;

comment on column public.games.batch_id is
  'Groups fixtures created by one bulk publish so the whole batch can be reviewed and undone together.';

create index if not exists games_batch_id_idx
  on public.games (batch_id) where batch_id is not null;

drop policy if exists "Games are public readable" on public.games;

create policy "Published games are public"
  on public.games for select to anon
  using (status <> 'draft');

create policy "Members see published games"
  on public.games for select to authenticated
  using (status <> 'draft' or public.is_staff(auth.uid()));
