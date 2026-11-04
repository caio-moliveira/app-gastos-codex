import { db, identity } from "@/lib/supabase";
import { ActionForm } from "@/components/forms";
import { Chat } from "@/components/chat";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
export async function AssistantPage({
  space,
  conversation,
}: {
  space: { id: string; name: string };
  conversation?: string;
}) {
  const { user } = await identity();
  const client = await db();
  const consent = await client
    .from("ai_consents")
    .select("policy_version")
    .eq("user_id", user.id)
    .maybeSingle();
  if (consent.error)
    throw new Error("Não foi possível verificar sua autorização.");
  if (consent.data?.policy_version !== "2026-11-03")
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            Uma conversa com seus dados, com sua autorização
          </CardTitle>
          <CardDescription>
            Antes de começar, saiba como o assistente funciona.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="muted">
            Para responder, os dados financeiros necessários do espaço
            selecionado e suas mensagens serão enviados ao provedor externo
            OpenRouter e ao modelo GPT-6 Luna. Enviamos apenas o necessário, por
            consultas autorizadas. Seu histórico é privado e o assistente não
            executa operações financeiras.
          </p>
          <ActionForm op="consent" submit="Autorizar e continuar">
            <label className="consent-choice">
              <input type="checkbox" name="agree" value="yes" required />
              Autorizo o envio dos dados necessários ao provedor externo de IA
              para responder às minhas perguntas.
            </label>
          </ActionForm>
        </CardContent>
      </Card>
    );
  const list = await client
    .from("ai_conversations")
    .select("id,title")
    .eq("space_id", space.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  if (list.error) throw new Error("Não foi possível carregar as conversas.");
  let messages: { role: string; content: string }[] = [];
  if (conversation) {
    const own = await client
      .from("ai_conversations")
      .select("id")
      .eq("id", conversation)
      .eq("user_id", user.id)
      .eq("space_id", space.id)
      .maybeSingle();
    if (!own.data || own.error)
      throw new Error("Conversa não disponível neste espaço.");
    const result = await client
      .from("ai_messages")
      .select("role,content")
      .eq("conversation_id", conversation)
      .order("created_at", { ascending: false })
      .limit(60);
    if (result.error)
      throw new Error("Não foi possível carregar as mensagens.");
    messages = (result.data || []).reverse();
  }
  return (
    <Chat
      key={`${space.id}:${conversation || "new"}`}
      spaceId={space.id}
      spaceName={space.name}
      conversationId={conversation}
      initial={messages}
      conversations={list.data || []}
    />
  );
}
