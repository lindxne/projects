-- One chronological feed of releases and posts, with keyset pagination.
-- Releases are placed by release_date (created_at when unset), posts by created_at:
-- both mean "when it happened". security invoker keeps the owner-only RLS in force.
create or replace function public.feed_page(
  p_kind text default null,
  p_before_at timestamptz default null,
  p_before_id uuid default null,
  p_limit int default 12
)
returns table (kind text, id uuid, sort_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select item.kind, item.id, item.sort_at
  from (
    select 'release'::text as kind, r.id, coalesce(r.release_date::timestamptz, r.created_at) as sort_at
    from public.releases r
    where p_kind is null or p_kind = 'music'
    union all
    select p.media_type::text, p.id, p.created_at
    from public.posts p
    where p_kind is null
       or (p_kind = 'photos' and p.media_type = 'photo')
       or (p_kind = 'videos' and p.media_type = 'video')
  ) item
  where p_before_at is null
     or item.sort_at < p_before_at
     or (item.sort_at = p_before_at and item.id < p_before_id)
  order by item.sort_at desc, item.id desc
  limit least(greatest(p_limit, 1), 60);
$$;

revoke all on function public.feed_page(text, timestamptz, uuid, int) from public, anon;
grant execute on function public.feed_page(text, timestamptz, uuid, int) to authenticated;
