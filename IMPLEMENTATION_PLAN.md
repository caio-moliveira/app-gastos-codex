# Plano de implementação — Nosso Bolso

## Estado inicial e dependência obrigatória

- Repositório inicial: `main`, sem aplicação, package manifest ou testes.
- Requisitos: `PRD.md` v1.0, de 02/11/2026; orientações locais: `AGENTS.md`.
- `AGENT_WORKFLOW.md` foi criado após autorização explícita do usuário em 03/11/2026. Ele define branches por etapa, PRs, revisão documentada, gates de validação e integração por squash.
- Preservar alterações preexistentes em `.env.example`, `.agents/`, `.claude/`, `AGENTS.md` e `skills-lock.json`. Nunca incluir `.env` em commits.
- Workflow integrado pelo PR #1 (`c223316`). Fundação integrada pelo PR #2 (`ee2b79e`), com CI aprovada. Schema `codex` integrado pelo PR #3 (`ed6151a`). Etapa de dados/RLS em desenvolvimento na branch `feat/domain-data-security`.
- Decisão obrigatória do usuário: todas as tabelas da aplicação devem ficar no schema `codex`. Consultas, rotinas e políticas usarão o mesmo schema; `auth` permanece gerenciado pelo Supabase.
- Migration `202611030001_codex_schema.sql` aplicada no banco real em 03/11/2026: schema criado, grants mínimos e privilégios padrão restritivos. `supabase/tests/schema.sql` passou e reverteu a tabela de teste; inspeção final confirmou `codex` existente e sem tabelas de domínio. Isso ainda não comprova RLS por usuário/espaço nem exposição na Data API.
- Migration `202611030002_domain.sql` aplicada em seguida no banco real: dez tabelas em `codex`, todas com RLS, constraints compostas e permissões por coluna. Suíte SQL de duas identidades, espaços privados/compartilhados, convites, orçamento, privacidade e ações owner/member passou no banco hospedado e no Supabase local iniciado do zero. Fixtures revertidas. Lint de rotinas local sem erros. Integração HTTP, interface e autenticação SSR continuam pendentes.

### Revalidação do ambiente — 03/11/2026

- GitHub confirmou acesso `ADMIN` ao repositório `caio-moliveira/app-gastos-codex`; a única branch remota disponível é `main`.
- Nova busca local e consulta autenticada ao GitHub confirmaram que o caminho `AGENT_WORKFLOW.md` continua ausente (HTTP 404). Não há outra branch disponível na qual procurá-lo.
- Node.js, npm (`npm.cmd` no PowerShell), Git, GitHub CLI, Docker, psql e um executável Postman estão presentes. A presença não comprova funcionamento dos serviços ou compatibilidade de versões.
- A inspeção apenas dos nomes e da presença dos valores em `.env` identificou configuração para OpenRouter, URL/chave anônima Supabase, URL do app, conexão de banco e chave privilegiada Supabase. Nenhum valor secreto foi exibido. Validade, conectividade e permissões desses valores ainda não foram testadas.
- Vercel CLI e Supabase CLI não foram encontrados no PATH. Isso ainda não é um bloqueio: podem ser instalados ou executados via npm quando a implementação for iniciada.
- O usuário autorizou criar o workflow. O bloqueio inicial foi resolvido; seguir `AGENT_WORKFLOW.md` a partir da branch `docs/agent-workflow`.

## Skills selecionadas

- `postman:api-engineer`: estabelecer contratos antes de implementar APIs e verificar comportamento e integrações. Já lida.
- `vercel-react-best-practices`: implementação e revisão de React/Next.js. Já lida.
- `shadcn`: componentes acessíveis e composição da interface; ler ao iniciar a UI.
- `postman:api-discovery`: conferir contratos de Supabase e OpenRouter antes das integrações.
- `postman:api-simulation` e `postman:api-testing`: validar integrações, falhas de upstream e limites, distinguindo evidências simuladas de reais.
- `deploy-to-vercel` e `vercel-cli-with-tokens`: preparar e executar deploy conforme as credenciais disponíveis; ler antes dessa etapa.
- `web-design-guidelines`: revisão de interface, responsividade e acessibilidade antes da entrega.

## Etapas e dependências

1. **Fluxo e inventário:** obter o workflow obrigatório; conferir GitHub, credenciais disponíveis sem revelar valores, ferramentas locais e acessos a Supabase/Vercel/OpenRouter. Aplicar o workflow em todas as etapas seguintes.
2. **Fundação:** Next.js App Router, TypeScript, Tailwind, componentes acessíveis, ESLint, Vitest, Playwright, scripts de desenvolvimento/validação e CI. Fixar dependências compatíveis, documentar setup e variáveis.
3. **Dados e isolamento:** migrations SQL, constraints, índices, grants, RLS e funções autorizadas. Criar espaço pessoal e categorias padrão atomicamente. Validar isolamento diretamente no banco.
4. **Identidade e espaços:** sessão SSR por cookies, cadastro/login/logout, confirmação quando habilitada, recuperação de senha, onboarding, alternância de espaços, integrantes e convites seguros.
5. **Finanças:** categorias e transações com filtros, paginação, edição e confirmação de exclusão. Dinheiro exato e datas de calendário. Dashboard e orçamentos usam as mesmas agregações autorizadas que a IA.
6. **Assistente:** contrato de chat, consentimento persistido, conversas privadas e tools de leitura autorizadas por sessão/espaço. OpenRouter com modelo configurável, limites de consumo, histórico e resultados, timeouts e erros recuperáveis.
7. **Qualidade e entrega:** revisar requisitos e mudanças, corrigir achados, executar todos os gates do workflow, integrar os PRs, aplicar migrations, configurar Auth e ambiente na Vercel, publicar e testar no domínio real.

