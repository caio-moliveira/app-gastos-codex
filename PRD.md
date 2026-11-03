# PRD — Nosso Bolso

**Versão:** 1.0  
**Data:** 02/11/2026  
**Status:** pronto para implementação  
**Produto:** aplicação web de finanças pessoais, para casal e família  
**Contexto:** desafio de desenvolvimento ao vivo — Claude Code vs. Codex

## 1. Visão do produto

Construir o **Nosso Bolso**, uma aplicação web responsiva para registrar receitas e despesas, acompanhar orçamentos, visualizar indicadores financeiros e conversar com um **assistente de IA capaz de responder perguntas sobre os dados financeiros reais do usuário**.

A aplicação deve servir a três situações: (1) pessoa que organiza as próprias finanças; (2) casal que compartilha despesas; (3) família com vários integrantes. O mesmo usuário pode pertencer a vários espaços, mantendo suas finanças privadas separadas das finanças compartilhadas.

**Objetivo da entrega:** um MVP completo e utilizável, com autenticação, banco de dados persistente no Supabase, deploy funcional na Vercel e integração de IA via OpenRouter usando `openai/gpt-6-luna`. Uma tela bonita sem persistência, autorização ou IA conectada a dados reais **não** atende ao objetivo.

## 2. Público e problemas

- **Pessoa individual:** quer saber quanto recebe, gasta e economiza por mês, e em quais categorias.
- **Casal:** quer registrar despesas comuns sem misturar automaticamente dados privados de cada parceiro.
- **Família:** quer acompanhar gastos compartilhados, quem registrou cada despesa e o orçamento conjunto.
- **Todos:** querem fazer perguntas em linguagem natural como “Quanto gastei em alimentação em outubro?” e obter respostas numericamente corretas, com base nos lançamentos registrados.

## 3. Escopo e prioridades

### P0 — obrigatório para considerar o MVP concluído

1. Autenticação de usuários com Supabase Auth: cadastro, login, logout, sessão persistida e recuperação de senha.
2. Onboarding: criar automaticamente um espaço pessoal privado; permitir criar espaço de tipo **casal** ou **família**.
3. Espaços: alternar entre espaços; convidar integrante por link seguro com expiração, autenticado antes de aceitar; visualizar integrantes e papel de cada um.
4. Gestão de transações: cadastrar, listar, filtrar, editar e excluir receitas/despesas, com valor, data, descrição, categoria, espaço e responsável pelo lançamento.
5. Gestão de categorias de receita/despesa: categorias padrão e possibilidade de criar categorias próprias em cada espaço.
6. Dashboard por espaço e período: receita, despesa, saldo do período, distribuição por categoria e evolução mensal.
7. Orçamento mensal por categoria, com percentual consumido e aviso de ultrapassagem.
8. Assistente conversacional de IA com histórico, usando **OpenRouter + GPT-6 Luna**, conectado a consultas seguras de dados financeiros reais do espaço selecionado.
9. Interface responsiva em português do Brasil, com valores em BRL (`R$`) e datas `dd/mm/aaaa`.
10. Banco **Supabase Postgres**, autenticação e **RLS efetiva** em todas as tabelas expostas.
11. Deploy de produção **Vercel**, com aplicação operando sobre banco real, não mocks.
12. Migrations SQL, testes das regras principais, `.env.example`, instruções locais e de deploy no `README.md`.

### P1 — desejável somente após todos os P0

- Exportação de transações em CSV.
- Transações recorrentes e parcelamento.
- Contas e cartões com saldo por conta, faturas e transferências.
- Metas de economia, alertas e notificações.
- Gráficos adicionais e exportação de relatórios.
- Integração bancária/Open Finance.

**Fora do MVP:** movimentação de dinheiro, pagamentos, consultoria de investimentos, busca na web para o agente, OCR de comprovantes e conexão automática com bancos. Não ampliar o escopo por conta própria antes de concluir o P0.

## 4. Stack e decisões técnicas obrigatórias

| Camada | Tecnologia |
| --- | --- |
| Aplicação | Next.js (App Router) + TypeScript |
| Interface | Tailwind CSS + shadcn/ui (ou biblioteca equivalente de componentes acessíveis) |
| Gráficos | Recharts ou equivalente |
| Formulários/validação | React Hook Form + Zod, ou alternativa equivalente e tipada |
| Banco | Supabase PostgreSQL |
| Autenticação | Supabase Auth; sessão SSR por cookies via `@supabase/ssr` |
| Autorização | Postgres Row Level Security (RLS) + validação em rotas server-side |
| Assistente de IA | OpenRouter API; modelo `openai/gpt-6-luna` |
| Hospedagem | Vercel, incluindo funções server-side do Next.js |
| Testes | Vitest (regras) + Playwright (fluxos principais) ou equivalentes |

