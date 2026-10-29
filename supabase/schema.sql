-- عقود — قاعدة البيانات
-- انسخ هذا الملف كاملاً في Supabase ← SQL Editor ← New query ثم Run.
-- آمن لإعادة التشغيل.

-- ============ المستخدمين ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  plan text not null default 'none' check (plan in ('none','own','sub')),
  is_admin boolean not null default false,
  sub_until date,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

alter table public.profiles enable row level security;
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select
  using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles admin write" on public.profiles;
create policy "profiles admin write" on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- ============ مكتبة الأنظمة ============
create table if not exists public.laws (
  id bigserial primary key,
  title text not null,
  kind text not null default 'نظام',
  source_url text,
  issued text,
  active boolean not null default true,
  article_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.law_articles (
  id bigserial primary key,
  law_id bigint not null references public.laws(id) on delete cascade,
  ord int not null default 0,
  num text,
  body text not null,
  tsv tsvector generated always as (to_tsvector('arabic'::regconfig, coalesce(num,'') || ' ' || body)) stored
);
create index if not exists law_articles_tsv on public.law_articles using gin (tsv);
create index if not exists law_articles_law on public.law_articles (law_id, ord);

alter table public.laws enable row level security;
alter table public.law_articles enable row level security;

drop policy if exists "laws read" on public.laws;
create policy "laws read" on public.laws for select using (auth.role() = 'authenticated');
drop policy if exists "laws admin" on public.laws;
create policy "laws admin" on public.laws for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "articles read" on public.law_articles;
create policy "articles read" on public.law_articles for select using (auth.role() = 'authenticated');
drop policy if exists "articles admin" on public.law_articles;
create policy "articles admin" on public.law_articles for all using (public.is_admin()) with check (public.is_admin());

-- البحث: أي كلمة من الطلب تكفي، والترتيب حسب الأقرب
create or replace function public.search_articles(q text, n int default 12)
returns table (id bigint, law_id bigint, law_title text, kind text, source_url text, num text, body text, rank real)
language sql stable set search_path = public as $$
  with query as (
    select nullif(replace(plainto_tsquery('arabic', regexp_replace(q, '(^|\s)[وف](\S{4,})', '\1\2', 'g'))::text, '&', '|'), '')::tsquery as tq
  )
  select a.id, a.law_id, l.title, l.kind, l.source_url, a.num, a.body, ts_rank_cd(a.tsv, query.tq) as rank
  from public.law_articles a
  join public.laws l on l.id = a.law_id and l.active
  cross join query
  where query.tq is not null and a.tsv @@ query.tq
  order by rank desc
  limit least(greatest(n, 1), 30)
$$;

-- يحدّث عدد المواد تلقائياً
create or replace function public.sync_article_count() returns trigger
language plpgsql security definer set search_path = public as $$
declare lid bigint := coalesce(new.law_id, old.law_id);
begin
  update public.laws set article_count = (select count(*) from public.law_articles where law_id = lid) where id = lid;
  return null;
end $$;
drop trigger if exists law_articles_count on public.law_articles;
create trigger law_articles_count after insert or delete on public.law_articles
  for each row execute function public.sync_article_count();

-- ============ سجل الاستخدام ============
create table if not exists public.drafts_log (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  plan text,
  title text,
  sources int,
  created_at timestamptz not null default now()
);
alter table public.drafts_log enable row level security;
drop policy if exists "log admin read" on public.drafts_log;
create policy "log admin read" on public.drafts_log for select using (public.is_admin());

-- ============ الصلاحيات (لازمة إذا أُطفئ Automatically expose new tables) ============
revoke all on public.profiles, public.laws, public.law_articles, public.drafts_log from anon;
grant select on public.profiles to authenticated;
grant update (plan, sub_until, name) on public.profiles to authenticated;
grant select, insert, update, delete on public.laws, public.law_articles to authenticated;
grant select on public.drafts_log to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.search_articles(text, int) to authenticated;
grant execute on function public.is_admin() to authenticated;
revoke execute on function public.search_articles(text, int) from anon, public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant insert, select on public.drafts_log to service_role;
    grant usage, select on all sequences in schema public to service_role;
  end if;
end $$;

-- ============ إعدادات الموقع وأنواع العقود ونماذجها ============
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.contract_types (
  id bigserial primary key,
  label text not null,
  ord int not null default 0,
  active boolean not null default true
);
alter table public.contract_types add column if not exists grp text;   -- مجموعة النوع (types.sql يعبّيها)
alter table public.contract_types add column if not exists law text;   -- النظام الحاكم
create table if not exists public.contract_templates (
  id bigserial primary key,
  type_id bigint references public.contract_types(id) on delete set null,
  title text not null,
  file_name text,
  body text not null,
  created_at timestamptz not null default now()
);

insert into public.contract_types (label, ord)
select x.label, x.ord from (values
  ('عقد خدمات / استشارة', 1), ('عقد بيع', 2), ('عقد إيجار', 3),
  ('عقد شراكة', 4), ('اتفاق عام', 5), ('اتفاقية سرية (مستقلة)', 6)
) as x(label, ord)
where not exists (select 1 from public.contract_types);

alter table public.site_settings enable row level security;
alter table public.contract_types enable row level security;
alter table public.contract_templates enable row level security;

drop policy if exists "settings read" on public.site_settings;
create policy "settings read" on public.site_settings for select using (true);
drop policy if exists "settings admin" on public.site_settings;
create policy "settings admin" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "types read" on public.contract_types;
create policy "types read" on public.contract_types for select using (true);
drop policy if exists "types admin" on public.contract_types;
create policy "types admin" on public.contract_types for all using (public.is_admin()) with check (public.is_admin());

-- النماذج خاصة بالمالك؛ دالة الصياغة تقرأها من السيرفر
drop policy if exists "templates admin" on public.contract_templates;
create policy "templates admin" on public.contract_templates for all using (public.is_admin()) with check (public.is_admin());

grant select on public.site_settings, public.contract_types to anon, authenticated;
grant insert, update, delete on public.site_settings, public.contract_types to authenticated;
grant select, insert, update, delete on public.contract_templates to authenticated;
grant usage, select on all sequences in schema public to authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select on public.site_settings, public.contract_types, public.contract_templates to service_role;
  end if;
end $$;

-- ============ اجعل نفسك المالك ============
-- بعد ما تسجّل حسابك من صفحة عقود، شغّل هذا بإيميلك:
-- insert into public.profiles (id, email, name, is_admin, plan)
-- select id, email, 'admin', true, 'sub' from auth.users where email = 'your@email.com'
-- on conflict (id) do update set is_admin = true, plan = 'sub';
