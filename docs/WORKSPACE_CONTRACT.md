# Contrato da aplicação

As páginas autenticadas usam sessão SSR por cookies e o schema `codex`. Server Actions validam entradas com Zod, verificam usuário/espaço e deixam RLS repetir a autorização. Nenhuma ação usa service_role.

Operações: cadastro, login, recuperação/alteração de senha, logout, onboarding; selecionar/criar espaço; criar/aceitar/revogar convite e remover integrante; criar categoria; criar/editar/excluir transação; definir/excluir orçamento. Exclusões exigem confirmação na UI. IDs e papéis vindos do formulário não concedem autorização.

Dashboard e IA compartilharão `financial_report(p_space_id,p_start,p_end)` e `budget_report(p_space_id,p_month)`, que retornam valores monetários como strings decimais. Relatórios sempre validam participação no espaço; filtros são datas de calendário. Listagens são limitadas/paginadas. O chat será implementado em etapa própria, com consentimento e ferramentas somente de leitura.

As Server Actions retornam mensagens de sucesso/erro em português sem detalhes internos. Leituras/alterações negadas por RLS não são tratadas como sucesso. Redirects de autenticação aceitam somente caminhos internos. Conteúdo privado não recebe cache compartilhado.
