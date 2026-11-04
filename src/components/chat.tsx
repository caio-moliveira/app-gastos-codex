"use client";
import { useState } from "react";
import Markdown from "react-markdown";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Message,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
  MessageScroller,
  MessageScrollerProvider,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "@/components/ui/message-scroller";
import { Sparkles } from "lucide-react";

export function Chat({
  spaceId,
  spaceName,
  conversationId,
  initial,
  conversations,
}: {
  spaceId: string;
  spaceName: string;
  conversationId?: string;
  initial: { role: string; content: string }[];
  conversations: { id: string; title: string }[];
}) {
  const [messages, setMessages] = useState(initial);
  const [id, setId] = useState(conversationId);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (pending || !question.trim()) return;
    setPending(true);
    setError("");
    const sent = question.trim();
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          space_id: spaceId,
          conversation_id: id,
          message: sent,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Não foi possível consultar.");
      setId(body.conversation_id);
      setMessages((m) => [
        ...m,
        { role: "user", content: sent },
        { role: "assistant", content: body.answer },
      ]);
      setQuestion("");
      window.history.replaceState(
        null,
        "",
        `/assistente?conversation=${body.conversation_id}`,
      );
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Falha de conexão. Tente novamente.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="chat-layout">
      <aside className="conversation-list">
        <Link
          href="/assistente"
          onClick={() => {
            setId(undefined);
            setMessages([]);
            setError("");
          }}
          className="text-link"
        >
          + Nova conversa
        </Link>
        <h2>Suas conversas</h2>
        {conversations.map((c) => (
          <Link href={`/assistente?conversation=${c.id}`} key={c.id}>
            {c.title}
          </Link>
        ))}
        <p>Histórico privado, mesmo em espaços compartilhados.</p>
      </aside>
      <section className="chat-panel">
        <div className="chat-context">
          <Sparkles aria-hidden="true" />
          <div>
            <strong>Clareza para seus próximos passos</strong>
            <p>Consultando somente: {spaceName} · BRL</p>
          </div>
        </div>
        <MessageScrollerProvider>
          <MessageScroller>
            <MessageScrollerViewport>
              <MessageScrollerContent>
                {!messages.length ? (
                  <div className="chat-empty">
                    <Sparkles aria-hidden="true" />
                    <h2>Vamos olhar para seus planos?</h2>
                    <p>
                      Pergunte sobre os seus gastos, o seu orçamento ou compare
                      períodos.
                    </p>
                    <div className="suggestions">
                      {[
                        "Quanto gastei no mês passado?",
                        "Qual foi minha maior categoria de despesas em outubro?",
                        "Estou acima do orçamento de alimentação?",
                      ].map((q) => (
                        <Button
                          variant="outline"
                          key={q}
                          onClick={() => setQuestion(q)}
                        >
                          {q}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {messages.map((m, index) => (
                  <MessageScrollerItem key={index}>
                    <Message align={m.role === "user" ? "end" : "start"}>
                      <MessageContent>
                        <MessageHeader>
                          {m.role === "user" ? "Você" : "Nosso Bolso"}
                        </MessageHeader>
                        <Bubble
                          variant={m.role === "user" ? "default" : "secondary"}
                        >
                          <BubbleContent className="whitespace-pre-wrap">
                            {m.role === "assistant" ? (
                              <Markdown
                                components={{
                                  a: ({ children }) => <span>{children}</span>,
                                }}
                              >
                                {m.content}
                              </Markdown>
                            ) : (
                              m.content
                            )}
                          </BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                ))}
                {pending ? (
                  <MessageScrollerItem>
                    <p className="muted" role="status">
                      Consultando os dados autorizados…
                    </p>
                  </MessageScrollerItem>
                ) : null}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton aria-label="Ir para a última mensagem" />
          </MessageScroller>
        </MessageScrollerProvider>
        {error ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <form onSubmit={send} className="chat-composer">
          <Field>
            <FieldLabel htmlFor="question">Sua pergunta</FieldLabel>
            <Input
              id="question"
              name="message"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Como estão meus gastos neste mês?"
              maxLength={2000}
              autoComplete="off"
              required
            />
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? "Consultando…" : "Enviar pergunta"}
          </Button>
        </form>
        <p className="privacy-note">
          Até 6 mensagens/minuto e 30/dia. Respostas informativas; confira os
          dados antes de decidir.
        </p>
      </section>
    </div>
  );
}
