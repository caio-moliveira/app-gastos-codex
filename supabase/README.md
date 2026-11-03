# Banco da aplicação

Todas as tabelas e rotinas de domínio do Nosso Bolso devem ser criadas no schema `codex`. Use nomes SQL qualificados (`codex.transactions`, por exemplo). O schema `auth` é gerenciado pelo Supabase; não crie tabelas de aplicação nele ou em `public`.

## Migration inicial

`migrations/202611030001_codex_schema.sql` cria o schema com grants mínimos e privilégios padrão restritivos. Novas migrations precisam criar RLS e conceder explicitamente apenas as operações necessárias antes de disponibilizar tabelas a usuários autenticados.

Execute com uma conexão administrativa PostgreSQL configurada por variáveis libpq (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGSSLMODE=require`), sem colocar senhas na linha de comando:

```sh
psql -X -v ON_ERROR_STOP=1 -f supabase/migrations/202611030001_codex_schema.sql
psql -X -v ON_ERROR_STOP=1 -f supabase/tests/schema.sql
```

O teste cria uma tabela temporária de validação dentro de uma transação revertida, verifica permissões do schema e nega exposição automática de tabelas novas. Não modifica dados de usuários.

## API Supabase

Antes de consultar tabelas pela Data API, inclua `codex` em **API Settings → Exposed schemas**, preservando os schemas existentes. Configure os clientes com `db: { schema: "codex" }`. Essa configuração não substitui grants nem políticas RLS.

Referência: [Supabase — custom schemas](https://supabase.com/docs/guides/api/using-custom-schemas).

Estado: apenas o schema está definido nesta etapa. Tabelas do domínio, RLS por usuário/espaço e testes de isolamento serão introduzidos na etapa de dados.
