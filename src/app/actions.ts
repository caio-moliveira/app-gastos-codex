"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { appUrl, authorizeSpace, db, identity } from "@/lib/supabase";
import {
  date,
  money,
  safeNext,
  transactionInput,
  uuid,
} from "@/lib/validation";

export type ActionState = {
  error?: string;
  success?: string;
  invitation?: string;
};

function checked(result: { error: { message: string; code?: string } | null }) {
  if (result.error) {
    const code = result.error.code;
    throw new Error(
      code === "23505"
        ? "Já existe um registro com esses dados."
        : code === "23503"
          ? "Categoria em uso ou incompatível com o espaço e tipo."
          : code === "42501"
            ? "Você não tem permissão para esta ação."
            : "Não foi possível concluir. Verifique os dados e tente novamente.",
    );
  }
}

export async function act(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const raw = Object.fromEntries(form);
  const op = String(raw.op || "");
  let destination: string | undefined;
  let invitation: string | undefined;
  let success = "Alteração salva.";
  try {
    if (["login", "signup", "recover", "password", "logout"].includes(op)) {
      const client = await db();
      if (op === "logout") {
        checked(await client.auth.signOut());
        (await cookies()).delete("codex-space");
        destination = "/login";
      } else if (op === "password") {
        await identity();
        const password = z.string().min(8).max(128).parse(raw.password);
        checked(await client.auth.updateUser({ password }));
        success = "Senha atualizada. Você já pode entrar com a nova senha.";
      } else {
        const email = z.email().max(320).parse(raw.email);
        if (op === "recover") {
          checked(
            await client.auth.resetPasswordForEmail(email, {
              redirectTo: `${appUrl()}/auth/callback?next=/atualizar-senha`,
            }),
          );
          success =
            "Se o e-mail estiver cadastrado, você receberá o link para redefinir a senha.";
        } else {
          const password = z.string().min(8).max(128).parse(raw.password);
          if (op === "signup") {
            const result = await client.auth.signUp({
              email,
              password,
              options: {
                emailRedirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent(safeNext(raw.next, "/onboarding"))}`,
              },
            });
            checked(result);
            if (result.data.session)
              destination = safeNext(raw.next, "/onboarding");
            success = "Conta criada. Confirme seu e-mail para entrar.";
          } else {
            const result = await client.auth.signInWithPassword({
              email,
              password,
            });
            if (result.error)
              throw new Error(
                "Confira e-mail, senha e a confirmação do cadastro.",
              );
            destination = safeNext(raw.next);
          }
        }
      }
    } else if (op === "onboard") {
      const { client } = await identity();
      const name = z.string().trim().min(1).max(120).parse(raw.full_name);
      const preference = z
        .enum(["personal", "shared"])
        .parse(raw.view_preference);
      const type = raw.shared_type
        ? z.enum(["couple", "family"]).parse(raw.shared_type)
        : undefined;
      checked(
        await client.rpc("complete_onboarding", {
          p_name: name,
          p_preference: preference,
          p_shared_type: type,
          p_shared_name: type
            ? z.string().trim().min(1).max(80).parse(raw.shared_name)
            : undefined,
        }),
      );
      destination = "/dashboard";
    } else if (op === "create-space") {
      const { client } = await identity();
      const result = await client.rpc("create_space", {
        p_name: z.string().trim().min(1).max(80).parse(raw.name),
        p_type: z.enum(["couple", "family"]).parse(raw.type),
      });
      checked(result);
      await setSpace(result.data!);
      destination = "/espacos";
    } else if (op === "accept-invite") {
      const { client } = await identity();
      const result = await client.rpc("accept_invitation", {
        p_token: z
          .string()
          .regex(/^[0-9a-f]{64}$/)
          .parse(raw.token),
      });
      if (result.error)
        throw new Error(
          "Convite inválido, expirado ou de outro e-mail. Entre com a conta convidada.",
        );
      await setSpace(result.data!);
      destination = "/espacos";
    } else {
      const spaceId = uuid.parse(raw.space_id);
      const { client, role } = await authorizeSpace(spaceId);
      if (op === "select-space") {
        await setSpace(spaceId);
        destination = "/dashboard";
      } else if (op === "transaction") {
        const value = transactionInput.parse(raw);
        if (raw.id) {
          const { space_id, ...update } = value;
          const result = await client
            .from("transactions")
            .update(update)
            .eq("id", uuid.parse(raw.id))
            .eq("space_id", space_id)
            .select("id")
            .single();
          checked(result);
        } else checked(await client.from("transactions").insert(value));
        success = "Lançamento salvo.";
      } else if (op === "delete-transaction") {
        if (raw.confirm !== "yes") throw new Error("Confirme a exclusão.");
        checked(
          await client
            .from("transactions")
            .delete()
            .eq("id", uuid.parse(raw.id))
            .eq("space_id", spaceId)
            .select("id")
            .single(),
        );
        success = "Lançamento excluído.";
      } else if (op === "category") {
        checked(
          await client.from("categories").insert({
            space_id: spaceId,
            name: z.string().trim().min(1).max(60).parse(raw.name),
            type: z.enum(["income", "expense"]).parse(raw.type),
            color: z
              .string()
              .regex(/^#[0-9a-fA-F]{6}$/)
              .parse(raw.color),
          }),
        );
        success = "Categoria criada.";
      } else if (op === "delete-category") {
        if (role !== "owner" || raw.confirm !== "yes")
          throw new Error("A exclusão exige confirmação do proprietário.");
        checked(
          await client
            .from("categories")
            .delete()
            .eq("space_id", spaceId)
            .eq("id", uuid.parse(raw.id))
            .select("id")
            .single(),
        );
        success = "Categoria excluída.";
      } else if (op === "budget") {
        if (role !== "owner")
          throw new Error("Somente o proprietário pode alterar orçamentos.");
        const category = uuid.parse(raw.category_id);
        const month = date
          .refine((s) => s.endsWith("-01"))
          .parse(`${raw.month}-01`);
        const limit = money.parse(raw.limit_amount);
        const existing = await client
          .from("budgets")
          .select("id")
          .eq("space_id", spaceId)
          .eq("category_id", category)
          .eq("month", month)
          .maybeSingle();
        checked(existing);
        checked(
          existing.data
            ? await client
                .from("budgets")
                .update({ limit_amount: limit })
                .eq("id", existing.data.id)
                .select("id")
                .single()
            : await client
                .from("budgets")
                .insert({
                  space_id: spaceId,
                  category_id: category,
                  month,
                  limit_amount: limit,
                }),
        );
        success = "Orçamento salvo.";
      } else if (op === "invite") {
        const result = await client.rpc("create_invitation", {
          p_space_id: spaceId,
          p_email: z.email().parse(raw.email),
        });
        checked(result);
        invitation = `${appUrl()}/convite/${result.data}`;
        success = "Convite criado. Compartilhe o link com o e-mail convidado.";
      } else if (op === "remove-member") {
        if (raw.confirm !== "yes") throw new Error("Confirme a remoção.");
        checked(
          await client.rpc("remove_member", {
            p_space_id: spaceId,
            p_user_id: uuid.parse(raw.user_id),
          }),
        );
      } else if (op === "revoke-invite") {
        checked(
          await client
            .from("space_invitations")
            .update({ revoked_at: new Date().toISOString() })
            .eq("space_id", spaceId)
            .eq("id", uuid.parse(raw.id))
            .select("id")
            .single(),
        );
      } else if (op === "profile") {
        const { user } = await identity();
        checked(
          await client
            .from("profiles")
            .update({
              full_name: z.string().trim().min(1).max(120).parse(raw.full_name),
            })
            .eq("id", user.id)
            .select("id")
            .single(),
        );
      } else throw new Error("Ação inválida.");
    }
    revalidatePath("/", "layout");
  } catch (error) {
    // Redirect exceptions propagate; never turn session redirection into an error.
    if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT"))
      throw error;
    return {
      error:
        error instanceof z.ZodError
          ? "Verifique os campos: " + error.issues[0]?.message
          : error instanceof Error
            ? error.message
            : "Não foi possível concluir.",
    };
  }
  if (destination) redirect(destination);
  return { success, invitation };
}

async function setSpace(id: string) {
  (await cookies()).set("codex-space", id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 31536000,
  });
}
