import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <main id="conteudo" className="main-content" aria-label="Carregando">
      <Skeleton className="h-12 w-56" />
      <div className="metric-grid">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton className="h-40 w-full" key={i} />
        ))}
      </div>
    </main>
  );
}
