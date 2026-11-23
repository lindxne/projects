-- Lindone v1 schema: single-owner music hub.
-- Every table is private: RLS lets through only the owner's auth.email().

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Owner (single user)
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.owner (
  singleton boolean primary key default true check (singleton),
  email text not null
);

comment on table private.owner is
  'Exactly one row: the only e-mail allowed to sign in. Set it with: select private.set_owner(''me@example.com'');';

create function private.set_owner(owner_email text)
returns void
language sql
set search_path = ''
as $$
  insert into private.owner (singleton, email)
  values (true, lower(trim(owner_email)))
  on conflict (singleton) do update set email = excluded.email;
$$;

create function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.owner o where o.email = lower(auth.email())
  );
$$;

revoke all on function public.is_owner() from public, anon;
grant execute on function public.is_owner() to authenticated, service_role;

-- No public registration: auth.users accepts only the owner's e-mail.
create function private.enforce_single_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null
     or not exists (select 1 from private.owner o where o.email = lower(new.email)) then
    raise exception 'Lindone is a single-user app: sign-ups are closed';
  end if;
  return new;
end;
$$;

create trigger enforce_single_user
  before insert or update of email on auth.users
  for each row execute function private.enforce_single_user();

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, 'Lindone')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create table public.releases (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('single', 'mixtape', 'album')),
  title text not null,
  cover_url text not null,
  description text,
  release_date date,
  links jsonb not null default '{}'::jsonb, -- {spotify, apple, youtube, bandcamp}
  created_at timestamptz not null default now(),
  fts tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) stored
);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases (id) on delete cascade,
  title text not null,
  audio_url text not null,
  duration_sec int,
  track_number int,
  bpm int,
  musical_key text,
  created_at timestamptz not null default now(),
  fts tsvector generated always as (to_tsvector('simple', coalesce(title, ''))) stored
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  media_url text not null,
  media_type text not null check (media_type in ('photo', 'video')),
  poster_url text,
  caption text,
  tags text[] not null default '{}',
  track_id uuid references public.tracks (id) on delete set null,
  release_id uuid references public.releases (id) on delete set null,
  width int,
  height int,
  duration_sec int,
  created_at timestamptz not null default now(),
  fts tsvector generated always as (to_tsvector('simple', coalesce(caption, ''))) stored,
  constraint posts_tags_known check (tags <@ array['studio', 'live', 'demo', 'reference', 'vibe'])
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index releases_created_at_idx on public.releases (created_at desc);
create index releases_release_date_idx on public.releases (release_date desc nulls last, created_at desc);
create index releases_type_idx on public.releases (type);
create index releases_fts_idx on public.releases using gin (fts);

create index tracks_release_idx on public.tracks (release_id, track_number);
create index tracks_fts_idx on public.tracks using gin (fts);

-- (created_at, id) is the keyset cursor of the feed.
create index posts_created_at_idx on public.posts (created_at desc, id desc);
create index posts_tags_idx on public.posts using gin (tags);
create index posts_fts_idx on public.posts using gin (fts);
create index posts_track_idx on public.posts (track_id);
create index posts_release_idx on public.posts (release_id);

-- ---------------------------------------------------------------------------
-- RLS: owner only
-- ---------------------------------------------------------------------------
alter table private.owner enable row level security;
alter table public.profiles enable row level security;
alter table public.releases enable row level security;
alter table public.tracks enable row level security;
alter table public.posts enable row level security;

create policy "owner only" on public.profiles
  for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));

create policy "owner only" on public.releases
  for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));

create policy "owner only" on public.tracks
  for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));

create policy "owner only" on public.posts
  for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));

revoke all on public.profiles, public.releases, public.tracks, public.posts from anon;

