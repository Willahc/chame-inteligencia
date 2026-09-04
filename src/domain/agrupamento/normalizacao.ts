export const VERSAO_NORMALIZADOR_RAZAO = "1.0.0";

const SUBSTITUICOES: ReadonlyArray<{ padrao: RegExp; valor: string }> = [
  { padrao: /\bSOCIEDADE\s+ANONIMA\b/gi, valor: " SA " },
  { padrao: /\bS\s*[./]?\s*A\b/gi, valor: " SA " },
  { padrao: /\bS\s*[./]?\s*S\b/gi, valor: " SS " },
  { padrao: /\bLIMITADA\b/gi, valor: " LTDA " },
  { padrao: /\bEIRELI\b/gi, valor: " " },
  { padrao: /\bME\b/gi, valor: " " },
  { padrao: /\bEPP\b/gi, valor: " " },
];

export function normalizarRazaoSocial(razao: string): string {
  let texto = razao
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[&]/g, " E ")
    .replace(/[,;:]/g, " ");

  for (const { padrao, valor } of SUBSTITUICOES) texto = texto.replace(padrao, valor);

  return texto
    .replace(/[.\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NOMES_GENERICOS = new Set([
  "CLINICA",
  "CENTRO MEDICO",
  "CENTRO CLINICO",
  "CENTRO DE SAUDE",
  "POLICLINICA",
  "LABORATORIO",
  "HOSPITAL",
  "POSTO DE SAUDE",
  "UNIDADE DE SAUDE",
]);

const SUFIXOS_LEGAIS = new Set(["LTDA", "SA", "SS", "EIRELI", "ME", "EPP"]);

export function ehRazaoGenerica(razaoNormalizada: string, razaoOriginal?: string): boolean {
  const reduzir = (texto: string) =>
    texto
      .split(" ")
      .filter((token) => !SUFIXOS_LEGAIS.has(token))
      .join(" ")
      .trim();
  if (NOMES_GENERICOS.has(reduzir(razaoNormalizada))) return true;
  const original = razaoOriginal
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[&]/g, " E ")
    .replace(/[,;:]/g, " ")
    .replace(/[.\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return Boolean(original && NOMES_GENERICOS.has(reduzir(normalizarRazaoSocial(original))));
}