- Usar versão estável e compatível das dependências na data de implementação.
- Não criar backend separado desnecessariamente: usar Route Handlers/Server Actions do Next.js para lógica de servidor e integração de IA.
- Não usar armazenamento em memória/localStorage como fonte de verdade financeira.
- Não usar SQLite, Prisma obrigatório, serviços de IA alternativos ou banco diferente do Supabase.
- Não inserir chaves privilegiadas no frontend nem em commits.

## 5. Jornadas e requisitos funcionais

### RF-01 — Conta e primeiro acesso

- Usuário cadastra e-mail e senha, confirma e-mail quando habilitado, entra e sai com segurança.
- Implementar fluxo de “Esqueci minha senha”, com URL de retorno configurável para produção.
- Após o cadastro, criar um perfil e um espaço pessoal privado, do qual somente o próprio usuário é membro.
- No primeiro acesso, exibir onboarding curto: nome, preferência de visualização e opção de criar espaço compartilhado.

**Aceite:** uma pessoa recém-cadastrada consegue registrar uma despesa e vê-la após recarregar a página e após novo login.

### RF-02 — Espaços individual, casal e família

- Um **espaço** contém suas próprias categorias, transações e orçamentos.
- Tipos de espaço: `personal`, `couple`, `family`.
- Espaço pessoal não aceita convites. Espaços compartilhados aceitam membros.
- Papéis: `owner` (gerencia integrantes, convite e orçamento; também pode gerir todos os registros do espaço) e `member` (consulta dados compartilhados, cria lançamentos e altera/exclui apenas os próprios lançamentos).
- Ao registrar uma transação, o espaço deve ser explícito e nunca ser mudado silenciosamente.
- Despesas pessoais só podem ser vistas pelo dono do espaço pessoal. Pertencer ao mesmo casal/família não concede acesso às despesas privadas do outro.
- Não somar lançamentos de espaços diferentes em um mesmo total sem uma seleção explícita do usuário; o dashboard padrão refere-se **somente ao espaço atual**.
- Convites com token aleatório forte, armazenado apenas como hash; expiração, uso único e aceite vinculado ao e-mail autenticado convidado; prevenção de duplicidade de membros.

**Aceite:** duas contas compartilham um espaço familiar, mas não conseguem acessar uma à outra em seus espaços pessoais, nem por URL, requisição manipulada ou consulta ao banco.

### RF-03 — Transações

Campos mínimos: `id`, `space_id`, `created_by`, `type` (`income` ou `expense`), `amount`, `description`, `category_id`, `occurred_on`, `created_at`, `updated_at`.

- `amount` sempre positivo, guardado em `NUMERIC(14,2)` no banco; `type` define a direção financeira.
- Usar decimais exatos para valores monetários; nunca somar dinheiro usando floats no frontend.
- Datas financeiras são datas de calendário, não horários UTC que possam deslocar o lançamento para outro dia.
- Filtro por intervalo de datas, tipo, categoria e texto de descrição.
- Ordem inicial: mais recentes primeiro; paginação ou limite de resultados.
- Categoria deve pertencer ao mesmo espaço e ser compatível com o tipo da transação.
- Registrar `created_by` a partir do usuário autenticado, nunca de campo confiado ao cliente.
- Pedir confirmação para exclusão e oferecer mensagens claras de sucesso/erro.

**Aceite:** criar, alterar, excluir, filtrar e recarregar transações preserva consistência dos totais.

### RF-04 — Dashboard

Exibir para o espaço e o período selecionados:

- **Total de receitas**: soma de `income` no período.
- **Total de despesas**: soma de `expense` no período.
- **Resultado do período**: receitas menos despesas, sem confundir com saldo bancário real.
- **Taxa de economia**: `(receitas - despesas) / receitas * 100` se receitas > 0; caso contrário, exibir “N/D”.
- **Despesas por categoria** (gráfico de rosca ou barras) e **evolução mensal** (gráfico de barras/linhas).
- Lista de lançamentos recentes e um atalho para adicionar transação.
- Mês atual como padrão; navegar entre meses e ter estado vazio útil quando não há dados.

**Aceite:** todos os valores dos cartões correspondem aos lançamentos do mesmo espaço/período e à mesma regra contábil utilizada pela IA.

### RF-05 — Orçamento

