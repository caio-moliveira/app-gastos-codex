# Banco da aplicação

Todas as tabelas e rotinas de domínio do Nosso Bolso devem ser criadas no schema `codex`. Use nomes SQL qualificados (`codex.transactions`, por exemplo). O schema `auth` é gerenciado pelo Supabase; não crie tabelas de aplicação nele ou em `public`.

## Migrations e testes

`migrations/202611030001_codex_schema.sql` cria o schema com grants mínimos e privilégios padrão restritivos. `202611030002_domain.sql` cria as dez tabelas do PRD, constraints, índices, triggers, RPCs de perfil/espaços/convites e políticas RLS. Novas migrations precisam conceder explicitamente apenas as operações necessárias antes de disponibilizar tabelas a usuários autenticados.

Execute com uma conexão administrativa PostgreSQL configurada por variáveis libpq (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGSSLMODE=require`), sem colocar senhas na linha de comando:

```sh
psql -X -v ON_ERROR_STOP=1 -f supabase/migrations/202611030001_codex_schema.sql
psql -X -v ON_ERROR_STOP=1 -f supabase/migrations/202611030002_domain.sql
psql -X -v ON_ERROR_STOP=1 -f supabase/tests/schema.sql
psql -X -v ON_ERROR_STOP=1 -f supabase/tests/domain.sql
```

O teste cria uma tabela temporária de validação dentro de uma transação revertida, verifica permissões do schema e nega exposição automática de tabelas novas. Não modifica dados de usuários.

Alternativamente, com `DATABASE_URL` em `.env`, use `npm run db:sql -- supabase/migrations/<arquivo>.sql` para aplicar uma migration nova, uma única vez. `npm run db:test` executa todos os testes SQL. Requer `psql` no PATH. O executor passa credenciais por ambiente, sem incluir a conexão nos argumentos ou imprimir os resultados das fixtures.

`domain.sql` cria duas identidades sintéticas em `auth.users` dentro de uma transação revertida e assume a role `authenticated`. Verifica espaços privados/compartilhados, ações de owner/member, imutabilidade de identidade/espaço, convites de uso único com expiração/e-mail, privacidade de conversas e constraints de dinheiro/categoria/orçamento. Os testes não modificam registros reais de usuários.

A CI usa Supabase local com Auth e PostgreSQL 17, aplica as migrations em banco novo e executa os testes. A mesma suíte também passou no Supabase real. Essas verificações de banco não comprovam cookies SSR ou integração HTTP.

## Supabase local

Com Docker disponível:

```sh
npm ci
npx supabase start -x realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
```

O CLI aplica as migrations automaticamente no primeiro start. Para testar esse ambiente, configure `DATABASE_URL` no processo como `postgresql://postgres:postgres@127.0.0.1:54322/postgres` e execute `npm run db:test`. Essa credencial é exclusiva do ambiente local descartável. O `.env` não sobrescreve uma variável já definida no processo.

## API Supabase

Antes de consultar tabelas pela Data API, inclua `codex` em **API Settings → Exposed schemas**, preservando os schemas existentes. Configure os clientes com `db: { schema: "codex" }`. Essa configuração não substitui grants nem políticas RLS.

Referência: [Supabase — custom schemas](https://supabase.com/docs/guides/api/using-custom-schemas).

No ambiente local, `config.toml` já expõe exclusivamente `codex`. A configuração do projeto hospedado ainda precisa ser verificada antes da integração HTTP. Consulte o [contrato de dados](../docs/DATA_CONTRACT.md) para permissões, RPCs e erros.
