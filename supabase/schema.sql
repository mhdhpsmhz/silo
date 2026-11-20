-- SILO — Personal YouTube Video Library (Authenticated, owner-scoped)
-- Supabase PostgreSQL Schema, Triggers & Row Level Security (RLS) Policies
-- Safe to run repeatedly in Supabase SQL Editor (idempotent DDL)

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Shared trigger function to automatically maintain updated_at timestamps
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1. Categories Table
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null,
  icon_name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.categories
  add column if not exists updated_at timestamptz not null default now();

-- 2. Channels Table
create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel_url text not null,
  avatar_url text,
  default_category_id uuid references public.categories(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.channels
  add column if not exists updated_at timestamptz not null default now();

-- 3. Labels Table (unique label name per category; cascade delete when category is deleted)
create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid not null references public.categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint labels_category_name_unique unique (category_id, name)
);

alter table public.labels
  add column if not exists updated_at timestamptz not null default now();

-- 4. Playlists Table
create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.playlists
  add column if not exists updated_at timestamptz not null default now();

-- 5. Videos Table
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  youtube_video_id text not null,
  url text not null,
  title text not null,
  thumbnail_url text not null,
  channel_id uuid references public.channels(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  notes text,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  last_watched_seconds integer not null default 0 check (last_watched_seconds >= 0),
  is_completed boolean not null default false,
  is_favorite boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_watched_at timestamptz
);

alter table public.videos
  add column if not exists updated_at timestamptz not null default now();

-- 6. Video-Playlists Junction Table
create table if not exists public.video_playlists (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  order_index integer not null default 0,
  constraint video_playlists_unique_pair unique (video_id, playlist_id)
);

-- 7. Video-Labels Junction Table
create table if not exists public.video_labels (
  video_id uuid not null references public.videos(id) on delete cascade,
  label_id uuid not null references public.labels(id) on delete cascade,
  primary key (video_id, label_id)
);

-- 8. Sequential Watch Queue Table
create table if not exists public.watch_queue (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null unique references public.videos(id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  added_at timestamptz not null default now()
);

-- Automatic updated_at Triggers
drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

drop trigger if exists trg_channels_updated_at on public.channels;
create trigger trg_channels_updated_at
  before update on public.channels
  for each row execute function public.set_updated_at();

drop trigger if exists trg_labels_updated_at on public.labels;
create trigger trg_labels_updated_at
  before update on public.labels
  for each row execute function public.set_updated_at();

drop trigger if exists trg_playlists_updated_at on public.playlists;
create trigger trg_playlists_updated_at
  before update on public.playlists
  for each row execute function public.set_updated_at();

drop trigger if exists trg_videos_updated_at on public.videos;
create trigger trg_videos_updated_at
  before update on public.videos
  for each row execute function public.set_updated_at();

-- Helpful Indexes
create index if not exists idx_videos_channel_id on public.videos(channel_id);
create index if not exists idx_videos_category_id on public.videos(category_id);
create index if not exists idx_videos_created_at on public.videos(created_at desc);
create index if not exists idx_videos_last_watched_at on public.videos(last_watched_at desc);
create index if not exists idx_videos_is_archived on public.videos(is_archived);
create index if not exists idx_videos_is_favorite on public.videos(is_favorite);
create index if not exists idx_labels_category_id on public.labels(category_id);
create index if not exists idx_video_playlists_playlist_order on public.video_playlists(playlist_id, order_index);
create index if not exists idx_watch_queue_position on public.watch_queue(position asc);

-- User ownership columns. Existing rows are assigned below when a single auth
-- user exists, which makes upgrades safe for a personal single-owner library.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'categories', 'channels', 'labels', 'playlists', 'videos',
    'video_playlists', 'video_labels', 'watch_queue'
  ] loop
    execute format(
      'alter table public.%I add column if not exists owner_id uuid references auth.users(id) on delete cascade',
      table_name
    );
    execute format(
      'alter table public.%I alter column owner_id set default auth.uid()',
      table_name
    );
  end loop;
end;
$$;

do $$
declare
  auth_user_count integer;
  legacy_owner_id uuid;
  has_unowned_rows boolean;
  table_name text;
begin
  select count(*)::integer, (array_agg(id order by created_at))[1]
    into auth_user_count, legacy_owner_id
    from auth.users;

  select
    exists(select 1 from public.categories where owner_id is null) or
    exists(select 1 from public.channels where owner_id is null) or
    exists(select 1 from public.labels where owner_id is null) or
    exists(select 1 from public.playlists where owner_id is null) or
    exists(select 1 from public.videos where owner_id is null) or
    exists(select 1 from public.video_playlists where owner_id is null) or
    exists(select 1 from public.video_labels where owner_id is null) or
    exists(select 1 from public.watch_queue where owner_id is null)
    into has_unowned_rows;

  if has_unowned_rows and auth_user_count <> 1 then
    raise exception
      'SILO has existing rows without an owner. Create exactly one Supabase Auth user, then rerun schema.sql so the legacy library can be assigned safely.';
  end if;

  if has_unowned_rows then
    foreach table_name in array array[
      'categories', 'channels', 'labels', 'playlists', 'videos',
      'video_playlists', 'video_labels', 'watch_queue'
    ] loop
      execute format('update public.%I set owner_id = $1 where owner_id is null', table_name)
        using legacy_owner_id;
    end loop;
  end if;