- Definir um limite mensal por categoria de despesa e espaço.
- Uma única regra de orçamento para cada combinação `(space_id, category_id, month)`.
- Exibir gasto realizado, limite, valor restante e percentual utilizado.
- Mostrar aviso quando consumo >= 80% e destaque quando > 100%.
- Em espaço compartilhado, apenas `owner` altera limites; todos os membros visualizam.

**Aceite:** orçamento de R$ 1.000 e gastos de R$ 1.200 mostra 120% utilizado e R$ 200 acima do limite.

### RF-06 — Assistente de IA

Adicionar página **Assistente** com chat fluido, mensagens em português, perguntas sugeridas, estado de carregamento, tratamento de erros, histórico de conversas **privado para o autor** e identificação visível do espaço consultado.

**Perguntas que deve responder corretamente:**

1. “Quanto gastei no mês passado?”
2. “Qual foi minha maior categoria de despesas em outubro?”
3. “Quanto entrou e quanto saiu nos últimos três meses?”
4. “Quais foram meus cinco maiores gastos?”
5. “Estou acima do orçamento de alimentação?”
6. “Compare outubro com setembro.”
7. “O que posso fazer para economizar com base nos meus gastos?”
8. “Quanto a nossa família gastou no mercado este mês?” (apenas se estiver em espaço familiar autorizado)

#### Arquitetura obrigatória do agente

O assistente **não deve receber o banco inteiro no prompt, inventar saldos ou executar SQL arbitrário**. Deve utilizar um mecanismo de *tool calling* com funções de leitura implementadas no servidor, por exemplo:

- `get_financial_summary({ space_id, start_date, end_date })` — receitas, despesas, resultado e taxa de economia.
- `get_expenses_by_category({ space_id, start_date, end_date })` — agrupamento e ordenação de gastos.
- `get_transactions({ space_id, start_date, end_date, category_id?, type?, limit? })` — lista restrita de lançamentos; `limit` com teto no servidor.
- `get_budget_status({ space_id, month })` — orçamentos e valores realizados.
- `compare_periods({ space_id, period_a, period_b })` — comparações calculadas no backend.

**Segurança do agente:**

- Validar a sessão em toda solicitação de chat e a participação do usuário no espaço selecionado, **também dentro de cada ferramenta**. Não confiar em `user_id` ou `space_id` proposto pelo modelo.
- Usar a identidade do usuário autenticado e consultas parametrizadas com permissões e RLS; jamais dar ao modelo conexão direta ao Supabase, chave `service_role`, SQL livre ou ferramenta de escrita no MVP.
- Calcular valores e agregações no Postgres/servidor; o modelo somente explica os resultados obtidos das ferramentas.
- Se não houver dados suficientes, dizer isso explicitamente. Indicar período, espaço e moeda na resposta; distinguir fato numérico de sugestão.
- Limitar ferramentas por rodada (por exemplo, até 5 chamadas e 3 iterações), histórico enviado, tamanho dos resultados, custo por usuário e mensagens por minuto; tratar timeouts e falhas do provedor.
- Proteger contra prompt injection em descrições de transações e mensagens: textos vindos do banco são **dados**, nunca instruções autorizadas.
- Não mostrar raciocínio interno/chain of thought do modelo. É permitido mostrar um resumo simples do que foi consultado, como “Dados: despesas de outubro/2026”.
- Mensagens e tool outputs não devem conter chaves de API ou identificadores secretos.
- Avisar antes do primeiro uso que os dados necessários à consulta serão enviados a um provedor externo de IA; solicitar consentimento explícito e registrar aceite. Enviar apenas os dados mínimos necessários e não registrar detalhes financeiros sensíveis em logs.
- O assistente é informativo: não promete retorno financeiro nem executa transações financeiras.

**Integração:** usar endpoint OpenRouter `https://openrouter.ai/api/v1/chat/completions` ou SDK oficial compatível, com modelo configurável por `OPENROUTER_MODEL`, padrão **`openai/gpt-6-luna`**, em chamadas exclusivamente server-side. Priorizar streaming se suportado sem comprometer ferramentas nem persistência.

**Aceite:** ao perguntar “Quanto gastei com alimentação em outubro?”, a resposta equivale exatamente ao agregado do banco, sem exibir registros de outro espaço. Uma pergunta sobre dados inexistentes não deve produzir números falsos.

## 6. Dados e relações

Proposta de tabelas (nomes podem ser refinados preservando semântica):