-- ---------------------------------------------------------------------------
-- Storage: private buckets, owner only. Files are served through signed URLs.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('covers', 'covers', false, 5242880, array['image/webp', 'image/jpeg', 'image/png']),
  ('audio', 'audio', false, null, array[
    'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav',
    'audio/x-wav', 'audio/wave', 'audio/flac', 'audio/x-flac', 'audio/ogg', 'audio/webm'
  ]),
  ('media', 'media', false, null, array['image/webp', 'image/jpeg', 'image/png', 'video/mp4']),
  ('posters', 'posters', false, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "owner only" on storage.objects
  for all to authenticated
  using (
    bucket_id in ('covers', 'audio', 'media', 'posters') and (select public.is_owner())
  )
  with check (
    bucket_id in ('covers', 'audio', 'media', 'posters') and (select public.is_owner())
  );

-- ---------------------------------------------------------------------------
-- Search: release titles/descriptions, track titles, post captions.
-- security invoker => RLS still applies.
-- ---------------------------------------------------------------------------
create function public.search_all(q text)
returns table (
  kind text,
  id uuid,
  title text,
  subtitle text,
  image_url text,
  release_id uuid,
  happened_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with input as (
    select
      trim(q) as raw,
      (
        select string_agg(quote_literal(w) || ':*', ' & ')
        from regexp_split_to_table(lower(trim(q)), '\s+') as w
        where w <> ''
      ) as prefix_query
  ),
  query as (
    select raw, case when prefix_query is null then null else to_tsquery('simple', prefix_query) end as tsq
    from input
  )
  select 'release'::text, r.id, r.title, r.type, r.cover_url, r.id,
         coalesce(r.release_date::timestamptz, r.created_at)
  from public.releases r, query
  where query.tsq is not null
    and (r.fts @@ query.tsq or r.title ilike '%' || query.raw || '%')
  union all
  select 'track'::text, t.id, t.title, r.title, r.cover_url, r.id,
         coalesce(r.release_date::timestamptz, t.created_at)
  from public.tracks t
  join public.releases r on r.id = t.release_id, query
  where query.tsq is not null
    and (t.fts @@ query.tsq or t.title ilike '%' || query.raw || '%')
  union all
  select 'post'::text, p.id, coalesce(p.caption, ''), p.media_type,
         coalesce(p.poster_url, p.media_url), p.release_id, p.created_at
  from public.posts p, query
  where query.tsq is not null
    and (p.fts @@ query.tsq or p.caption ilike '%' || query.raw || '%')
  order by 7 desc
  limit 60;
$$;

-- ---------------------------------------------------------------------------
-- "On this day N years ago": posts and releases from the same calendar day.
-- ---------------------------------------------------------------------------
create function public.on_this_day(tz text default 'UTC')
returns table (
  kind text,
  id uuid,
  title text,
  image_url text,
  media_type text,
  years_ago int,
  happened_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with today as (select (now() at time zone tz)::date as d)
  select 'post'::text, p.id, coalesce(p.caption, ''), coalesce(p.poster_url, p.media_url),
         p.media_type,
         (extract(year from today.d) - extract(year from (p.created_at at time zone tz)))::int,
         p.created_at
  from public.posts p, today
  where extract(month from (p.created_at at time zone tz)) = extract(month from today.d)
    and extract(day from (p.created_at at time zone tz)) = extract(day from today.d)
    and extract(year from (p.created_at at time zone tz)) < extract(year from today.d)
  union all
  select 'release'::text, r.id, r.title, r.cover_url, r.type,
         (extract(year from today.d) - extract(year from r.release_date))::int,
         r.release_date::timestamptz
  from public.releases r, today
  where r.release_date is not null
    and extract(month from r.release_date) = extract(month from today.d)
    and extract(day from r.release_date) = extract(day from today.d)
    and extract(year from r.release_date) < extract(year from today.d)
  order by 7 desc;
$$;

revoke all on function public.search_all(text) from public, anon;
revoke all on function public.on_this_day(text) from public, anon;
grant execute on function public.search_all(text) to authenticated;
grant execute on function public.on_this_day(text) to authenticated;
