begin;

do $$
begin
  if not exists(select 1 from pg_namespace where nspname = 'codex') then
    raise exception 'codex schema is missing';
  end if;
  if has_schema_privilege('anon', 'codex', 'USAGE') then
    raise exception 'anonymous role must not have schema access';
  end if;
  if not has_schema_privilege('authenticated', 'codex', 'USAGE') then
    raise exception 'authenticated role must have schema access';
  end if;
end;
$$;

-- Prove that default privileges deny direct access before table-specific grants.
-- The fixture is rolled back; all application/test tables stay inside codex.
create table codex.schema_privilege_probe (id integer);

do $$
begin
  if has_table_privilege('authenticated', 'codex.schema_privilege_probe', 'SELECT')
     or has_table_privilege('anon', 'codex.schema_privilege_probe', 'SELECT') then
    raise exception 'new tables must not be automatically readable';
  end if;
end;
$$;

rollback;
