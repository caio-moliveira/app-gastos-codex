-- All fixtures are synthetic and rolled back, including auth.users records.
begin;

insert into auth.users(id, email, raw_user_meta_data) values
  ('90000000-0000-4000-8000-000000000001', 'codex-test-a@example.invalid', '{"full_name":"Teste A"}'),
  ('90000000-0000-4000-8000-000000000002', 'codex-test-b@example.invalid', '{"full_name":"Teste B"}');

-- Privileged integrity checks and identifiers made available to role tests.
do $$
declare v_a uuid; v_b uuid;
begin
  select id into strict v_a from codex.spaces where created_by = '90000000-0000-4000-8000-000000000001' and type = 'personal';
  select id into strict v_b from codex.spaces where created_by = '90000000-0000-4000-8000-000000000002' and type = 'personal';
  perform set_config('test.space_a', v_a::text, true);
  perform set_config('test.space_b', v_b::text, true);
  if (select count(*) from codex.categories where space_id = v_a) <> 8 then raise exception 'default categories missing'; end if;
  if exists(select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'codex' and c.relkind = 'r' and not c.relrowsecurity) then
    raise exception 'every application table must enable RLS';
  end if;
  if has_function_privilege('authenticated', 'codex.initialize_profile(uuid,text)', 'EXECUTE')
     or has_function_privilege('anon', 'codex.ensure_profile()', 'EXECUTE') then
    raise exception 'internal or authenticated RPC privileges leaked';
  end if;
  begin
    insert into codex.space_members(space_id, user_id, role) values (v_a, '90000000-0000-4000-8000-000000000002', 'member');
    raise exception 'personal space accepted another member';
  exception when check_violation then null; end;
  begin
    delete from codex.space_members where space_id = v_a;
    raise exception 'last owner was removed';
  exception when check_violation then null; end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);

do $$
declare v_shared uuid; v_token text; v_category uuid; v_conversation uuid;
begin
  perform codex.ensure_profile();
  perform codex.ensure_profile();
  if (select count(*) from codex.spaces) <> 1 then raise exception 'personal space initialization is not isolated or idempotent'; end if;
  if (select count(*) from codex.profiles) <> 1 then raise exception 'profile leaked'; end if;
  if exists(select 1 from codex.spaces where id = current_setting('test.space_b')::uuid) then raise exception 'other personal space leaked'; end if;
  begin
    insert into codex.categories(space_id, name, type) values (current_setting('test.space_b')::uuid, 'Tentativa', 'expense');
    raise exception 'cross-space category insert succeeded';
  exception when insufficient_privilege then null; end;
  begin
    perform codex.create_invitation(current_setting('test.space_a')::uuid, 'codex-test-b@example.invalid');
    raise exception 'personal invitation succeeded';
  exception when check_violation then null; end;
  v_shared := codex.create_space('Nossa Casa', 'family');
  perform set_config('test.shared', v_shared::text, true);
  v_token := codex.create_invitation(v_shared, 'codex-test-b@example.invalid');
  perform set_config('test.token', v_token, true);
  if length(v_token) <> 64 then raise exception 'invitation token length'; end if;
  select id into strict v_category from codex.categories where space_id = v_shared and name = 'Alimentação';
  perform set_config('test.category', v_category::text, true);
  insert into codex.transactions(space_id, type, amount, description, category_id, occurred_on)
    values (v_shared, 'expense', 1200, 'Mercado', v_category, '2026-10-10');
  insert into codex.transactions(space_id, type, amount, description, category_id, occurred_on)
    select current_setting('test.space_a')::uuid, 'expense', 30, 'Privada', id, '2026-10-11'
    from codex.categories where space_id = current_setting('test.space_a')::uuid and name = 'Alimentação';
  insert into codex.budgets(space_id, category_id, month, limit_amount) values (v_shared, v_category, '2026-10-01', 1000);
  if codex.financial_report(v_shared, '2026-10-01', '2026-10-31')->>'expense' <> '1200.00' then raise exception 'financial report total mismatch'; end if;
  if codex.budget_report(v_shared, '2026-10-01')->0->>'spent' <> '1200.00' then raise exception 'budget report total mismatch'; end if;
  begin
    insert into codex.budgets(space_id, category_id, month, limit_amount) values (v_shared, v_category, '2026-10-01', 2000);
    raise exception 'duplicate budget succeeded';
  exception when unique_violation then null; end;
  begin
    insert into codex.transactions(space_id, type, amount, description, category_id, occurred_on)
      values (current_setting('test.space_a')::uuid, 'expense', 1, 'Categoria externa', v_category, '2026-10-10');
    raise exception 'cross-space category accepted';
  exception when foreign_key_violation then null; end;
  begin
    insert into codex.transactions(space_id, type, amount, description, category_id, occurred_on)
      values (v_shared, 'income', 1, 'Tipo errado', v_category, '2026-10-10');
    raise exception 'category direction mismatch accepted';
  exception when foreign_key_violation then null; end;
  begin
    insert into codex.transactions(space_id, type, amount, description, category_id, occurred_on)
      values (v_shared, 'expense', -1, 'Valor negativo', v_category, '2026-10-10');
    raise exception 'negative transaction accepted';
  exception when check_violation then null; end;
  begin
    insert into codex.transactions(space_id, type, amount, description, category_id, occurred_on)
      values (v_shared, 'expense', 'NaN'::numeric, 'NaN', v_category, '2026-10-10');
    raise exception 'NaN transaction accepted';
  exception when check_violation then null; end;
  begin
    delete from codex.categories where id = v_category;
    raise exception 'used category was deleted';
  exception when foreign_key_violation then null; end;
  begin
    insert into codex.transactions(space_id, created_by, type, amount, description, category_id, occurred_on)
      values (v_shared, '90000000-0000-4000-8000-000000000002', 'expense', 1, 'Autor forjado', v_category, '2026-10-10');
    raise exception 'forged author accepted';
  exception when insufficient_privilege then null; end;
  insert into codex.ai_conversations(space_id, title) values (v_shared, 'Privada do A') returning id into v_conversation;
  perform set_config('test.conversation_a', v_conversation::text, true);
  insert into codex.ai_messages(conversation_id, role, content) values (v_conversation, 'user', 'Mensagem privada');
  insert into codex.ai_consents(policy_version) values ('2026-11-03');
