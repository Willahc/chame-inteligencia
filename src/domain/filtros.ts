import type { FaixaPrioridade, InstituicaoRadar, NaturezaClasse, NivelConfianca, TipoVinculo } from "./tipos";

export interface FiltrosRadar {
  texto?: string;
  indiceMinimo?: number;
  municipio?: string;
  tipo?: string;
  variasUnidades?: boolean;
  expansao?: boolean;
  operacao24h?: boolean;
  qualidadeEvidencia?: NivelConfianca;
  faixa?: FaixaPrioridade;
  segmento?: string;
  somenteOportunidadesComerciais?: boolean;
  organizacao?: string;
  natureza?: NaturezaClasse;
  tipoVinculo?: TipoVinculo;
  confiancaVinculo?: NivelConfianca;
  revisaoNecessaria?: boolean;
  somentePrivadasMultiUnidade?: boolean;
}

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function filtrarInstituicoes(
  instituicoes: InstituicaoRadar[],
  filtros: FiltrosRadar,
): InstituicaoRadar[] {
  const texto = normalizar(filtros.texto ?? "");
  return instituicoes
    .filter((item) => !texto || normalizar(`${item.nome} ${item.grupo ?? ""} ${item.municipios.join(" ")}`).includes(texto))
    .filter((item) => item.indice >= (filtros.indiceMinimo ?? 0))
    .filter((item) => !filtros.municipio || item.municipios.includes(filtros.municipio))
    .filter((item) => !filtros.tipo || item.tipo === filtros.tipo)
    .filter((item) => !filtros.variasUnidades || item.quantidadeUnidades > 1)
    .filter((item) => !filtros.expansao || item.possuiExpansao)
    .filter((item) => !filtros.operacao24h || item.operacao24h)
    .filter((item) => !filtros.qualidadeEvidencia || item.qualidadeEvidencias === filtros.qualidadeEvidencia)
    .filter((item) => !filtros.faixa || item.faixa === filtros.faixa)
    .filter((item) => !filtros.segmento || item.segmentacao?.segmento === filtros.segmento)
    .filter((item) => !filtros.organizacao || item.organizacao?.nome === filtros.organizacao || item.organizacao?.id === filtros.organizacao)
    .filter((item) => !filtros.natureza || item.organizacao?.natureza === filtros.natureza)
    .filter((item) => !filtros.tipoVinculo || item.organizacao?.tipoVinculo === filtros.tipoVinculo)
    .filter((item) => !filtros.confiancaVinculo || item.organizacao?.confianca === filtros.confiancaVinculo)
    .filter((item) => !filtros.revisaoNecessaria || item.organizacao?.precisaRevisao === true)
    .filter(
      (item) =>
        !filtros.somentePrivadasMultiUnidade ||
        ((item.organizacao?.quantidadeUnidades ?? 0) > 1 && item.organizacao?.natureza === "PRIVADO"),
    )
    .filter(
      (item) =>
        !filtros.somenteOportunidadesComerciais ||
        item.segmentacao?.segmento === "NUCLEO_HOSPITALAR" ||
        item.segmentacao?.segmento === "SAUDE_CORPORATIVA_EXPANDIDA",
    )
    .sort((a, b) => b.indice - a.indice || a.nome.localeCompare(b.nome, "pt-BR"));
}