Cada etapa deve produzir alterações revisáveis e evidências em branch própria, com PR para `main`, revisão documentada, checks aplicáveis aprovados e merge por squash, conforme `AGENT_WORKFLOW.md`. Etapas independentes podem ficar em revisão simultaneamente; atualizar a base antes da integração quando necessário. A autorização do usuário inclui conduzir revisão e aprovação; documentar limitações reais do GitHub sobre autoaprovação sem simular aprovações de terceiros.

## Matriz de comprovação

### Aplicação financeira

Branch `feat/financial-workspace`: sessão SSR e proxy, cadastro/confirmação, login/logout e recuperação de senha, onboarding, seleção/criação de espaços, convites e integrantes, CRUD de transações com filtros/paginação, categorias próprias, dashboard e orçamento conectados ao schema `codex`. Migration 003 de relatórios aplicada no Supabase hospedado e local. A preferência de visualização é persistida.

Validação local: 31 testes unitários, lint/tipos/build e testes SQL aprovados; seis E2E aprovados em desktop/mobile, incluindo confirmação/recuperação pelo Mailpit, cálculos A/C, reload/novo login, edição/exclusão e compartilhamento com duas contas. Tentativa de ação HTTP com espaço pessoal de outro usuário foi negada. Capturas do dashboard inspecionadas. Assistente e deploy continuam pendentes.

### Evidências da fundação

- Next.js 16.4.5, React 19.3.1, TypeScript e Tailwind 4.3.4, com versões resolvidas em `package-lock.json`.
- Validação local em 03/11/2026: lint sem warnings, typecheck, 18 testes Vitest e build de produção aprovados; dois testes Playwright aprovados (desktop e 375 px), incluindo teclado, idioma e ausência de overflow horizontal.
- Capturas de tela desktop/mobile geradas em `test-results/` e inspecionadas visualmente. CI configurada para disponibilizar relatório e imagens como artefatos.
- `npm audit --omit=dev` retornou zero vulnerabilidades. A auditoria completa apontou 16 registros moderados na cadeia de ferramentas ESLint, originados em minimatch <11.0.1; a correção automática sugerida faz downgrade incompatível. Pendência de dependências de desenvolvimento, sem tratá-la como resolvida ou aplicar downgrade cego.
- Os testes de funções puras não comprovam os cenários A/C completos: banco, UI financeira e IA ainda não existem.

| Requisito | Evidência necessária |
| --- | --- |
| RF-01 / P0 1–2 | Cadastro, sessão após reload e novo login, logout, recuperação, perfil e espaço pessoal persistidos; onboarding completo. |
| RF-02 / P0 3 | Criar casal/família, alternar espaço, listar papéis; convite aleatório com hash, expiração, uso único, e-mail autenticado e prevenção de duplicidade. |
| RF-03 / P0 4–5 | CRUD, filtros de data/tipo/categoria/texto, paginação, categoria compatível e do mesmo espaço, autor autenticado, totais consistentes após reload. |
| RF-04 / P0 6 | Período e espaço explícitos; receitas, despesas, resultado, taxa ou N/D, distribuição, evolução mensal, recentes e estados vazios. |
| RF-05 / P0 7 | Unicidade mensal, limites alteráveis somente pelo owner, aviso em 80%, excedente acima de 100%, realizado/restante e percentual corretos. |
| RF-06 / P0 8 | Oito perguntas do PRD verificadas com dados reais; cinco tipos de tools, agregação compartilhada, consentimento, histórico privado, limites e tratamento de indisponibilidade. |
| P0 9 / UX | Português, BRL, datas brasileiras, teclado, labels, foco, contraste e estados de erro/loading; fluxo principal a 375 px sem overflow horizontal. |
| P0 10 / invariantes | RLS em todas as tabelas expostas; duas contas e espaços distintos; casos autorizados e negados via UI, API e banco; sem recursão de policies, relações entre espaços ou remoção do último owner. |
| P0 11 | URL Vercel real, credenciais somente no servidor, URLs Auth corretas e smoke tests no domínio implantado com Supabase real. |
| P0 12 | Migrations reproduzíveis, testes relevantes, `.env.example` sem segredos, README com execução, migração e deploy. |
| Cenário A | Receita 8.000, despesas 1.200 + 2.000, resultado 4.800; IA informa alimentação 1.200 com período correto. |
| Cenário B | A e B compartilham Nossa Casa; B não acessa espaço pessoal de A nem por requisição manipulada; chat permanece no espaço selecionado. |
| Cenário C | Limite 1.000 e gasto 1.200: UI e IA apresentam 120% e excedente de 200. |
| Cenário D | Persistência, redirecionamento sem sessão, tentativa de forçar space_id negada e falha OpenRouter recuperável, inclusive no deploy. |
| Workflow | Branches, PRs, revisões, testes e integração comprovados conforme o arquivo obrigatório, quando disponível. |

## Critérios de conclusão

Executar `lint`, `typecheck`, testes unitários, testes de autorização/RLS, testes E2E e `build`, além dos gates adicionais do workflow. Registrar comandos, resultados, revisão e referências de PR/commit. Testes simulados não comprovam integração real ou deploy.

Antes de concluir, auditar cada requisito e cenário contra evidências atuais. Entregar URL de produção, identificador Supabase não secreto quando relevante, README, decisões arquiteturais e limitações concretas. Não declarar 100% com qualquer obrigação pendente ou sem comprovação.

P1 é desejável e condicionado à conclusão de todos os P0. Reavaliar exportação CSV, recorrência/parcelamento, contas/cartões, metas/alertas e relatórios após esse gate, preservando a exclusão explícita de conexão bancária automática e demais itens fora do MVP.
