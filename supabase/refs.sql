-- روابط الإحالة لكل المنصات (مراس، عقود، مِلْكية، منطاد، دربي، مع نفسك)
-- شغّله في مشروع oqood ← SQL Editor ← New query ← Run. آمن لإعادة التشغيل.
-- ما ينحفظ أي بيانات شخصية: المنصة، الكود، نوع الحدث، ورقم عشوائي للجهاز عشان ما تنحسب الزيارة مرتين.

create table if not exists public.ref_events (
  id bigserial primary key,
  platform text not null check (platform ~ '^[a-z0-9-]{2,20}$'),
  code text not null check (code ~ '^[a-z0-9_-]{1,32}$'),
  kind text not null check (kind in ('visit', 'signup')),
  visitor text not null check (visitor ~ '^[A-Za-z0-9]{8,32}$'),
  created_at timestamptz not null default now(),
  unique (platform, code, kind, visitor)
);
create index if not exists ref_events_pc on public.ref_events (platform, code);
alter table public.ref_events enable row level security;
revoke all on public.ref_events from anon, authenticated;

-- تسجيل حدث (زيارة أو تسجيل) — أي زائر
create or replace function public.ref_track(p_platform text, p_code text, p_kind text, p_visitor text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.ref_events (platform, code, kind, visitor)
  values (lower(p_platform), lower(p_code), p_kind, p_visitor)
  on conflict do nothing;
exception when check_violation then null;
end $$;

-- أرقام منصة وحدة (أعداد فقط، بدون أي بيانات)
create or replace function public.ref_stats(p_platform text)
returns table (code text, visits bigint, signups bigint, visits7 bigint, signups7 bigint, last_at timestamptz)
language sql stable security definer set search_path = public as $$
  select code,
    count(*) filter (where kind = 'visit'), count(*) filter (where kind = 'signup'),
    count(*) filter (where kind = 'visit' and created_at > now() - interval '7 days'),
    count(*) filter (where kind = 'signup' and created_at > now() - interval '7 days'),
    max(created_at)
  from public.ref_events where platform = lower(p_platform)
  group by code order by count(*) filter (where kind = 'signup') desc, count(*) desc;
$$;

-- كل المنصات مع بعض (للمالك فقط، من لوحة عقود)
create or replace function public.ref_stats_all()
returns table (platform text, code text, visits bigint, signups bigint, visits7 bigint, signups7 bigint, last_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query select e.platform, e.code,
    count(*) filter (where e.kind = 'visit'), count(*) filter (where e.kind = 'signup'),
    count(*) filter (where e.kind = 'visit' and e.created_at > now() - interval '7 days'),
    count(*) filter (where e.kind = 'signup' and e.created_at > now() - interval '7 days'),
    max(e.created_at)
  from public.ref_events e group by e.platform, e.code order by 1, 4 desc, 3 desc;
end $$;

grant execute on function public.ref_track(text, text, text, text) to anon, authenticated;
grant execute on function public.ref_stats(text) to anon, authenticated;
revoke all on function public.ref_stats_all() from public, anon;
grant execute on function public.ref_stats_all() to authenticated;
