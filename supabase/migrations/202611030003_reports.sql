begin;

create function codex.financial_report(p_space_id uuid, p_start date, p_end date) returns jsonb
language plpgsql stable set search_path = '' as $$
declare v_result jsonb;
begin
  if not codex.is_member(p_space_id) then raise exception 'Espaço não autorizado.' using errcode = '42501'; end if;
  if p_start is null or p_end is null or p_start > p_end or p_end - p_start > 3660 then raise exception 'Período inválido.' using errcode = '22023'; end if;
  with filtered as (
    select t.*, c.name as category_name, c.color from codex.transactions t join codex.categories c on c.id = t.category_id
    where t.space_id = p_space_id and t.occurred_on between p_start and p_end
  ), totals as (
    select coalesce(sum(amount) filter(where type = 'income'),0) as income, coalesce(sum(amount) filter(where type = 'expense'),0) as expense from filtered
  ), categories as (
    select category_id, category_name, color, sum(amount) as total from filtered where type = 'expense' group by category_id, category_name, color
  ), months as (
    select to_char(occurred_on, 'YYYY-MM') as month, coalesce(sum(amount) filter(where type = 'income'),0) as income, coalesce(sum(amount) filter(where type = 'expense'),0) as expense
    from filtered group by 1
  ) select jsonb_build_object(
    'income', income::text, 'expense', expense::text, 'result', (income-expense)::text,
    'savings_percent', case when income > 0 then round((income-expense)/income*100,2)::text else null end,
    'categories', coalesce((select jsonb_agg(jsonb_build_object('id',category_id,'name',category_name,'color',color,'amount',total::text) order by total desc) from categories), '[]'::jsonb),
    'months', coalesce((select jsonb_agg(jsonb_build_object('month',month,'income',income::text,'expense',expense::text) order by month) from months), '[]'::jsonb)
  ) into v_result from totals;
  return v_result;
end;
$$;

create function codex.budget_report(p_space_id uuid, p_month date) returns jsonb
language plpgsql stable set search_path = '' as $$
declare v_result jsonb;
begin
  if not codex.is_member(p_space_id) then raise exception 'Espaço não autorizado.' using errcode = '42501'; end if;
  if p_month is null or extract(day from p_month) <> 1 then raise exception 'Mês inválido.' using errcode = '22023'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'category_id',b.category_id,'name',c.name,'limit',b.limit_amount::text,'spent',
    coalesce((select sum(t.amount) from codex.transactions t where t.space_id = p_space_id and t.category_id=b.category_id and t.type='expense' and t.occurred_on >= p_month and t.occurred_on < p_month + interval '1 month'),0)::text) order by c.name), '[]'::jsonb)
  into v_result from codex.budgets b join codex.categories c on c.id=b.category_id where b.space_id=p_space_id and b.month=p_month;
  return v_result;
end;
$$;

create function codex.list_members(p_space_id uuid) returns table(user_id uuid, full_name text, role text, joined_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not codex.is_member(p_space_id) then raise exception 'Espaço não autorizado.' using errcode = '42501'; end if;
  return query select m.user_id,p.full_name,m.role,m.joined_at from codex.space_members m join codex.profiles p on p.id=m.user_id where m.space_id=p_space_id order by m.joined_at;
end;
$$;

create function codex.complete_onboarding(p_name text, p_preference text, p_shared_name text default null, p_shared_type text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := auth.uid(); v_done timestamptz;
begin
  perform codex.ensure_profile();
  select onboarded_at into v_done from codex.profiles where id=v_id for update;
  if v_done is not null then return; end if;
  if char_length(trim(p_name)) not between 1 and 120 or p_name is null then raise exception 'Nome inválido.' using errcode='22023'; end if;
  if p_shared_type is not null then perform codex.create_space(p_shared_name,p_shared_type); end if;
  update codex.profiles set full_name=trim(p_name),view_preference=p_preference,onboarded_at=now() where id=v_id;
end;
$$;

revoke all on function codex.financial_report(uuid,date,date),codex.budget_report(uuid,date),codex.list_members(uuid),codex.complete_onboarding(text,text,text,text) from public,anon;
grant execute on function codex.financial_report(uuid,date,date),codex.budget_report(uuid,date),codex.list_members(uuid),codex.complete_onboarding(text,text,text,text) to authenticated;
commit;
