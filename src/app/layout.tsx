import type { Metadata } from "next";
import Link from "next/link";
import {
  BotMessageSquare,
  Briefcase,
  Building2,
  Database,
  Gauge,
  Landmark,
  Network,
  Radar,
  Scale,
} from "lucide-react";
import "./globals.css";
import { obterModoDados } from "@/domain/modo-dados";

export const metadata: Metadata = {
  title: "Chame Inteligência",
  description: "Radar de potenciais clientes do setor de saúde com dados rastreáveis.",
};

export const dynamic = "force-dynamic";

const navegacao = [
  { href: "/", rotulo: "Visão Geral", icone: Gauge },
  { href: "/contas", rotulo: "Contas Comerciais", icone: Briefcase },
  { href: "/radar", rotulo: "Radar de Clientes", icone: Radar },
  { href: "/organizacoes", rotulo: "Organizações", icone: Network },
  { href: "/contratacoes-publicas", rotulo: "Contratações Públicas", icone: Landmark },
  { href: "/cobertura", rotulo: "Cobertura de Dados", icone: Database },
  { href: "/assistente", rotulo: "Assistente Comercial", icone: BotMessageSquare },
  { href: "/governanca", rotulo: "Governança", icone: Scale },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  const modo = obterModoDados();
  return (
    <html lang="pt-BR">
      <body>
        <div className="min-h-screen bg-[var(--fundo)] text-[var(--texto)]">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[var(--azul-profundo)] text-white lg:hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--ciano)] text-[var(--azul-profundo)]">
                <Building2 size={21} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold tracking-wide">CHAME INTELIGÊNCIA</p>
                <p className="text-xs text-slate-300">Radar do setor de saúde</p>
              </div>
            </div>
            <nav aria-label="Navegação principal" className="flex gap-1 overflow-x-auto px-3 pb-2.5 [scrollbar-width:none]">
              {navegacao.map(({ href, rotulo }) => (
                <Link className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10" href={href} key={href}>
                  {rotulo}
                </Link>
              ))}
            </nav>
          </header>

          <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-[var(--azul-profundo)] text-white lg:flex">
            <div className="flex items-center gap-3 border-b border-white/10 px-6 py-6">
              <div className="flex size-11 items-center justify-center rounded-xl bg-[var(--ciano)] text-[var(--azul-profundo)] shadow-[0_0_30px_rgba(39,207,201,.22)]">
                <Building2 size={23} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold tracking-[0.08em]">CHAME INTELIGÊNCIA</p>
                <p className="mt-0.5 text-xs text-slate-400">Radar do setor de saúde</p>
              </div>
            </div>

            <nav aria-label="Navegação principal" className="flex-1 space-y-1 px-4 py-6">
              {navegacao.map(({ href, rotulo, icone: Icone }) => (
                <Link className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/8 hover:text-white" href={href} key={href}>
                  <Icone className="text-slate-400 transition group-hover:text-[var(--ciano)]" size={19} aria-hidden="true" />
                  {rotulo}
                </Link>
              ))}
            </nav>

            <div className="border-t border-white/10 p-5">
              <div className="rounded-xl border border-amber-300/20 bg-amber-300/8 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-300">Ambiente controlado</p>
                <p className="mt-2 text-xs leading-5 text-slate-300">{modo === "MODO_DEMONSTRACAO" ? "Exibindo somente dados fictícios de demonstração." : "MODO REAL: exibindo somente registros FATO OFICIAL."}</p>
              </div>
            </div>
          </aside>

          <main className="w-full max-w-[2560px] lg:pl-64">{children}</main>
        </div>
      </body>
    </html>
  );
}
