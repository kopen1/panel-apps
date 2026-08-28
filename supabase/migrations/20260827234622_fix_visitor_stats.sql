create or replace view public.v_website_stats as
select
  (
    select count(distinct visitor_id)
    from public.website_events
    where visitor_id is not null
      and visitor_id <> ''
  )::bigint as total_visitors,

  (
    select count(*)
    from public.website_events
    where event_type = 'page_view'
  )::bigint as total_page_views,

  (
    select count(*)
    from public.website_events
    where event_type = 'download'
  )::bigint as total_downloads,

  (
    select count(distinct visitor_id)
    from public.website_events
    where visitor_id is not null
      and visitor_id <> ''
      and created_at >= current_date
  )::bigint as visitors_today,

  (
    select count(*)
    from public.website_events
    where event_type = 'page_view'
      and created_at >= current_date
  )::bigint as page_views_today,

  (
    select count(*)
    from public.website_events
    where event_type = 'download'
      and created_at >= current_date
  )::bigint as downloads_today;
