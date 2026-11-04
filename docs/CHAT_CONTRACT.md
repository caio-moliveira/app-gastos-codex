# Assistente: contrato e limites

`POST /api/ai/chat` recebe `{space_id, conversation_id?, message}`. Exige sessão válida, origem da aplicação, participação no espaço e consentimento `2026-11-03`. Retorna `{conversation_id, answer}`; erros são JSON com mensagem recuperável, sem detalhes do provedor. Histórico vem do banco, nunca do cliente.

Cada rodada usa OpenRouter `chat/completions`, modelo configurável (padrão `openai/gpt-6-luna`), ferramentas de leitura e identidade capturada no servidor. As cinco ferramentas são summary, despesas por categoria, transações limitadas, orçamento e comparação de períodos. O modelo não escolhe usuário/espaço e não recebe SQL nem banco inteiro.

Limites por usuário: 6 mensagens/minuto e 30/dia UTC, registrados atomicamente no banco. Por mensagem: até 3 chamadas ao modelo, 5 tools, 1.000 tokens de saída por chamada, 2.000 caracteres de pergunta, 8 mensagens anteriores truncadas, resultados limitados e timeout de 15 segundos por chamada. Esses limites controlam o consumo por usuário; não dependem de memória de uma instância Vercel.

A primeira inferência exige ferramenta. Agregações vêm das mesmas RPCs do dashboard. Texto de descrição e histórico são dados não confiáveis; não alteram instruções ou autorizações. Sem raciocínio interno na resposta. Persistir a resposta completa antes de entregá-la evita histórico incompleto em interrupções; streaming será reservado a uma evolução que preserve essa garantia.

Testes simulados cobrem falha de upstream; testes com modelo real são separados e usam apenas fixtures sintéticas consentidas. Nenhuma chave ou informação financeira privada é registrada em logs.
