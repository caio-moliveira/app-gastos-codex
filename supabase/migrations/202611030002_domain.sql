begin;

create table codex.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  view_preference text not null default 'personal' check (view_preference in ('personal', 'shared')),
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

create table codex.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  type text not null check (type in ('personal', 'couple', 'family')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create unique index one_personal_space_per_user on codex.spaces(created_by) where type = 'personal';

create table codex.space_members (
  space_id uuid not null references codex.spaces(id) on delete cascade,
  user_id uuid not null references codex.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);
create index space_members_user_idx on codex.space_members(user_id);

create table codex.space_invitations (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references codex.spaces(id) on delete cascade,
  email text not null check (email = lower(trim(email)) and char_length(email) between 3 and 320 and email like '%@%'),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  invited_by uuid not null references codex.profiles(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);
create unique index one_pending_invitation on codex.space_invitations(space_id, email) where accepted_at is null and revoked_at is null;

create table codex.categories (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references codex.spaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  type text not null check (type in ('income', 'expense')),
  color text not null default '#237256' check (color ~ '^#[0-9a-fA-F]{6}$'),
  icon text not null default 'tag' check (char_length(icon) <= 40),
  created_at timestamptz not null default now(),
  unique (id, space_id, type),
  unique (space_id, name, type)
);

create table codex.transactions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references codex.spaces(id) on delete restrict,
  created_by uuid not null default auth.uid() references codex.profiles(id),
  type text not null check (type in ('income', 'expense')),
  amount numeric(14,2) not null check (amount > 0 and amount <> 'NaN'::numeric),
  description text not null check (char_length(trim(description)) between 1 and 500),
  category_id uuid not null,
  occurred_on date not null check (occurred_on between '1900-01-01'::date and '9998-12-31'::date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (category_id, space_id, type) references codex.categories(id, space_id, type) on delete restrict
);
create index transactions_space_date_idx on codex.transactions(space_id, occurred_on desc, id);
create index transactions_category_idx on codex.transactions(category_id);
create index transactions_author_idx on codex.transactions(created_by);

create table codex.budgets (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references codex.spaces(id) on delete restrict,
  category_id uuid not null,
  category_type text not null default 'expense' check (category_type = 'expense'),
  month date not null check (extract(day from month) = 1 and month between '1900-01-01'::date and '9998-12-01'::date),
  limit_amount numeric(14,2) not null check (limit_amount > 0 and limit_amount <> 'NaN'::numeric),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (space_id, category_id, month),
  foreign key (category_id, space_id, category_type) references codex.categories(id, space_id, type) on delete restrict
);
create index budgets_category_idx on codex.budgets(category_id);

create table codex.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references codex.spaces(id) on delete restrict,
  user_id uuid not null default auth.uid() references codex.profiles(id),
  title text not null default 'Nova conversa' check (char_length(title) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create index ai_conversations_user_space_idx on codex.ai_conversations(user_id, space_id, updated_at desc);

create table codex.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  user_id uuid not null default auth.uid() references codex.profiles(id),
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 16000),
  created_at timestamptz not null default now(),
  foreign key (conversation_id, user_id) references codex.ai_conversations(id, user_id) on delete cascade
);
create index ai_messages_conversation_idx on codex.ai_messages(conversation_id, created_at);
create index ai_messages_user_idx on codex.ai_messages(user_id);

create table codex.ai_consents (
  user_id uuid primary key default auth.uid() references codex.profiles(id) on delete cascade,
  consented_at timestamptz not null default now(),
  policy_version text not null check (char_length(policy_version) between 1 and 40)
);

-- Definer helpers avoid recursive membership policies. Identity always comes
-- from the authenticated request, never from a caller-supplied user identifier.
create function codex.is_member(p_space_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from codex.space_members where space_id = p_space_id and user_id = (select auth.uid()));
$$;
create function codex.is_owner(p_space_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from codex.space_members where space_id = p_space_id and user_id = (select auth.uid()) and role = 'owner');
$$;
create function codex.owns_conversation(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from codex.ai_conversations c where c.id = p_id and c.user_id = (select auth.uid()) and codex.is_member(c.space_id));
$$;

create function codex.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger transactions_updated before update on codex.transactions for each row execute function codex.touch_updated_at();
create trigger budgets_updated before update on codex.budgets for each row execute function codex.touch_updated_at();
create trigger conversations_updated before update on codex.ai_conversations for each row execute function codex.touch_updated_at();

create function codex.protect_membership() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_space codex.spaces%rowtype;
begin
  -- Lock parent first so concurrent owner removals cannot leave zero owners.
  select * into v_space from codex.spaces where id = coalesce(new.space_id, old.space_id) for update;
  if tg_op <> 'DELETE' then
    if v_space.type = 'personal' and (new.user_id <> v_space.created_by or new.role <> 'owner') then
      raise exception 'Espaço pessoal não aceita outros integrantes.' using errcode = '23514';
    end if;
    if tg_op = 'UPDATE' and (new.space_id <> old.space_id or new.user_id <> old.user_id) then
      raise exception 'Identidade do integrante é imutável.' using errcode = '23514';
    end if;
  end if;
  if tg_op in ('UPDATE', 'DELETE') and old.role = 'owner' then
    if tg_op = 'DELETE' or new.role <> 'owner' then
      if not exists(select 1 from codex.space_members where space_id = old.space_id and role = 'owner' and user_id <> old.user_id) then
        raise exception 'O último proprietário não pode ser removido.' using errcode = '23514';
      end if;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger membership_invariants before insert or update or delete on codex.space_members for each row execute function codex.protect_membership();

create function codex.seed_categories(p_space_id uuid) returns void
language sql security definer set search_path = '' as $$
  insert into codex.categories(space_id, name, type, color, icon) values
    (p_space_id, 'Salário', 'income', '#237256', 'briefcase'),
    (p_space_id, 'Outras receitas', 'income', '#397C64', 'plus'),
    (p_space_id, 'Alimentação', 'expense', '#C07942', 'utensils'),
    (p_space_id, 'Moradia', 'expense', '#6478A6', 'home'),
    (p_space_id, 'Transporte', 'expense', '#7A6CA1', 'car'),
    (p_space_id, 'Saúde', 'expense', '#A8586C', 'heart'),
    (p_space_id, 'Lazer', 'expense', '#39858A', 'sun'),
    (p_space_id, 'Outros', 'expense', '#71766D', 'tag');
$$;

-- Internal routine: execute is never granted to client roles.
create function codex.initialize_profile(p_user_id uuid, p_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_space uuid;
begin
  -- Serialize initialization for one identity, including the first login of an
  -- auth account that existed before the application migration.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  insert into codex.profiles(id, full_name) values (p_user_id, left(coalesce(p_name, ''), 120)) on conflict do nothing;
  if not exists(select 1 from codex.spaces where created_by = p_user_id and type = 'personal') then
    insert into codex.spaces(name, type, created_by) values ('Meu espaço', 'personal', p_user_id) returning id into v_space;
    insert into codex.space_members(space_id, user_id, role) values (v_space, p_user_id, 'owner');
    perform codex.seed_categories(v_space);
  end if;
end;
$$;
create function codex.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform codex.initialize_profile(new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;
create trigger codex_auth_user_created after insert on auth.users for each row execute function codex.handle_new_user();

create function codex.ensure_profile() returns void
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := auth.uid(); v_name text;
begin
  if v_id is null then raise exception 'Autenticação necessária.' using errcode = '42501'; end if;
  select raw_user_meta_data->>'full_name' into v_name from auth.users where id = v_id;
  if not found then raise exception 'Usuário inválido.' using errcode = '42501'; end if;
  perform codex.initialize_profile(v_id, v_name);
end;
$$;

create function codex.create_space(p_name text, p_type text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_space uuid; v_id uuid := auth.uid();
begin
  if v_id is null then raise exception 'Autenticação necessária.' using errcode = '42501'; end if;
  if p_type not in ('couple', 'family') or p_type is null then raise exception 'Tipo de espaço inválido.' using errcode = '22023'; end if;
  perform codex.ensure_profile();
  insert into codex.spaces(name, type, created_by) values (trim(p_name), p_type, v_id) returning id into v_space;
  insert into codex.space_members(space_id, user_id, role) values (v_space, v_id, 'owner');
  perform codex.seed_categories(v_space);
  return v_space;
end;
$$;

create function codex.create_invitation(p_space_id uuid, p_email text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_token text; v_email text := lower(trim(p_email)); v_type text;
begin
  if not codex.is_owner(p_space_id) then raise exception 'Apenas o proprietário pode convidar.' using errcode = '42501'; end if;
  select type into v_type from codex.spaces where id = p_space_id for update;
  if v_type = 'personal' then raise exception 'Espaço pessoal não aceita convites.' using errcode = '23514'; end if;
  if exists(select 1 from codex.space_members m join auth.users u on u.id = m.user_id where m.space_id = p_space_id and lower(u.email) = v_email) then
    raise exception 'Este e-mail já pertence a um integrante.' using errcode = '23514';
  end if;
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  update codex.space_invitations set revoked_at = now() where space_id = p_space_id and email = v_email and accepted_at is null and revoked_at is null;
  insert into codex.space_invitations(space_id, email, token_hash, invited_by, expires_at)
    values (p_space_id, v_email, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), auth.uid(), now() + interval '7 days');
  return v_token;
end;
$$;

create function codex.accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_invite codex.space_invitations%rowtype; v_email text; v_id uuid := auth.uid();
begin
  if v_id is null then raise exception 'Autenticação necessária.' using errcode = '42501'; end if;
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then raise exception 'Convite inválido.' using errcode = '22023'; end if;
  select * into v_invite from codex.space_invitations where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex') for update;
  if not found or v_invite.accepted_at is not null or v_invite.revoked_at is not null or v_invite.expires_at <= now() then
    raise exception 'Convite inválido ou expirado.' using errcode = '22023';
  end if;
  select lower(email) into v_email from auth.users where id = v_id;
  if v_email is distinct from v_invite.email then raise exception 'Entre com o e-mail convidado.' using errcode = '42501'; end if;
  if (select type from codex.spaces where id = v_invite.space_id) = 'personal' then raise exception 'Espaço pessoal não aceita integrantes.' using errcode = '23514'; end if;
  perform codex.ensure_profile();
  insert into codex.space_members(space_id, user_id, role) values (v_invite.space_id, v_id, 'member') on conflict do nothing;
  update codex.space_invitations set accepted_at = now() where id = v_invite.id;
  return v_invite.space_id;
end;
$$;

create function codex.remove_member(p_space_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not codex.is_owner(p_space_id) then raise exception 'Apenas o proprietário pode remover integrantes.' using errcode = '42501'; end if;
  delete from codex.space_members where space_id = p_space_id and user_id = p_user_id;
end;
$$;

alter table codex.profiles enable row level security;
alter table codex.spaces enable row level security;
alter table codex.space_members enable row level security;
alter table codex.space_invitations enable row level security;
alter table codex.categories enable row level security;
alter table codex.transactions enable row level security;
alter table codex.budgets enable row level security;
alter table codex.ai_conversations enable row level security;
alter table codex.ai_messages enable row level security;
alter table codex.ai_consents enable row level security;

create policy own_profile_read on codex.profiles for select to authenticated using (id = (select auth.uid()));
create policy own_profile_update on codex.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy member_spaces_read on codex.spaces for select to authenticated using (codex.is_member(id));
create policy owner_spaces_update on codex.spaces for update to authenticated using (codex.is_owner(id)) with check (codex.is_owner(id));
create policy members_read on codex.space_members for select to authenticated using (codex.is_member(space_id));
create policy owner_invitations_read on codex.space_invitations for select to authenticated using (codex.is_owner(space_id));
create policy owner_invitations_revoke on codex.space_invitations for update to authenticated using (codex.is_owner(space_id)) with check (codex.is_owner(space_id));
create policy member_categories_read on codex.categories for select to authenticated using (codex.is_member(space_id));
create policy member_categories_insert on codex.categories for insert to authenticated with check (codex.is_member(space_id));
create policy owner_categories_update on codex.categories for update to authenticated using (codex.is_owner(space_id)) with check (codex.is_owner(space_id));
create policy owner_categories_delete on codex.categories for delete to authenticated using (codex.is_owner(space_id));
create policy member_transactions_read on codex.transactions for select to authenticated using (codex.is_member(space_id));
create policy member_transactions_insert on codex.transactions for insert to authenticated with check (codex.is_member(space_id) and created_by = (select auth.uid()));
create policy authorized_transactions_update on codex.transactions for update to authenticated using (codex.is_member(space_id) and (created_by = (select auth.uid()) or codex.is_owner(space_id))) with check (codex.is_member(space_id) and (created_by = (select auth.uid()) or codex.is_owner(space_id)));
create policy authorized_transactions_delete on codex.transactions for delete to authenticated using (codex.is_member(space_id) and (created_by = (select auth.uid()) or codex.is_owner(space_id)));
create policy member_budgets_read on codex.budgets for select to authenticated using (codex.is_member(space_id));
create policy owner_budgets_insert on codex.budgets for insert to authenticated with check (codex.is_owner(space_id));
create policy owner_budgets_update on codex.budgets for update to authenticated using (codex.is_owner(space_id)) with check (codex.is_owner(space_id));
create policy owner_budgets_delete on codex.budgets for delete to authenticated using (codex.is_owner(space_id));
create policy private_conversations_read on codex.ai_conversations for select to authenticated using (user_id = (select auth.uid()) and codex.is_member(space_id));
create policy private_conversations_insert on codex.ai_conversations for insert to authenticated with check (user_id = (select auth.uid()) and codex.is_member(space_id));
create policy private_conversations_update on codex.ai_conversations for update to authenticated using (user_id = (select auth.uid()) and codex.is_member(space_id)) with check (user_id = (select auth.uid()) and codex.is_member(space_id));
create policy private_conversations_delete on codex.ai_conversations for delete to authenticated using (user_id = (select auth.uid()) and codex.is_member(space_id));
create policy private_messages_read on codex.ai_messages for select to authenticated using (user_id = (select auth.uid()) and codex.owns_conversation(conversation_id));
create policy private_messages_insert on codex.ai_messages for insert to authenticated with check (user_id = (select auth.uid()) and codex.owns_conversation(conversation_id));
create policy own_consents_read on codex.ai_consents for select to authenticated using (user_id = (select auth.uid()));
create policy own_consents_insert on codex.ai_consents for insert to authenticated with check (user_id = (select auth.uid()));

-- Immutable identity columns are excluded from write grants. Only RLS-scoped
-- domain operations can create spaces, invitations or membership records.
revoke all on all tables in schema codex from public, anon, authenticated;
grant select on codex.profiles, codex.spaces, codex.space_members, codex.categories, codex.transactions, codex.budgets, codex.ai_conversations, codex.ai_messages, codex.ai_consents to authenticated;
grant select(id, space_id, email, invited_by, expires_at, accepted_at, revoked_at, created_at) on codex.space_invitations to authenticated;
grant update(full_name, view_preference, onboarded_at) on codex.profiles to authenticated;
grant update(name) on codex.spaces to authenticated;
grant update(revoked_at) on codex.space_invitations to authenticated;
grant insert(space_id, name, type, color, icon), update(name, color, icon), delete on codex.categories to authenticated;
grant insert(space_id, type, amount, description, category_id, occurred_on), update(type, amount, description, category_id, occurred_on), delete on codex.transactions to authenticated;
grant insert(space_id, category_id, month, limit_amount), update(limit_amount), delete on codex.budgets to authenticated;
grant insert(space_id, title), update(title), delete on codex.ai_conversations to authenticated;
grant insert(conversation_id, role, content) on codex.ai_messages to authenticated;
grant insert(policy_version) on codex.ai_consents to authenticated;

revoke all on all functions in schema codex from public, anon, authenticated;
grant execute on function codex.is_member(uuid), codex.is_owner(uuid), codex.owns_conversation(uuid), codex.ensure_profile(), codex.create_space(text, text), codex.create_invitation(uuid, text), codex.accept_invitation(text), codex.remove_member(uuid, uuid) to authenticated;

commit;
