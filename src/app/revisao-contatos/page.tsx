import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { RevisaoContatosClient } from "@/components/revisao-contatos-client";
import { obterModoDados } from "@/domain/modo-dados";
import {
  listarContatosParaRevisao,
  obterResumoContadoresRevisao,
} from "@/domain/revisao-contatos/servico-revisao";

export const dynamic = "force-dynamic";

export default async function RevisaoContatosPage() {
  const modo = obterModoDados();
  const [contatos, resumo] = await Promise.all([
    listarContatosParaRevisao({ modo }),
    obterResumoContadoresRevisao(modo),
  ]);

  return (
    <div className="w-full px-3 py-5 sm:px-6 lg:px-8 lg:py-8 2xl:px-10 space-y-6">
      <CabecalhoPagina
        titulo="Revisão e Publicação Assistida de Contatos"
        descricao="Painel de governança humana para aprovação, rejeição, desativação e correção cadastral de profissionais B2B antes da exibição no pipeline comercial."
        acao={
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">
            Gate 7 — Revisão Assistida
          </span>
        }
      />

      <RevisaoContatosClient
        contatosIniciais={contatos}
        resumo={resumo}
        modoDados={modo}
      />
    </div>
  );
}
