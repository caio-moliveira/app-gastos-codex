"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="conteudo" className="onboarding">
      <h1>Não foi possível carregar seu espaço.</h1>
      <p>Verifique sua conexão e tente novamente.</p>
      <Button onClick={reset}>Tentar novamente</Button>
    </main>
  );
}
