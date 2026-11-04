begin;
create table codex.ai_usage (
  user_id uuid not null references codex.profiles(id) on delete cascade,
  day date not null,
  requests integer not null default 0 check(requests >= 0),
  minute timestamptz not null default date_trunc('minute',now()),
  minute_requests integer not null default 0 check(minute_requests >= 0),
  primary key(user_id,day)
);
alter table codex.ai_usage enable row level security;
create policy own_usage_read on codex.ai_usage for select to authenticated using(user_id=(select auth.uid()));
revoke all on codex.ai_usage from public,anon,authenticated;
grant select on codex.ai_usage to authenticated;

create function codex.reserve_ai_request(p_space_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=auth.uid(); v_day date := (now() at time zone 'UTC')::date; v_minute timestamptz:=date_trunc('minute',now()); v_usage codex.ai_usage%rowtype;
begin
  if not codex.is_member(p_space_id) then raise exception 'Espaço não autorizado.' using errcode='42501'; end if;
  if not exists(select 1 from codex.ai_consents where user_id=v_id and policy_version='2026-11-03') then raise exception 'Consentimento necessário.' using errcode='42501'; end if;
  insert into codex.ai_usage(user_id,day) values(v_id,v_day) on conflict do nothing;
  select * into v_usage from codex.ai_usage where user_id=v_id and day=v_day for update;
  if v_usage.requests >= 30 or (v_usage.minute=v_minute and v_usage.minute_requests>=6) then raise exception 'Limite de uso atingido. Tente mais tarde.' using errcode='P0001'; end if;
  update codex.ai_usage set requests=requests+1,minute=v_minute,minute_requests=case when minute=v_minute then minute_requests+1 else 1 end where user_id=v_id and day=v_day;
end;
$$;
revoke all on function codex.reserve_ai_request(uuid) from public,anon;
grant execute on function codex.reserve_ai_request(uuid) to authenticated;
commit;
