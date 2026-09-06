import { createHash } from "node:crypto";
import type {
  RegistroPNCPBruto,
  RegistroRejeitadoPNCP,
  ResultadoValidacaoPNCP,
  SinalContratacaoValidado,
} from "./tipos";
import { validarCNPJ } from "@/domain/receita/validacao-cnpj";

export const PALAVRAS_CHAVE_MOBILIDADE = [
  "transporte",
  "taxi",
  "táxi",
  "paciente",
  "pacientes",
  "remocao",
  "remoção",
  "ambulancia",
  "ambulância",
  "mobilidade",
  "locacao de veiculo",
  "locação de veículo",
  "locacao de veiculos",
  "locação de veículos",
  "veiculo",
  "veículo",
  "veiculos",
  "veículos",
  "motorista",
  "condutor",
  "deslocamento",
] as const;

export function normalizarTextoParaBusca(texto: string): string {
  if (!texto) return "";
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function detectarSinalMobilidade(objeto: string, complemento?: string | null): boolean {
  const combinado = normalizarTextoParaBusca(`${objeto} ${complemento ?? ""}`);
  return PALAVRAS_CHAVE_MOBILIDADE.some((kw) =>
    combinado.includes(normalizarTextoParaBusca(kw))
  );
}

export function extrairOrgaoDefensivo(orgao: unknown): {
  cnpj: string | null;
  razaoSocial: string | null;
  valido: boolean;
  motivoInvalido?: string;
} {
  if (!orgao) {
    return { cnpj: null, razaoSocial: null, valido: false, motivoInvalido: "Órgão ausente" };
  }

  // Atenção de governança: se for string ou contiver formato @{...}, NÃO interpretar como objeto e NÃO inventar valores
  if (typeof orgao === "string") {
    return {
      cnpj: null,
      razaoSocial: null,
      valido: false,
      motivoInvalido: "Órgão serializado como texto não estruturado (@{...})",
    };
  }

  if (typeof orgao !== "object" || Array.isArray(orgao)) {
    return {
      cnpj: null,
      razaoSocial: null,
      valido: false,
      motivoInvalido: "Tipo inesperado para órgão",
    };
  }

  const obj = orgao as Record<string, unknown>;
  const cnpjLimpo = typeof obj.cnpj === "string" ? obj.cnpj.replace(/\D/g, "") : "";
  const cnpj = cnpjLimpo.length === 14 && validarCNPJ(cnpjLimpo) ? cnpjLimpo : null;
  const razaoSocial =
    typeof obj.razaoSocial === "string" && obj.razaoSocial.trim().length > 0
      ? obj.razaoSocial.trim()
      : null;

  return {
    cnpj,
    razaoSocial,
    valido: Boolean(cnpj || razaoSocial),
  };
}

export function extrairUnidadeDefensivo(unidade: unknown): {
  municipio: string | null;
  uf: string | null;
  valido: boolean;
  motivoInvalido?: string;
} {
  if (!unidade) {
    return { municipio: null, uf: null, valido: false, motivoInvalido: "Unidade ausente" };
  }

  // Se for string ou formato @{...}, não tratar como objeto estruturado
  if (typeof unidade === "string") {
    return {
      municipio: null,
      uf: null,
      valido: false,
      motivoInvalido: "Unidade serializada como texto não estruturado (@{...})",
    };
  }

  if (typeof unidade !== "object" || Array.isArray(unidade)) {
    return {
      municipio: null,
      uf: null,
      valido: false,
      motivoInvalido: "Tipo inesperado para unidade",
    };
  }

  const obj = unidade as Record<string, unknown>;
  const municipio =
    typeof obj.municipio === "string" && obj.municipio.trim().length > 0
      ? obj.municipio.trim()
      : null;
  const ufLimpa = typeof obj.uf === "string" ? obj.uf.trim().toUpperCase() : "";
  const uf = ufLimpa.length === 2 ? ufLimpa : null;

  return {
    municipio,
    uf,
    valido: Boolean(municipio || uf),
  };
}

export function calcularHashRegistroOriginal(raw: Record<string, unknown>): string {
  // Ordenar chaves para garantir serialização determinística e reproduzível
  const sortedKeys = Object.keys(raw).sort();
  const sortedObj: Record<string, unknown> = {};
  for (const k of sortedKeys) {
    sortedObj[k] = raw[k];
  }
  const serialized = JSON.stringify(sortedObj);
  return createHash("sha256").update(serialized, "utf-8").digest("hex").toUpperCase();
}

export function validarRegistroPNCP(
  raw: RegistroPNCPBruto,
  indice = 0
):
  | { sucesso: true; dado: SinalContratacaoValidado }
  | { sucesso: false; rejeicao: RegistroRejeitadoPNCP } {
  const identificadorPNCP = raw.numeroControlePNCP?.trim();
  if (!identificadorPNCP) {
    return {
      sucesso: false,
      rejeicao: {
        indice,
        motivo: "Identificador PNCP (numeroControlePNCP) ausente ou vazio",
        dadosParciais: { objetoCompra: raw.objetoCompra },
      },
    };
  }

  const objeto = raw.objetoCompra?.trim();
  if (!objeto) {
    return {
      sucesso: false,
      rejeicao: {
        indice,
        identificadorPNCP,
        motivo: "Objeto da compra (objetoCompra) ausente ou vazio",
        dadosParciais: { numeroControlePNCP: identificadorPNCP },
      },
    };
  }

  // Validar data de publicação
  if (!raw.dataPublicacaoPncp) {
    return {
      sucesso: false,
      rejeicao: {
        indice,
        identificadorPNCP,
        motivo: "Data de publicação PNCP ausente",
        dadosParciais: { objetoCompra: objeto },
      },
    };
  }
  const dataPublicacao = new Date(raw.dataPublicacaoPncp);
  if (Number.isNaN(dataPublicacao.getTime())) {
    return {
      sucesso: false,
      rejeicao: {
        indice,
        identificadorPNCP,
        motivo: "Data de publicação PNCP inválida",
        dadosParciais: { objetoCompra: objeto },
      },
    };
  }

  // Modalidade
  const modalidade = raw.modalidadeNome?.trim() || `Modalidade ${raw.modalidadeId ?? "Desconhecida"}`;

  // Valor estimado quando disponível
  let valorEstimado: number | null = null;
  if (typeof raw.valorTotalEstimado === "number" && !Number.isNaN(raw.valorTotalEstimado) && raw.valorTotalEstimado > 0) {
    valorEstimado = raw.valorTotalEstimado;
  }

  // Órgão defensivo
  const orgao = extrairOrgaoDefensivo(raw.orgao);

  // Unidade defensiva
  const unidade = extrairUnidadeDefensivo(raw.unidade);

  // Mobilidade
  const sinalMobilidade =
    raw.sinalMobilidade === true ||
    detectarSinalMobilidade(objeto, raw.informacaoComplementar);

  // Palavras-chave
  const palavrasChave = Array.isArray(raw.keywordsEncontradas)
    ? raw.keywordsEncontradas.filter((k): k is string => typeof k === "string")
    : [];

  // URL pública
  const urlPublica =
    typeof raw.linkSistemaOrigem === "string" && raw.linkSistemaOrigem.startsWith("http")
      ? raw.linkSistemaOrigem
      : `https://pncp.gov.br/app/editais/${identificadorPNCP}`;

  const hashRegistro = calcularHashRegistroOriginal(raw as Record<string, unknown>);

  return {
    sucesso: true,
    dado: {
      identificadorPNCP,
      objeto,
      modalidade,
      dataPublicacao,
      valorEstimado,
      cnpjOrgao: orgao.cnpj,
      razaoSocialOrgao: orgao.razaoSocial,
      municipio: unidade.municipio,
      uf: unidade.uf,
      palavrasChave,
      sinalMobilidade,
      urlPublica,
      hashRegistro,
      tipoDado: "FATO_PUBLICO",
      confianca: "ALTA",
      statusRevisao: "APROVADA",
    },
  };
}

export function validarLoteRegistrosPNCP(registros: RegistroPNCPBruto[]): ResultadoValidacaoPNCP {
  const validos: SinalContratacaoValidado[] = [];
  const rejeitados: RegistroRejeitadoPNCP[] = [];

  for (let i = 0; i < registros.length; i++) {
    const res = validarRegistroPNCP(registros[i], i);
    if (res.sucesso) {
      validos.push(res.dado);
    } else {
      rejeitados.push(res.rejeicao);
    }
  }

  return {
    validos,
    rejeitados,
    totalLidos: registros.length,
    totalMobilidade: validos.filter((v) => v.sinalMobilidade).length,
    totalComCNPJ: validos.filter((v) => v.cnpjOrgao !== null).length,
  };
}
