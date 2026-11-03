import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Database } from "./database.types";

export async function db() {
  const store = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Configure a conexão Supabase.");
  return createServerClient<Database, "codex">(url, key, {
    db: { schema: "codex" },
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try {
          for (const { name, value, options } of values)
            store.set(name, value, options);
        } catch {
          /* Server Components cannot set cookies; proxy refreshes them. */
        }
      },
    },
  });
}

export const identity = cache(async () => {
  const client = await db();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) redirect("/login");
  const init = await client.rpc("ensure_profile");
  if (init.error) throw new Error("Não foi possível preparar seu perfil.");
  return { client, user };
});

export async function authorizeSpace(id: string) {
  const { client, user } = await identity();
  const { data, error } = await client
    .from("space_members")
    .select("role")
    .eq("space_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data)
    throw new Error("Espaço não autorizado. Escolha um espaço disponível.");
  return { client, user, role: data.role };
}

export const workspace = cache(async () => {
  const { client, user } = await identity();
  const [profileResult, spacesResult] = await Promise.all([
    client.from("profiles").select("*").eq("id", user.id).single(),
    client.from("spaces").select("*").order("created_at"),
  ]);
  if (profileResult.error || spacesResult.error)
    throw new Error("Não foi possível carregar seu espaço.");
  const profile = profileResult.data;
  if (!profile.onboarded_at) redirect("/onboarding");
  const spaces = spacesResult.data;
  const selected = (await cookies()).get("codex-space")?.value;
  const space = selected
    ? spaces.find((s) => s.id === selected)
    : (profile.view_preference === "shared"
        ? spaces.find((s) => s.type !== "personal")
        : undefined) || spaces.find((s) => s.type === "personal");
  return { client, user, profile, spaces, space };
});

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}
