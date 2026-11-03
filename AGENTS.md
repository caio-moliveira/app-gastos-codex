# Repository Guidelines

## Project Structure & Module Organization

This repository currently contains `PRD.md`, a minimal `README.md`, and environment configuration; application code has not been scaffolded. Treat `PRD.md` as the source of product requirements for **Nosso Bolso**, a personal and shared finance application.

When implementing, organize Next.js App Router routes in `src/app/`, reusable UI in `src/components/`, shared financial and authorization logic in `src/lib/`, static assets in `public/`, and versioned SQL in `supabase/migrations/`. Keep end-to-end tests in `tests/e2e/`. Document the actual layout in `README.md` as it develops.

## Build, Test, and Development Commands

No package manifest or executable project scripts exist yet. During scaffolding, define and document these npm scripts:

- `npm run dev`: start the local Next.js server.
- `npm run lint`: check source with the configured linter.
- `npm run typecheck`: run TypeScript checks without emitting files.
- `npm test`: run unit tests with Vitest.
- `npm run test:e2e`: run Playwright browser tests.
- `npm run build`: produce and validate the production build.

Run lint, type checks, relevant tests, and a production build before submitting implementation changes.

## Coding Style & Naming Conventions

Use TypeScript, two-space indentation, PascalCase React components, camelCase functions and variables, and snake_case database identifiers. Configure ESLint when scaffolding and follow its rules consistently. Keep validation typed and server logic in Route Handlers or Server Actions. Present UI text in Brazilian Portuguese, currency in BRL, and dates as `dd/mm/yyyy`.

## Testing Guidelines

The PRD specifies Vitest and Playwright, or equivalents; neither is configured yet. Name unit tests `*.test.ts` and browser tests `*.spec.ts`. Cover exact monetary calculations, budget thresholds, persistence, authentication, and RLS isolation using two users and distinct spaces. No numeric coverage threshold is currently defined.

## Commit & Pull Request Guidelines

Existing commits (`first commit`, `pega ai`) establish no consistent convention. Use concise, imperative messages describing one logical change. PRs should explain behavior, reference relevant PRD requirements or issues, report checks run and remaining limitations, and include screenshots for UI changes. Describe migrations and configuration changes explicitly.

## Security & Configuration

Keep secrets out of commits; maintain `.env.example` with placeholders. Keep OpenRouter credentials server-side. Enforce space membership and RLS for financial access. Use exact decimal arithmetic and calendar dates. Prioritize P0 requirements before P1 features.