end;
$$;

alter table public.categories alter column owner_id set not null;
alter table public.channels alter column owner_id set not null;
alter table public.labels alter column owner_id set not null;
alter table public.playlists alter column owner_id set not null;
alter table public.videos alter column owner_id set not null;
alter table public.video_playlists alter column owner_id set not null;
alter table public.video_labels alter column owner_id set not null;
alter table public.watch_queue alter column owner_id set not null;

-- Category names and YouTube IDs are unique per owner, not globally.
alter table public.categories drop constraint if exists categories_name_key;
alter table public.videos drop constraint if exists videos_youtube_video_id_key;
create unique index if not exists categories_owner_name_unique on public.categories(owner_id, name);
create unique index if not exists videos_owner_youtube_id_unique on public.videos(owner_id, youtube_video_id);

create index if not exists idx_categories_owner_id on public.categories(owner_id);
create index if not exists idx_channels_owner_id on public.channels(owner_id);
create index if not exists idx_labels_owner_id on public.labels(owner_id);
create index if not exists idx_playlists_owner_id on public.playlists(owner_id);
create index if not exists idx_videos_owner_id on public.videos(owner_id);
create index if not exists idx_video_playlists_owner_id on public.video_playlists(owner_id);
create index if not exists idx_video_labels_owner_id on public.video_labels(owner_id);
create index if not exists idx_watch_queue_owner_id on public.watch_queue(owner_id);

-- Row Level Security: authenticated users can access only their own library.
alter table public.categories enable row level security;
alter table public.channels enable row level security;
alter table public.labels enable row level security;
alter table public.playlists enable row level security;
alter table public.videos enable row level security;
alter table public.video_playlists enable row level security;
alter table public.video_labels enable row level security;
alter table public.watch_queue enable row level security;

do $$
declare
  v_table_name text;
  policy_row record;
begin
  foreach v_table_name in array array[
    'categories', 'channels', 'labels', 'playlists', 'videos',
    'video_playlists', 'video_labels', 'watch_queue'
  ] loop
    for policy_row in
      select policyname
        from pg_policies p
       where p.schemaname = 'public'
         and p.tablename = v_table_name
         and (p.policyname like 'Personal library %' or p.policyname = 'silo_owner_all')
    loop
      execute format('drop policy %I on public.%I', policy_row.policyname, v_table_name);
    end loop;
  end loop;
end;
$$;

revoke all on public.categories, public.channels, public.labels, public.playlists,
  public.videos, public.video_playlists, public.video_labels, public.watch_queue from anon, public;
grant select, insert, update, delete on public.categories, public.channels, public.labels,
  public.playlists, public.videos, public.video_playlists, public.video_labels,
  public.watch_queue to authenticated;

create policy silo_owner_all on public.categories for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy silo_owner_all on public.channels for all to authenticated
  using (owner_id = auth.uid()) with check (
    owner_id = auth.uid() and
    (default_category_id is null or exists (
      select 1 from public.categories c where c.id = default_category_id and c.owner_id = auth.uid()
    ))
  );

create policy silo_owner_all on public.labels for all to authenticated
  using (owner_id = auth.uid()) with check (
    owner_id = auth.uid() and exists (
      select 1 from public.categories c where c.id = category_id and c.owner_id = auth.uid()
    )
  );

create policy silo_owner_all on public.playlists for all to authenticated
  using (owner_id = auth.uid()) with check (
    owner_id = auth.uid() and
    (category_id is null or exists (
      select 1 from public.categories c where c.id = category_id and c.owner_id = auth.uid()
    ))
  );

create policy silo_owner_all on public.videos for all to authenticated
  using (owner_id = auth.uid()) with check (
    owner_id = auth.uid() and
    (category_id is null or exists (
      select 1 from public.categories c where c.id = category_id and c.owner_id = auth.uid()
    )) and
    (channel_id is null or exists (
      select 1 from public.channels ch where ch.id = channel_id and ch.owner_id = auth.uid()
    ))
  );

create policy silo_owner_all on public.video_playlists for all to authenticated
  using (owner_id = auth.uid()) with check (
    owner_id = auth.uid() and
    exists (select 1 from public.videos v where v.id = video_id and v.owner_id = auth.uid()) and
    exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = auth.uid())
  );

create policy silo_owner_all on public.video_labels for all to authenticated
  using (owner_id = auth.uid()) with check (
    owner_id = auth.uid() and
    exists (select 1 from public.videos v where v.id = video_id and v.owner_id = auth.uid()) and
    exists (select 1 from public.labels l where l.id = label_id and l.owner_id = auth.uid())
  );

create policy silo_owner_all on public.watch_queue for all to authenticated
  using (owner_id = auth.uid()) with check (
    owner_id = auth.uid() and
    exists (select 1 from public.videos v where v.id = video_id and v.owner_id = auth.uid())
  );
