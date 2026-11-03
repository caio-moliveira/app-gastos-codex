import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function Home() {
  return (
    <main id="conteudo" className="welcome">
      <header className="brand"><span aria-hidden="true" className="brand-mark">n</span>nosso bolso<span className="brand-dot">.</span></header>
      <section className="welcome-content">
        <p className="eyebrow">SEUS PLANOS COMEÇAM AQUI</p>
        <h1>Mais clareza no bolso.<br /><span>Mais espaço para viver.</span></h1>
        <p className="intro">Suas finanças pessoais e os planos em família, cada um no seu espaço. Uma visão simples para cuidar do que importa.</p>
        <div className="landing-actions"><Button asChild size="lg"><Link href="/cadastro">Começar meus planos</Link></Button><Button asChild variant="outline" size="lg"><Link href="/login">Já tenho uma conta</Link></Button></div>
      </section>
      <footer>Nosso Bolso · Finanças com clareza, planos com propósito.</footer>
    </main>
  );
}
