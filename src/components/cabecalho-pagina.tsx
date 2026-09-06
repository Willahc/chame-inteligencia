import type { ReactNode } from "react";
import { obterModoDados } from "@/domain/modo-dados";

export function CabecalhoPagina({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao: string;
  acao?: ReactNode;
}) {
  return (
    <header className="flex flex-col justify-between gap-4 border-b border-[var(--borda)] pb-7 sm:flex-row sm:items-end">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className="rotulo-demo">{obterModoDados() === "MODO_DEMONSTRACAO" ? "MODO DEMONSTRAÇÃO" : "MODO REAL"}</span>
          <span className="text-sm text-[var(--texto-suave)]">{obterModoDados() === "MODO_DEMONSTRACAO" ? "5 contas simuladas · sem dados pessoais reais" : "Todas as oportunidades reais captadas · dados oficiais e evidências rastreáveis"}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-[-0.03em] text-[var(--azul-profundo)] sm:text-4xl">{titulo}</h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-[var(--texto-suave)]">{descricao}</p>
      </div>
      {acao}
    </header>
  );
}
