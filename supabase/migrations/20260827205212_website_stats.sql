create table if not exists public.website_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('visit', 'page_view', 'download')),
  app_id uuid null references public.apps(id) on delete set null,
  path text null,
  visitor_id text null,
  user_agent text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_website_events_type_created
  on public.website_events(event_type, created_at);

create index if not exists idx_website_events_visitor
  on public.website_events(visitor_id);

create index if not exists idx_website_events_app
  on public.website_events(app_id);

alter table public.website_events enable row level security;

drop policy if exists public_insert_website_events
  on public.website_events;

create policy public_insert_website_events
on public.website_events
for insert
to anon, authenticated
with check (true);

drop policy if exists admin_read_website_events
  on public.website_events;

create policy admin_read_website_events
on public.website_events
for select
to authenticated
using (is_admin());

create or replace view public.v_website_stats as
select
  count(distinct case
    when event_type = 'visit' then visitor_id
  end)::bigint as total_visitors,

  count(*) filter (
    where event_type = 'page_view'
  )::bigint as total_page_views,

  count(*) filter (
    where event_type = 'download'
  )::bigint as total_downloads,

  count(distinct case
    when event_type = 'visit'
     and created_at >= current_date
    then visitor_id
  end)::bigint as visitors_today,

  count(*) filter (
    where event_type = 'page_view'
      and created_at >= current_date
  )::bigint as page_views_today,

  count(*) filter (
    where event_type = 'download'
      and created_at >= current_date
  )::bigint as downloads_today

from public.website_events;
