import { LinhaCNES, SAO_PAULO_IBGE } from "../origem/cnes";

export type RegistroCNESNormalizado = {
  linha: number; cnes: string; nomeOriginal: string; municipio: string; uf: string; ibge: string;
  tipoEstabelecimentoOriginal: string; naturezaGestao: string; situacao: string; logradouro: string; numero: string; bairro: string; cep: string; turno: string; raw: LinhaCNES;
};

const val = (r: LinhaCNES, ...keys: string[]) => keys.map((k) => r[k] ?? "").find(Boolean) ?? "";
export function normalizarLinhaCNES(r: LinhaCNES): RegistroCNESNormalizado {
  return { linha: Number(r.__linha), cnes: val(r, "CO_CNES", "CO_UNIDADE").replace(/\D/g, ""), nomeOriginal: val(r, "NO_FANTASIA", "NO_RAZAO_SOCIAL"), municipio: val(r, "NO_MUNICIPIO", "MUNICIPIO"), uf: val(r, "SG_UF", "UF", "CO_UF"), ibge: val(r, "CO_IBGE"), tipoEstabelecimentoOriginal: val(r, "DS_NIVEL_HIERARQUIA", "TP_UNIDADE", "DS_TIPO_UNIDADE", "CO_ATIVIDADE"), naturezaGestao: val(r, "DS_NATUREZA_ORGANIZACAO", "TP_GESTAO"), situacao: val(r, "ST_STATUS", "CO_MOTIVO_DESAB"), logradouro: val(r, "NO_LOGRADOURO"), numero: val(r, "NU_ENDERECO"), bairro: val(r, "NO_BAIRRO"), cep: val(r, "CO_CEP"), turno: val(r, "DS_TURNO_ATENDIMENTO"), raw: r };
}

export function ehSaoPaulo(r: RegistroCNESNormalizado) { return r.uf === "35" && r.ibge.startsWith(SAO_PAULO_IBGE); }
export function classificacaoTipo(r: RegistroCNESNormalizado): string | null {
  const s = `${r.tipoEstabelecimentoOriginal} ${r.nomeOriginal}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (s.includes("HOSPITAL-DIA") || s.includes("HOSPITAL DIA")) return "Hospital-Dia";
  if (s.includes("HOSPITAL ESPECIALIZADO")) return "Hospital Especializado";
  if (s.includes("HOSPITAL")) return "Hospital Geral";
  if (s.includes("PRONTO ATENDIMENTO") || s.includes("UPA")) return "Pronto Atendimento";
  if (s.includes("DIAGNOST")) return "Centro de Diagnóstico";
  if (s.includes("CLINICA") || s.includes("CENTRO DE ESPECIALIDADE")) return "Clínica / Centro de Especialidade";
  return null;
}

export function validarRegistro(r: RegistroCNESNormalizado) {
  const erros: string[] = [];
  if (!r.cnes) erros.push("CNES ausente");
  if (!r.nomeOriginal) erros.push("nome ausente");
  if (!ehSaoPaulo(r)) erros.push("município/UF divergente de São Paulo/SP");
  const tipo = classificacaoTipo(r); if (!tipo) erros.push("tipo sem aderência assistencial definida");
  if (!r.logradouro || !r.numero || !r.bairro || !r.cep) erros.push("endereço incompleto");
  return { aceita: erros.length === 0, revisao: erros.length > 0 && !erros.some((e) => e.includes("ausente") || e.includes("divergente") || e.includes("aderência")), erros, tipo };
}
