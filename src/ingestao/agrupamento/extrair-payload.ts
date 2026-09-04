export interface DadosAgrupamentoPayloadCNES {
  razaoSocial: string | null;
  cnpj: string | null;
  cnpjMantenedora: string | null;
  naturezaJuridicaCode: string | null;
}

function texto(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  const t = String(valor).replace(/[.\-]/g, "").trim();
  return t || null;
}

function somenteDigitos(valor: unknown, tamanho: number): string | null {
  const t = String(valor ?? "").replace(/\D/g, "").trim();
  if (!/^\d+$/.test(t)) return null;
  return t.length === tamanho ? t : null;
}

export function extrairAgrupamentoDoPayload(payload: Record<string, unknown>): DadosAgrupamentoPayloadCNES {
  return {
    razaoSocial: texto(payload.NO_RAZAO_SOCIAL),
    cnpj: somenteDigitos(payload.NU_CNPJ, 14),
    cnpjMantenedora: somenteDigitos(payload.NU_CNPJ_MANTENEDORA, 14),
    naturezaJuridicaCode: texto(payload.CO_NATUREZA_JUR),
  };
}