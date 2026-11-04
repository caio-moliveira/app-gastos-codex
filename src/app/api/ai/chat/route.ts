import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { runAgent } from "@/lib/agent";

export const maxDuration = 60;
export async function POST(request: NextRequest) {
  try {
    if (
      request.headers.get("origin") &&
      request.headers.get("origin") !== new URL(request.url).origin
    )
      return NextResponse.json(
        { error: "Origem não autorizada." },
        { status: 403 },
      );
    const text = await request.text();
    if (text.length > 6000)
      return NextResponse.json(
        { error: "Mensagem muito extensa." },
        { status: 413 },
      );
    const input = z
      .object({
        space_id: z.uuid(),
        conversation_id: z.uuid().optional(),
        message: z.string().trim().min(1).max(2000),
      })
      .strict()
      .parse(JSON.parse(text));
    const client = await db();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user)
      return NextResponse.json(
        { error: "Entre na sua conta." },
        { status: 401 },
      );
    const space = await client
      .from("spaces")
      .select("id,name")
      .eq("id", input.space_id)
      .maybeSingle();
    if (space.error || !space.data)
      return NextResponse.json(
        { error: "Espaço não autorizado." },
        { status: 403 },
      );
    const reserve = await client.rpc("reserve_ai_request", {
      p_space_id: input.space_id,
    });
    if (reserve.error)
      return NextResponse.json(
        {
          error:
            reserve.error.code === "P0001"
              ? "Limite atingido: até 6 mensagens por minuto e 30 por dia. Tente mais tarde."
              : "Autorize o envio de dados para usar o assistente.",
        },
        { status: reserve.error.code === "P0001" ? 429 : 403 },
      );
    let id = input.conversation_id;
    if (id) {
      const conversation = await client
        .from("ai_conversations")
        .select("id")
        .eq("id", id)
        .eq("space_id", input.space_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!conversation.data || conversation.error)
        return NextResponse.json(
          { error: "Conversa não encontrada." },
          { status: 404 },
        );
    } else {
      const created = await client
        .from("ai_conversations")
        .insert({
          space_id: input.space_id,
          title: input.message.slice(0, 100),
        })
        .select("id")
        .single();
      if (created.error) throw new Error("Não foi possível criar a conversa.");
      id = created.data.id;
    }
    const history = await client
      .from("ai_messages")
      .select("role,content")
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(8);
    if (history.error) throw new Error("Não foi possível carregar a conversa.");
    const inserted = await client
      .from("ai_messages")
      .insert({ conversation_id: id, role: "user", content: input.message });
    if (inserted.error) throw new Error("Não foi possível salvar a mensagem.");
    const answer = await runAgent(
      client,
      space.data,
      (history.data || []).reverse(),
      input.message,
    );
    const saved = await client
      .from("ai_messages")
      .insert({ conversation_id: id, role: "assistant", content: answer });
    if (saved.error)
      throw new Error("Não foi possível salvar a resposta. Tente novamente.");
    return NextResponse.json(
      { conversation_id: id, answer },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError || error instanceof SyntaxError
            ? "Mensagem ou argumentos inválidos."
            : error instanceof Error
              ? error.message
              : "Assistente indisponível.",
      },
      {
        status:
          error instanceof z.ZodError || error instanceof SyntaxError
            ? 400
            : 503,
      },
    );
  }
}