| Tabela | Campos/relações principais |
| --- | --- |
| `profiles` | `id` = `auth.users.id`, `full_name`, `created_at` |
| `spaces` | `id`, `name`, `type` (`personal/couple/family`), `created_by`, `created_at` |
| `space_members` | `space_id`, `user_id`, `role` (`owner/member`), `joined_at`; PK composta |
| `space_invitations` | `id`, `space_id`, `email`, `token_hash`, `invited_by`, `expires_at`, `accepted_at`, `created_at` |
| `categories` | `id`, `space_id`, `name`, `type`, `color`, `icon`, `created_at` |
| `transactions` | `id`, `space_id`, `created_by`, `category_id`, `type`, `amount NUMERIC(14,2)`, `description`, `occurred_on DATE`, timestamps |
| `budgets` | `id`, `space_id`, `category_id`, `month DATE`, `limit_amount NUMERIC(14,2)`; unique por espaço+categoria+mês |
| `ai_conversations` | `id`, `space_id`, `user_id`, `title`, timestamps |
| `ai_messages` | `id`, `conversation_id`, `role`, `content`, `created_at` |
| `ai_consents` | `user_id`, `consented_at`, `policy_version` |

**Invariantes:**

- Implementar FKs, `CHECK`s, índices em `space_id`, `occurred_on`, `category_id`, `user_id` e constraints contra dados inválidos.
- Impossibilitar via banco associar transação/orçamento a categoria de outro espaço; usar FK composta, função validada ou trigger consistente.
- Ao criar espaço, adicionar criador como `owner` em uma operação transacional segura; um espaço pessoal só pode ter o proprietário.
- Ao excluir categorias com lançamentos, impedir exclusão ou exigir reclassificação antes.
- Não permitir exclusão do único `owner` de um espaço; deixar exclusão de espaço fora do MVP, se necessário.
- Criar migrations SQL versionadas em `supabase/migrations/`; não depender de alterações manuais irreproduzíveis feitas no Dashboard.

### Segurança por RLS

- Ativar RLS em todas as tabelas expostas e conceder somente privilégios necessários.
- `profiles`: usuário acessa/altera apenas o próprio perfil.
- `spaces` e `space_members`: leitura somente por membros; alterações privilegiadas somente ao dono; entrada por convite via fluxo seguro.
- `transactions` e `categories`: leitura/criação somente por integrantes do respectivo espaço; edição/exclusão de transações apenas pelo autor ou dono do espaço.
- `budgets`: leitura por integrantes; escrita apenas pelo dono.
- `ai_conversations`/`ai_messages`: acesso somente pelo dono da conversa, mesmo se o espaço for compartilhado.
- Testar casos autorizados e negados com **dois usuários e dois espaços distintos**; verificar que não há recursão acidental nas policies.
- Nunca usar `service_role` na aplicação cliente. Se for indispensável em rotina isolada de servidor, justificar e aplicar autorização explícita antes de qualquer operação; preferir evitar no MVP.

## 7. Navegação e UX

Rotas sugeridas:

- `/login`, `/cadastro`, `/recuperar-senha`
- `/dashboard`
- `/transacoes`
- `/orcamentos`
- `/espacos`
- `/assistente`
- `/configuracoes`

Layout: menu lateral no desktop, navegação compacta no mobile; seletor de espaço sempre visível; botão destacado “Nova transação”; moeda BRL; temas claro/escuro opcionais. Estética moderna de fintech, com boa hierarquia tipográfica, cartões e gráficos legíveis. Usar telas de vazio, skeleton/loading, confirmação de ações e mensagens de erros úteis. A experiência central deve funcionar em 375 px de largura sem rolagem horizontal.

**Acessibilidade:** labels, navegação por teclado, contraste adequado, estados de foco e feedback não dependente exclusivamente de cores.

## 8. Arquitetura / fluxo de dados

```text
Browser (Next.js / React)
   |-- autenticação e sessão --> Supabase Auth
   |-- consultas autorizadas --> Supabase Postgres + RLS
   |-- /api/ai/chat ----------> Next.js Route Handler na Vercel
                                  |-- valida sessão e espaço
                                  |-- tools somente leitura --> Supabase Postgres
                                  |-- mensagens + tools ------> OpenRouter
                                  |                           modelo openai/gpt-6-luna
                                  |-- resposta ----------------> browser
```

A consulta de informações financeiras parte sempre de um espaço identificado e validado no backend. O modelo decide que ferramenta solicitar, mas o **servidor** controla a execução, os limites e a autorização. A mesma função de agregação deve sustentar os indicadores do dashboard e os resultados apresentados ao agente, reduzindo divergências numéricas.

