-- عقود — رابط التوقيع عن بُعد
-- انسخ هذا الملف كاملاً في Supabase ← SQL Editor ← New query ثم Run. آمن لإعادة التشغيل.
-- يحتاج schema.sql يكون مشغّل قبل (دالة is_admin).

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.sign_links (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  token_hash text not null unique,          -- بصمة الرابط فقط، الرابط نفسه ما ينحفظ
  last4_hash text not null,                 -- بصمة آخر 4 أرقام مع الرابط
  ref text not null,
  title text,
  p1_name text,
  p2_name text,
  contract_html text not null,              -- نص العقد كما أُرسل
  sign_state jsonb not null,                -- توقيع الطرف الأول وبيانات العقد
  contract_hash text not null,              -- بصمة SHA-256 للعقد لحظة الإرسال
  status text not null default 'sent' check (status in ('sent','opened','signed','cancelled','locked')),
  tries int not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  signed_at timestamptz,
  p2_sig text,
  p2_ip text,
  p2_ua text
);
alter table public.sign_links enable row level security;
drop policy if exists sign_links_owner_read on public.sign_links;
create policy sign_links_owner_read on public.sign_links for select using (owner = auth.uid());
-- لا إدخال ولا تعديل مباشر؛ كل شي عن طريق الدوال تحت
revoke insert, update, delete on public.sign_links from anon, authenticated;

create or replace function public.sign_h(t text) returns text
language sql immutable set search_path = public, extensions as $$
  select encode(extensions.digest(convert_to(t, 'UTF8'), 'sha256'), 'hex')
$$;

-- إنشاء رابط (للمالك فقط)
create or replace function public.sign_create(p_token text, p_last4 text, p_days int, p_ref text, p_title text,
  p_p1 text, p_p2 text, p_html text, p_state jsonb) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare r public.sign_links;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'not allowed'; end if;
  if length(coalesce(p_token,'')) < 24 then raise exception 'bad token'; end if;
  if p_last4 !~ '^[0-9]{4}$' then raise exception 'bad last4'; end if;
  if length(p_html) > 400000 or length(p_state::text) > 400000 then raise exception 'too large'; end if;
  insert into public.sign_links (token_hash, last4_hash, ref, title, p1_name, p2_name, contract_html, sign_state, contract_hash, expires_at)
  values (public.sign_h(p_token), public.sign_h(p_token || ':' || p_last4), p_ref, p_title, p_p1, p_p2, p_html, p_state,
          public.sign_h(p_html), now() + make_interval(days => least(greatest(coalesce(p_days,7),1),30)))
  returning * into r;
  return json_build_object('id', r.id, 'expires_at', r.expires_at, 'hash', r.contract_hash);
end $$;

-- إلغاء رابط (للمالك)
create or replace function public.sign_cancel(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update public.sign_links set status = 'cancelled' where id = p_id and owner = auth.uid() and status in ('sent','opened');
$$;

-- فحص سريع أول ما يفتح العميل الرابط: صالح أو لا (بدون أي بيانات)
create or replace function public.sign_check(p_token text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from public.sign_links where token_hash = public.sign_h(coalesce(p_token,''))
                 and status in ('sent','opened') and expires_at > now());
$$;

-- فتح الرابط من العميل: يتحقق من آخر 4 أرقام
create or replace function public.sign_open(p_token text, p_last4 text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare r public.sign_links;
begin
  select * into r from public.sign_links where token_hash = public.sign_h(coalesce(p_token,'')) for update;
  if not found or r.status not in ('sent','opened') or r.expires_at < now() then
    return json_build_object('ok', false, 'err', 'invalid');
  end if;
  if r.last4_hash <> public.sign_h(p_token || ':' || coalesce(p_last4,'')) then
    update public.sign_links set tries = tries + 1, status = case when tries + 1 >= 5 then 'locked' else status end where id = r.id;
    if r.tries + 1 >= 5 then return json_build_object('ok', false, 'err', 'invalid'); end if;
    return json_build_object('ok', false, 'err', 'bad', 'left', 5 - (r.tries + 1));
  end if;
  update public.sign_links set status = 'opened', opened_at = coalesce(opened_at, now()) where id = r.id;
  return json_build_object('ok', true, 'ref', r.ref, 'title', r.title, 'p1', r.p1_name, 'p2', r.p2_name,
    'html', r.contract_html, 'state', r.sign_state, 'hash', r.contract_hash, 'expires_at', r.expires_at);
end $$;

-- توقيع العميل: مرة وحدة، وبعدها الرابط ينتهي فوراً
create or replace function public.sign_submit(p_token text, p_last4 text, p_sig text, p_ua text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare r public.sign_links; ip text;
begin
  select * into r from public.sign_links where token_hash = public.sign_h(coalesce(p_token,'')) for update;
  if not found or r.status not in ('sent','opened') or r.expires_at < now()
     or r.last4_hash <> public.sign_h(p_token || ':' || coalesce(p_last4,'')) then
    return json_build_object('ok', false, 'err', 'invalid');
  end if;
  if p_sig !~ '^data:image/png;base64,' or length(p_sig) > 300000 then return json_build_object('ok', false, 'err', 'sig'); end if;
  begin ip := split_part(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1); exception when others then ip := null; end;
  update public.sign_links set status = 'signed', signed_at = now(), p2_sig = p_sig, p2_ip = nullif(trim(ip),''), p2_ua = left(p_ua, 300)
    where id = r.id returning * into r;
  return json_build_object('ok', true, 'signed_at', r.signed_at, 'ip', r.p2_ip);
end $$;

revoke all on function public.sign_create(text,text,int,text,text,text,text,text,jsonb) from public, anon;
grant execute on function public.sign_create(text,text,int,text,text,text,text,text,jsonb) to authenticated;
revoke all on function public.sign_cancel(uuid) from public, anon;
grant execute on function public.sign_cancel(uuid) to authenticated;
grant execute on function public.sign_check(text) to anon, authenticated;
grant execute on function public.sign_open(text,text) to anon, authenticated;
grant execute on function public.sign_submit(text,text,text,text) to anon, authenticated;
