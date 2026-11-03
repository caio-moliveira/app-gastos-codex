# Fluxo de desenvolvimento e entrega

## Autoridade e escopo

`PRD.md` define os requisitos do Nosso Bolso. `AGENTS.md` orienta a organização do código. Este documento define o processo obrigatório de implementação, revisão, integração e conclusão. O usuário autorizou o agente a criar este fluxo, implementar, revisar, integrar PRs e publicar a aplicação.

Concluir todos os requisitos P0 e os cenários de aceite antes de ampliar funcionalidades P1. Não declarar requisitos concluídos sem evidência atual. Recursos explicitamente fora do MVP permanecem fora do escopo.

## Plano e rastreabilidade

Manter `IMPLEMENTATION_PLAN.md` com etapas, dependências, skills aplicáveis e matriz de requisitos. Atualizar o progresso com referências a testes, commits, PRs e deploys. Separar resultados locais, simulados e reais. Registrar bloqueios concretos sem expor credenciais.

## Branches e commits

1. Usar `main` como branch de integração. Não implementar diretamente nela.
2. Criar branches curtas por etapa coerente: `docs/<assunto>`, `feat/<assunto>`, `fix/<assunto>` ou `test/<assunto>`.
3. Partir de `main` atualizada após cada integração. Evitar misturar trabalho de etapas independentes no mesmo PR.
4. Preservar alterações preexistentes do usuário. Adicionar arquivos explicitamente ao staging; nunca incluir `.env`, tokens ou artefatos gerados.
5. Usar commits pequenos com mensagem imperativa, por exemplo `feat: add authenticated space selection`.

## Pull Requests

Publicar a branch e abrir PR para `main`. Cada PR deve informar:

- problema resolvido e comportamento resultante;
- requisitos do PRD atendidos e itens ainda pendentes;
- mudanças de dados, ambiente ou configuração;
- comandos executados e resultados, com limites da verificação;
- capturas de tela quando houver mudanças visíveis na interface.

PRs podem ser abertos como draft durante a implementação. Não marcar como pronto para integração com falhas conhecidas que afetem seu escopo.

## Revisão e aprovação

Antes de integrar, revisar o diff final para correção, segurança, isolamento por espaço, tratamento de erros, acessibilidade e cobertura relevante. Corrigir achados e repetir os checks afetados. Documentar a revisão e a decisão de aprovação no PR.

O agente pode realizar a revisão e aprovar tecnicamente o trabalho, conforme autorização do usuário. Se o GitHub impedir uma review formal `APPROVE` do próprio autor, registrar a revisão como comentário explícito, sem alegar aprovação formal de outro revisor. Não contornar proteções do repositório nem usar bypass administrativo. Se uma regra exigir outro aprovador, reportar esse bloqueio.

## Gates de testes e integração

- Documentação: verificar diff, links/caminhos e coerência com os arquivos atuais; não exigir build de uma aplicação inexistente.
- Fundação: configurar e executar `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, com testes significativos do código introduzido e CI equivalente.
- Dados/autorização: executar migrations em ambiente de teste e testes de RLS com dois usuários e espaços distintos, incluindo acessos permitidos e negados. Testar constraints e invariantes alteradas.
- Funcionalidades: executar os quatro checks de base e testes E2E dos fluxos implementados. Não usar mocks como evidência de integração real.
- Interface: verificar desktop e largura de 375 px, teclado, foco, labels, estados vazios, carregamento e erros; anexar evidência visual ao PR.
- Integrações externas: verificar contratos, limites, autorização e falhas recuperáveis; executar testes reais quando houver credenciais válidas e distinguir testes simulados.

O gate se aplica ao escopo introduzido: uma fundação ainda sem login não precisa comprovar os fluxos financeiros, mas deve registrar essa pendência. Na entrega final, todos os gates aplicáveis ao produto completo são obrigatórios.

Verificar checks remotos do commit atual. Integrar por squash somente após revisão documentada e checks aplicáveis aprovados. Não desativar testes, omitir falhas ou remover proteções para obter um merge. Após integrar, atualizar a `main` local e começar a próxima etapa.

## Deploy e critérios de conclusão

Usar migrations SQL versionadas, Supabase real com RLS, Auth SSR e OpenRouter no servidor. Publicar na Vercel, configurar variáveis e URLs de Auth e executar os cenários A–D no domínio implantado. Evitar dados financeiros sensíveis em logs e evidências.

Antes de declarar conclusão, auditar cada P0, RF, invariante, requisito de segurança, UX e cenário de aceite contra evidências atuais. Exigir lint, typecheck, testes unitários, testes de RLS, E2E e build aprovados, PRs integrados e documentação de execução/migração/deploy atualizada.

Entregar URL de produção, identificador Supabase não secreto quando pertinente, comandos, evidências, decisões e limitações. Se houver dependência externa indisponível, registrar o bloqueio e continuar o trabalho independente possível. Não declarar 100% enquanto qualquer obrigação estiver incompleta ou sem comprovação.