## 9. Variáveis de ambiente

Produzir `.env.example` sem valores secretos:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-6-luna
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Configurar variáveis distintas para desenvolvimento e produção na Vercel. `OPENROUTER_API_KEY` só pode ser usada no servidor. Configurar no Supabase os URLs de site e redirecionamento de autenticação para `localhost` e domínio de produção. O README deve explicar como aplicar migrations e obter as credenciais sem publicá-las.

## 10. Deploy e entrega

1. Criar o projeto Next.js e configurar dependências.
2. Configurar projeto Supabase, Auth, migrations, grants, RLS e índices.
3. Implementar autenticação e espaços antes da lógica financeira.
4. Implementar CRUD, dashboard, categorias e orçamentos com dados reais.
5. Integrar o agente com OpenRouter, ferramentas de leitura e persistência do chat.
6. Criar testes unitários, testes de autorização/RLS e testes básicos de ponta a ponta.
7. Rodar `lint`, `typecheck`, `test` e `build`; corrigir problemas.
8. Publicar na Vercel, configurar variáveis de produção e URLs de Auth; testar cadastro, lançamento e pergunta ao agente **no domínio implantado**.
9. Entregar URL de produção e README atualizado. Se as contas/credenciais não estiverem acessíveis, **não fingir deploy**: entregar o aplicativo pronto, os comandos e os bloqueios concretos.

## 11. Critérios de aceite / demonstração

**Cenário A — individual**

- Criar usuário A, entrar, cadastrar receita de R$ 8.000 e duas despesas (alimentação R$ 1.200 e moradia R$ 2.000) no mesmo mês.
- Dashboard deve mostrar receita R$ 8.000, despesa R$ 3.200 e resultado R$ 4.800.
- Perguntar à IA “Quanto gastei em alimentação neste mês?”; obter **R$ 1.200**, com período correto.

**Cenário B — casal/família**

- Usuário A cria espaço “Nossa Casa” e convida B.
- B aceita convite com conta autenticada; ambos enxergam transações compartilhadas.
- B não vê, via UI ou API, transações do espaço pessoal de A.
- Chat de B consulta somente dados do espaço “Nossa Casa” quando este estiver selecionado.

**Cenário C — orçamento**

- Orçamento de alimentação de R$ 1.000; lançar despesas de R$ 1.200.
- UI exibe 120% do limite, R$ 200 excedentes; chat relata os mesmos valores.

**Cenário D — robustez**

- Recarregar app sem perder dados; acessar URL sem login redireciona; usuário não consegue forçar `space_id` de terceiro; erro de OpenRouter exibe mensagem recuperável sem comprometer dados.
- Deploy Vercel executa os mesmos cenários básicos em produção.

**Definição de pronto:** P0 implementado; sem dados fictícios passando por dados de usuário; migrations executáveis; testes relevantes aprovados; `next build` bem-sucedido; aplicação implantada e validada quando credenciais/contas estão disponíveis; limitações remanescentes documentadas.

## 12. Instruções para os agentes de código (Claude Code e Codex)

- Receba este PRD como **fonte única de requisitos**; use o mesmo repositório-base e as mesmas credenciais de serviços nos dois ambientes isolados.
- Planeje rapidamente e implemente sem pedir aprovação a cada decisão. Tome decisões pequenas de biblioteca/estrutura, documentando as principais no README.
- Priorize correção, segurança e fluxo fim a fim antes de efeitos visuais, refatorações cosméticas e funcionalidades P1.
- Não substituir APIs reais por respostas hardcoded ou mocks permanentes para simular funcionalidades concluídas.
- Não ignorar erros de build, testes ou segurança para aparentar entrega.
- Execute testes e reporte claramente o que funcionou e o que ainda não funciona.
- Ao finalizar, forneça: URL de produção (se publicada), URL/identificador do projeto Supabase **não secreto** (se relevante), comandos de execução, evidências de testes, funcionalidades concluídas, limitações e decisões arquiteturais.

## 13. Referências técnicas

- Supabase + Next.js: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- Supabase Auth SSR: https://supabase.com/docs/guides/auth/quickstarts/nextjs
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- OpenRouter GPT-6 Luna: https://openrouter.ai/openai/gpt-6-luna
- OpenRouter API: https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request
- OpenRouter tool calling: https://openrouter.ai/blog/tutorials/build-tool-calling-agent-loop/
- Vercel deployment environments: https://vercel.com/docs/deployments/environments
- Vercel Functions: https://vercel.com/docs/functions
