import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { EcossistemaTaxiClient } from "@/components/ecossistema-taxi-client";
import {
  carregarDadosAbertosMobilidadeSP,
  carregarPolosCorporativos5km,
  carregarPontosTaxiGeorreferenciados,
  carregarResumoEcossistemaTaxiSP,
  consultarTaxistasMapeados,
} from "@/lib/ecossistema-unificado";

export const dynamic = "force-dynamic";

export default function PaginaEcossistemaTaxi() {
  const resumo = carregarResumoEcossistemaTaxiSP();
  const inicialTaxistas = consultarTaxistasMapeados({ pagina: 1, tamanhoPagina: 50 });
  const pontos = carregarPontosTaxiGeorreferenciados();
  const polos5km = carregarPolosCorporativos5km();
  const dadosAbertos = carregarDadosAbertosMobilidadeSP();

  return (
    <div className="w-full px-3 py-5 sm:px-6 lg:px-8 lg:py-8 2xl:px-10">
      <CabecalhoPagina
        titulo="Ecossistema Táxi 360º & Mapa Tático GIS"
        descricao="Plataforma unificada: 16.863 taxistas e alvarás DTP 2026 higienizados (LGPD + anti-homônimos), 997 pontos de táxi georreferenciados, 190 polos corporativos/hospitais num raio de 5 km e bases oficiais SGTP/Detran/RFB/Infosiga."
      />

      <div className="mt-6">
        <EcossistemaTaxiClient
          resumo={resumo}
          taxistasIniciais={inicialTaxistas}
          pontos={pontos}
          polos5km={polos5km}
          dadosAbertos={dadosAbertos}
        />
      </div>
    </div>
  );
}
