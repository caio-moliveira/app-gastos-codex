import Link from "next/link";
import { db } from "@/lib/supabase";
import { ActionForm } from "@/components/forms";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
export default async function Invitation({params}:{params:Promise<{token:string}>}) {
  const {token}=await params;
  const client=await db(); const {data:{user}}=await client.auth.getUser();
  const next=encodeURIComponent(`/convite/${token}`);
  return <main id="conteudo" className="onboarding"><Card><CardHeader><CardTitle>Um convite para compartilhar planos</CardTitle><CardDescription>Entre com o e-mail convidado. Seus dados pessoais continuam privados.</CardDescription></CardHeader><CardContent>{user?<ActionForm op="accept-invite" hidden={{token}} submit="Aceitar convite"/>:<div className="auth-links"><Link href={`/login?next=${next}`}>Entrar para aceitar</Link><Link href={`/cadastro?next=${next}`}>Criar uma conta</Link></div>}</CardContent></Card></main>;
}
