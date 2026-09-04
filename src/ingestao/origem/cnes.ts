export const CNES_FONTE_URL = "https://dadosabertos.saude.gov.br/dataset/cnes-cadastro-nacional-de-estabelecimentos-de-saude";
export const CNES_RECURSO_URL = "https://s3.sa-east-1.amazonaws.com/ckan.saude.gov.br/CNES/cnes_estabelecimentos_csv.zip";
export const CNES_RECURSO_ID = "78b91d79-bb6d-43ad-bda5-f015e3575a84";
export const CNES_ARQUIVO = "cnes_estabelecimentos.csv";
export const CNES_VERSAO_IMPORTADOR = "1.0.0";
export const SAO_PAULO_IBGE = "355030";

export type LinhaCNES = Record<string, string> & { __linha: string };

export function normalizarCabecalho(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function parseCsv(texto: string, delimitador = ";"): LinhaCNES[] {
  const textoLimpo = texto.replace(/^\uFEFF/, "");
  const linhas: string[][] = [];
  let atual: string[] = [], campo = "", aspas = false;
  for (let i = 0; i < textoLimpo.length; i += 1) {
    const ch = textoLimpo[i];
    if (ch === '"') { if (aspas && textoLimpo[i + 1] === '"') { campo += '"'; i += 1; } else aspas = !aspas; }
    else if (ch === delimitador && !aspas) { atual.push(campo); campo = ""; }
    else if ((ch === "\n" || ch === "\r") && !aspas) { if (ch === "\r" && textoLimpo[i + 1] === "\n") i += 1; atual.push(campo); campo = ""; if (atual.some(Boolean)) linhas.push(atual); atual = []; }
    else campo += ch;
  }
  if (campo.length || atual.length) { atual.push(campo); if (atual.some(Boolean)) linhas.push(atual); }
  if (!linhas.length) return [];
  const cabecalhos = linhas[0].map(normalizarCabecalho);
  return linhas.slice(1).map((valores, index) => ({ ...Object.fromEntries(cabecalhos.map((h, i) => [h, (valores[i] ?? "").trim()])) as LinhaCNES, __linha: String(index + 2) }));
}
