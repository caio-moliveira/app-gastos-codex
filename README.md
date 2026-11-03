# Nosso Bolso

Aplicação de finanças pessoais, para casal e família, especificada em [PRD.md](PRD.md).

## Estado atual

Fundação Next.js, TypeScript, Tailwind CSS, testes e CI configurados. Banco com as dez tabelas do domínio no schema `codex`, constraints e RLS. A página inicial é provisória: autenticação SSR, interface de dados, dashboard e assistente ainda não estão implementados. Não há dados financeiros fictícios apresentados como reais.

## Desenvolvimento

Requer Node.js 22 ou superior (CI: Node.js 24) e npm.

```sh
npm ci
npm run dev
```

Abra `http://localhost:3000`. No PowerShell com restrição a scripts, use `npm.cmd` e `npx.cmd`.

Variáveis previstas no PRD: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ou a chave anônima legada), `NEXT_PUBLIC_APP_URL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` e `OPENROUTER_BASE_URL`. As integrações serão configuradas nas próximas etapas. Nunca publique `.env`, credenciais privilegiadas ou valores financeiros privados em logs.

## Estrutura

- `src/app/`: App Router, layout e estilos.
- `src/lib/`: funções compartilhadas; dinheiro em centavos inteiros (`bigint`) e datas de calendário.
- `tests/e2e/`: fluxos de navegador desktop e mobile (375 px).
- `.github/workflows/ci.yml`: validação de PRs e `main`.
- `supabase/migrations/`: migrations SQL; todas as tabelas da aplicação estão no schema `codex`, conforme instrução do usuário.
- `supabase/tests/`: testes SQL de grants, regras e isolamento, com fixtures revertidas.
- `scripts/sql.mjs`: executor administrativo de SQL; nunca usado pelo servidor da aplicação.

## Verificação

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm test` executa Vitest, incluindo aritmética exata, cenários financeiros A/C do PRD em funções puras, limites de orçamento e datas inválidas/bissextas. Esses testes ainda não comprovam integração com banco ou IA.

Os testes Playwright usam o build de produção (`npm run build` primeiro), iniciam o servidor automaticamente e geram capturas em `test-results/`. O relatório fica em `playwright-report/`. Para testar um servidor externo, defina `PLAYWRIGHT_BASE_URL`.

## Contribuição e entrega

Siga [AGENTS.md](AGENTS.md), [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md) e o [plano de implementação](IMPLEMENTATION_PLAN.md). Cada etapa exige branch, PR, revisão documentada e checks aplicáveis aprovados. Configuração de Auth da aplicação, deploy Vercel e comprovação dos cenários completos permanecem pendentes.

Para aplicar migrations e testar o banco local ou hospedado, consulte [supabase/README.md](supabase/README.md). O [contrato de dados](docs/DATA_CONTRACT.md) descreve permissões, RPCs e erros. As migrations iniciais já foram aplicadas no ambiente hospedado configurado para esta execução; o deploy da aplicação e os cenários completos permanecem pendentes.
