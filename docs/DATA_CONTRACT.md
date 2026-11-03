# Contrato de dados e autorização

## Identidade e schema

Todas as tabelas e RPCs da aplicação pertencem a `codex`. As chamadas usam a sessão Supabase do usuário, com `db: { schema: "codex" }`; nunca usam chave privilegiada para contornar RLS. Supabase Auth mantém `auth.users` e determina `auth.uid()`.

O servidor deve validar a sessão e a participação no espaço antes das operações. O banco repete essa autorização. Não aceitar autor, identidade de usuário ou papéis enviados pelo cliente/modelo como autoridade.

## Tabelas

| Tabela | Leitura | Escrita do usuário autenticado |
| --- | --- | --- |
| `profiles` | Somente o próprio perfil | Nome, preferência e conclusão do onboarding; criação interna |
| `spaces` | Membros | Owner altera nome; criação via RPC |
| `space_members` | Membros do mesmo espaço | Somente RPC de convite/remoção |
| `space_invitations` | Owner, sem coluna `token_hash` | Owner pode revogar; criação/aceite via RPC |
| `categories` | Membros | Membros criam; owner altera/exclui; categoria em uso não é excluível |
| `transactions` | Membros | Membro cria e altera/exclui as próprias; owner altera/exclui todas |
| `budgets` | Membros | Somente owner |
| `ai_conversations` | Autor e membro do espaço | Somente autor e membro do espaço |
| `ai_messages` | Autor e membro do espaço | Somente em conversa própria do mesmo autor |
| `ai_consents` | Próprio usuário | Inserção da versão de política; timestamp definido pelo banco |

Identidades, espaço e autor de registros existentes são imutáveis para clientes. Valores monetários usam `NUMERIC(14,2)`, positivos; validar entrada decimal com no máximo duas casas antes de enviar ao banco. Transportar como strings decimais e calcular em centavos inteiros ou no PostgreSQL. Datas financeiras usam `DATE`, sem conversão para instante UTC.

## RPCs públicas autenticadas

| Nome e argumentos | Retorno | Regras |
| --- | --- | --- |
| `ensure_profile()` | void | Inicializa perfil e espaço pessoal atomicamente; idempotente para a sessão atual |
| `create_space(p_name text, p_type text)` | UUID | Apenas `couple`/`family`; criador vira owner e recebe categorias padrão |
| `create_invitation(p_space_id uuid, p_email text)` | token hexadecimal de 64 caracteres | Somente owner de espaço compartilhado; token armazenado apenas como SHA-256; expira em sete dias; novo convite revoga o anterior para o mesmo e-mail |
| `accept_invitation(p_token text)` | UUID do espaço | Sessão e e-mail convidado obrigatórios; uso único, válido e não revogado; entrada como member |
| `remove_member(p_space_id uuid, p_user_id uuid)` | void | Somente owner; bloqueia remoção do último proprietário |
| `is_member(p_space_id uuid)` / `is_owner(p_space_id uuid)` | boolean | Consultam exclusivamente a identidade autenticada |
| `owns_conversation(p_id uuid)` | boolean | Autor atual e participação no espaço |

Rotinas internas de inicialização, categorias e triggers não são executáveis pelos clientes. Funções com privilégios elevados têm `search_path` vazio e referências qualificadas.

## Erros e limites da evidência

SQLSTATE `42501` indica falta de autorização; `22023`, argumento/convite inválido; `23514`, regra de domínio; `23503`, vínculo inválido/categoria em uso; `23505`, duplicidade. A UI deve traduzir os erros sem exibir detalhes internos ou dados privados.

RLS pode retornar zero linhas em leituras, updates e deletes proibidos. Verificar a linha afetada retornada; não interpretar uma resposta sem erro como prova de alteração. Limitar/paginar consultas de listagem no servidor.

Os testes SQL assumem a role `authenticated` e claims sintéticas em uma transação revertida. Comprovam constraints, grants e RLS no PostgreSQL/Supabase; não comprovam cookies SSR, telas ou integração HTTP. Esses fluxos serão verificados na etapa de autenticação/interface.
