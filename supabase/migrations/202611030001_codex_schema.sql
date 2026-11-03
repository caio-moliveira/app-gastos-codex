begin;

-- All application-owned tables and domain routines must live in codex.
create schema if not exists codex;
comment on schema codex is 'Nosso Bolso application data; protected by explicit grants and row level security.';

revoke all on schema codex from public, anon;
grant usage on schema codex to authenticated, service_role;

-- Do not automatically expose future tables or RPCs. Each migration grants
-- only the required operations after creating its row level security policies.
alter default privileges in schema codex revoke all on tables from public, anon, authenticated;
alter default privileges in schema codex revoke all on sequences from public, anon, authenticated;
alter default privileges in schema codex revoke execute on functions from public, anon, authenticated;

commit;