end;
$$;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true);
do $$
declare v_count integer;
begin
  -- Before invitation acceptance, shared data is inaccessible.
  if codex.is_member(current_setting('test.shared')::uuid) then raise exception 'membership preexists'; end if;
  if exists(select 1 from codex.transactions) then raise exception 'transactions leaked before joining'; end if;
  begin
    perform codex.financial_report(current_setting('test.shared')::uuid, '2026-10-01', '2026-10-31');
    raise exception 'unauthorized report succeeded';
  exception when insufficient_privilege then null; end;
  perform codex.accept_invitation(current_setting('test.token'));
  if not codex.is_member(current_setting('test.shared')::uuid) then raise exception 'membership missing after acceptance'; end if;
  begin
    perform codex.accept_invitation(current_setting('test.token'));
    raise exception 'invitation reuse succeeded';
  exception when invalid_parameter_value then null; end;
  if (select count(*) from codex.transactions) <> 1 then raise exception 'shared/private transaction isolation failed'; end if;
  if exists(select 1 from codex.ai_conversations) or exists(select 1 from codex.ai_messages) or exists(select 1 from codex.ai_consents) then
    raise exception 'private assistant data leaked';
  end if;
  update codex.transactions set description = 'Tentativa de editar do A' where space_id = current_setting('test.shared')::uuid;
  get diagnostics v_count = row_count;
  if v_count <> 0 then raise exception 'member edited owner transaction'; end if;
  delete from codex.transactions where space_id = current_setting('test.shared')::uuid;
  get diagnostics v_count = row_count;
  if v_count <> 0 then raise exception 'member deleted owner transaction'; end if;
  update codex.budgets set limit_amount = 5 where space_id = current_setting('test.shared')::uuid;
  get diagnostics v_count = row_count;
  if v_count <> 0 then raise exception 'member changed budget'; end if;
  begin
    insert into codex.budgets(space_id, category_id, month, limit_amount)
      values (current_setting('test.shared')::uuid, current_setting('test.category')::uuid, '2026-11-01', 1000);
    raise exception 'member created budget';
  exception when insufficient_privilege then null; end;
  begin
    perform codex.create_invitation(current_setting('test.shared')::uuid, 'other@example.invalid');
    raise exception 'member invited someone';
  exception when insufficient_privilege then null; end;
  begin
    insert into codex.ai_messages(conversation_id, role, content)
      values (current_setting('test.conversation_a')::uuid, 'user', 'Invadindo conversa');
    raise exception 'member wrote another user conversation';
  exception when insufficient_privilege then null; end;
  insert into codex.transactions(space_id, type, amount, description, category_id, occurred_on)
    values (current_setting('test.shared')::uuid, 'expense', 10, 'Despesa do B', current_setting('test.category')::uuid, '2026-10-12');
  update codex.transactions set description = 'Despesa do B atualizada' where created_by = auth.uid();
  get diagnostics v_count = row_count;
  if v_count <> 1 then raise exception 'member cannot edit own transaction'; end if;
  begin
    update codex.transactions set space_id = current_setting('test.space_b')::uuid where created_by = auth.uid();
    raise exception 'transaction silently moved between spaces';
  exception when insufficient_privilege then null; end;
end;
$$;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
do $$
declare v_count integer; v_token text;
begin
  update codex.transactions set description = 'Owner editou do B' where created_by = '90000000-0000-4000-8000-000000000002';
  get diagnostics v_count = row_count;
  if v_count <> 1 then raise exception 'owner cannot edit member transaction'; end if;
  begin
    perform codex.remove_member(current_setting('test.shared')::uuid, auth.uid());
    raise exception 'last owner removed through RPC';
  exception when check_violation then null; end;
  v_token := codex.create_invitation(current_setting('test.shared')::uuid, 'unrelated@example.invalid');
  begin
    perform codex.accept_invitation(v_token);
    raise exception 'wrong email accepted invitation';
  exception when insufficient_privilege then null; end;
  perform set_config('test.expiring_token', v_token, true);
end;
$$;

reset role;
-- Check stored invitation hashes and expire an invitation without revealing it.
do $$
begin
  if exists(select 1 from codex.space_invitations where token_hash = current_setting('test.token')) then raise exception 'raw invitation token was stored'; end if;
  update codex.space_invitations set created_at = now() - interval '2 days', expires_at = now() - interval '1 day'
    where email = 'unrelated@example.invalid' and space_id = current_setting('test.shared')::uuid;
end;
$$;
set local role authenticated;
do $$
begin
  begin
    perform codex.accept_invitation(current_setting('test.expiring_token'));
    raise exception 'expired invitation accepted';
  exception when invalid_parameter_value then null; end;
  perform codex.remove_member(current_setting('test.shared')::uuid, '90000000-0000-4000-8000-000000000002');
end;
$$;
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true);
do $$
begin
  if codex.is_member(current_setting('test.shared')::uuid) or exists(select 1 from codex.transactions) then raise exception 'removed member retains access'; end if;
end;
$$;

reset role;
set local role anon;
do $$
begin
  begin
    perform codex.ensure_profile();
    raise exception 'anonymous role accessed application RPC';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;
rollback;
