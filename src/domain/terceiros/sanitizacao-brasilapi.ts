import { createHash } from "node:crypto";
import { NivelConfianca, StatusRevisao, TipoDado } from "@prisma/client";
import { DadosSanitizadosTerceiro } from "./tipos";
import { desformatarCNPJ } from "../receita/validacao-cnpj";

export function sanitizarRespostaBrasilAPI(
  raw: unknown,
  cnpjConsultado: string,
  urlFonte: string,
  dataConsulta: Date = new Date()
): DadosSanitizadosTerceiro {
  if (!raw || typeof raw !== "object") {
    throw new Error("Resposta da BrasilAPI inválida ou não estruturada.");
  }

  const data = raw as Record<string, unknown>;
  const cnpjLimpo = desformatarCNPJ(String(data.cnpj || cnpjConsultado));

  // Matriz / Filial
  let matrizFilial: "MATRIZ" | "FILIAL" | null = null;
  const descMf = String(data.descricao_identificador_matriz_filial || "").toUpperCase();
  const idMf = Number(data.identificador_matriz_filial);
  if (descMf.includes("MATRIZ") || idMf === 1) {
    matrizFilial = "MATRIZ";
  } else if (descMf.includes("FILIAL") || idMf === 2) {
    matrizFilial = "FILIAL";
  }

  // Datas
  let dataSituacao: Date | null = null;
  if (data.data_situacao_cadastral && typeof data.data_situacao_cadastral === "string") {
    const d = new Date(data.data_situacao_cadastral);
    if (!isNaN(d.getTime())) dataSituacao = d;
  }

  let dataInicioAtividade: Date | null = null;
  if (data.data_inicio_atividade && typeof data.data_inicio_atividade === "string") {
    const d = new Date(data.data_inicio_atividade);
    if (!isNaN(d.getTime())) dataInicioAtividade = d;
  }

  // Capital Social
  let capitalSocial: number | null = null;
  if (typeof data.capital_social === "number") {
    capitalSocial = data.capital_social;
  } else if (typeof data.capital_social === "string") {
    const parsed = parseFloat(data.capital_social);
    if (!isNaN(parsed)) capitalSocial = parsed;
  }

  // CNAE Principal
  let cnaePrincipal: string | null = null;
  if (data.cnae_fiscal) {
    const desc = data.cnae_fiscal_descricao ? ` - ${data.cnae_fiscal_descricao}` : "";
    cnaePrincipal = `${data.cnae_fiscal}${desc}`;
  }

  // Situação cadastral
  const situacaoCadastral = data.descricao_situacao_cadastral
    ? String(data.descricao_situacao_cadastral).toUpperCase()
    : data.situacao_cadastral
    ? String(data.situacao_cadastral)
    : null;

  // Objeto estruturado estritamente corporativo (SEM QSA, SEM CPF, SEM TELEFONE, SEM EMAIL)
  const corporativo = {
    cnpj: cnpjLimpo,
    provedor: "BRASIL_API" as const,
    razaoSocial: data.razao_social ? String(data.razao_social).trim() : null,
    nomeFantasia: data.nome_fantasia ? String(data.nome_fantasia).trim() : null,
    situacaoCadastral,
    dataSituacao,
    dataInicioAtividade,
    cnaePrincipal,
    naturezaJuridica: data.natureza_juridica ? String(data.natureza_juridica).trim() : null,
    porte: data.porte ? String(data.porte).trim() : null,
    capitalSocial,
    municipio: data.municipio ? String(data.municipio).trim() : null,
    uf: data.uf ? String(data.uf).trim() : null,
    matrizFilial,
    fonteUrl: urlFonte,
  };

  // Hash determinístico da representação sanitizada
  const hashResposta = createHash("sha256")
    .update(
      JSON.stringify({
        ...corporativo,
        dataSituacao: dataSituacao?.toISOString() || null,
        dataInicioAtividade: dataInicioAtividade?.toISOString() || null,
      })
    )
    .digest("hex");

  return {
    ...corporativo,
    dataConsulta,
    dataReferencia: dataSituacao || dataInicioAtividade,
    hashResposta,
    tipoDado: TipoDado.DADO_TERCEIRO_NAO_CANONICO,
    confianca: NivelConfianca.MEDIA,
    statusRevisao: StatusRevisao.PENDENTE,
  };
}
