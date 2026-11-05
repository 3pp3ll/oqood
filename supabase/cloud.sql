-- عقود — الحفظ السحابي لعقود المستخدمين (بدون بيانات شخصية)
-- شغّله في مشروع oqood ← SQL Editor ← New query ← Run. آمن لإعادة التشغيل.
-- كل عقد ينصاغ ينحفظ هنا بعد شطب الأسماء والهويات والجوالات والإيميلات وتواريخ الميلاد.
-- المستخدم يشوف عقوده بس، والمالك يشوف الكل.

create table if not exists public.saved_contracts (
  id bigserial primary key,
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text check (length(title) <= 200),
  type_label text check (length(type_label) <= 120),
  lang text check (lang in ('ar', 'en', 'both')),
  html text not null check (length(html) <= 400000),
  created_at timestamptz not null default now()
);
create index if not exists saved_contracts_owner on public.saved_contracts (owner, created_at desc);
alter table public.saved_contracts enable row level security;

drop policy if exists saved_contracts_read on public.saved_contracts;
create policy saved_contracts_read on public.saved_contracts for select using (owner = auth.uid() or public.is_admin());
drop policy if exists saved_contracts_insert on public.saved_contracts;
create policy saved_contracts_insert on public.saved_contracts for insert with check (owner = auth.uid());
drop policy if exists saved_contracts_delete on public.saved_contracts;
create policy saved_contracts_delete on public.saved_contracts for delete using (owner = auth.uid() or public.is_admin());

revoke all on public.saved_contracts from anon;
grant select, insert, delete on public.saved_contracts to authenticated;
grant usage, select on sequence public.saved_contracts_id_seq to authenticated;
