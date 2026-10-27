import fs from "fs";
import path from "path";

export type CategoriaCooperativaTaxi =
  | "COOPERATIVA_TAXI"
  | "CENTRAL_RADIO_TAXI"
  | "ASSOCIACAO_SINDICATO"
  | "FROTA_TAXI_EXECUTIVO";

export type TierPotencialSaaS =
  | "TIER_1_ALTA_PRIORIDADE"
  | "TIER_2_MEDIA_PRIORIDADE"
  | "TIER_3_EXPANSAO_FROTA";

export type StatusAbordagemCooperativa =
  | "NAO_ABORDADA"
  | "ABORDADA"
  | "DEMONSTRACAO_AGENDADA"
  | "PROPOSTA_ENVIADA"
  | "CLIENTE_ATIVO"
  | "DESCARTADA";

export type StatusRevisaoCooperativa = "CONFIRMADO" | "PENDENTE_REVISAO";

export type NivelEvidenciaCooperativa = "FORTE" | "MODERADA";

export type MotivoClassificacaoCooperativa =
  | "CNAE_PRINCIPAL_TAXI"
  | "NOME_TAXI_COM_CNAE_SECUNDARIO"
  | "NOME_TAXI_COM_CNAE_AMPLO"
  | "CNAE_TAXI_SECUNDARIO_COM_IDENTIDADE"
  | "CONFLITO_SEGMENTO";

export type MotivoExclusaoCooperativa =
  | "SEM_EVIDENCIA_TAXI"
  | "CNAE_TAXI_APENAS_SECUNDARIO"
  | "SEGMENTO_INCOMPATIVEL";

export interface RegistroFonteCooperativa {
  CNPJ: string;
  RAZAO_SOCIAL: string;
  NOME_FANTASIA: string;
  NATUREZA_JURIDICA: string;
  PORTE: string;
  CAPITAL_SOCIAL: string;
  CNAE_FISCAL_PRINCIPAL: string;
  CNAE_FISCAL_SECUNDARIA: string;
  CNAE_TAXI_DESCRICAO: string;
  SITUACAO_CADASTRAL: string;
  DATA_INICIO_ATIVIDADE: string;
  MATRIZ_OU_FILIAL: string;
  LOGRADOURO: string;
  NUMERO: string;
  COMPLEMENTO: string;
  BAIRRO: string;
  CEP: string;
  MUNICIPIO: string;
  UF: string;
  TELEFONE_INSTITUCIONAL: string;
  TELEFONE_INSTITUCIONAL_2: string;
  EMAIL_INSTITUCIONAL: string;
}

export type ClassificacaoRegistroTaxi =
  | {
      incluido: true;
      categoria: CategoriaCooperativaTaxi;
      statusRevisao: StatusRevisaoCooperativa;
      nivelEvidencia: NivelEvidenciaCooperativa;
      motivoClassificacao: MotivoClassificacaoCooperativa;
      evidencias: string[];
      cnaesTaxiSecundarios: string[];
    }
  | {
      incluido: false;
      motivoExclusao: MotivoExclusaoCooperativa;
    };

export interface CooperativaTaxiAlvoSaaS {
  id: string;
  cnpj: string;
  raizCnpj: string;
  razaoSocial: string;
  nomeExibicao: string;
  categoria: CategoriaCooperativaTaxi;
  rotuloCategoria: string;
  tierSaaS: TierPotencialSaaS;
  scorePotencialSaaS: number;
  statusRevisao: StatusRevisaoCooperativa;
  nivelEvidencia: NivelEvidenciaCooperativa;
  motivoClassificacao: MotivoClassificacaoCooperativa;
  evidencias: string[];
  tipoEstabelecimento: string;
  naturezaJuridica: string;
  porte: string;
  capitalSocial: number;
  capitalSocialFormatado: string;
  cnaePrincipal: string;
  cnaePrincipalFormatado: string;
  cnaePrincipalDescricao: string;
  cnaeDescricao: string;
  cnaesTaxiSecundarios: string[];
  dataInicioAtividade: string;
  anosAtuacao: number;
  enderecoCompleto: string;
  bairro: string;
  cep: string;
  municipio: string;
  uf: string;
  telefonePrincipal: string;
  emailPrincipal: string;
  possuiContatoDireto: boolean;
  unidadesConsolidadasGrupo: number;
  modulosRecomendados: string[];
  dorOperacionalMapeada: string;
  argumentoChaveVenda: string;
  pitchWhatsAppEmail: string;
  statusAbordagem: StatusAbordagemCooperativa;
  anotacoesComerciais?: string;
  atualizadoEm?: string;
  atualizadoPor?: string;
}

export interface ExclusaoPorMotivo {
  motivo: MotivoExclusaoCooperativa;
  rotulo: string;
  registros: number;
}

export interface ResumoCooperativasTaxiSaaS {
  totalRegistrosFonte: number;
  totalGruposAnalisados: number;
  totalGruposMapeados: number;
  totalGruposExcluidos: number;
  totalRegistrosExcluidos: number;
  totalConfirmados: number;
  totalPendentesRevisao: number;
  totalCooperativasPuras: number;
  totalCentraisRadioTaxi: number;
  totalAssociacoesSindicatos: number;
  totalFrotasTaxiPj: number;
  totalTier1: number;
  totalComContatoDireto: number;
  totalEmNegociacaoOuAbordadas: number;
  exclusoesPorMotivo: ExclusaoPorMotivo[];
  cooperativas: CooperativaTaxiAlvoSaaS[];
}

export interface AbordagemCooperativaSalva {
  statusAbordagem: StatusAbordagemCooperativa;
  anotacoesComerciais?: string;
  atualizadoEm: string;
  atualizadoPor?: string;
}

const CNAES_TAXI_NUCLEO = new Set(["4923001", "5229001"]);

const DESCRICOES_CNAE: Record<string, string> = {
  "4923001": "Serviço de táxi",
  "4923002": "Transporte de passageiros — locação de automóveis com motorista",
  "5229001": "Serviços de apoio ao transporte por táxi, inclusive centrais de chamada",
  "7711000": "Locação de automóveis sem condutor",
};

const ROTULOS_EXCLUSAO: Record<MotivoExclusaoCooperativa, string> = {
  SEM_EVIDENCIA_TAXI:
    "Sem evidência de táxi no nome ou na atividade principal",
  CNAE_TAXI_APENAS_SECUNDARIO:
    "CNAE de táxi apenas secundário, sem identidade de táxi no nome",
  SEGMENTO_INCOMPATIVEL:
    "Segmento incompatível no nome (escola, carga, saúde, guincho, turismo etc.)",
};

/**
 * Termos que indicam segmento incompatível com táxi. São avaliados apenas no
 * nome (razão social + fantasia + natureza) e nunca sobrescrevem a evidência
 * de CNAE: quando o CNAE principal é de táxi, o registro fica pendente de
 * revisão em vez de ser descartado.
 */
const TERMOS_SEGMENTO_INCOMPATIVEL = [
  "ESCOLA",
  "ESCOLAR",
  "EDUCACAO",
  "ENSINO",
  "FACULDADE",
  "COLEGIO",
  "CURSO",
  "IDIOMAS",
  "CARGA",
  "CARGAS",
  "LOGISTICA",
  "GUINCHO",
  "REBOQUE",
  "AUTOSSOCORRO",
  "SOCORRO",
  "AMBULANCIA",
  "SAUDE",
  "HOSPITAL",
  "CLINICA",
  "LABORATORIO",
  "FARMACIA",
  "FACILITIES",
  "FACILITY",
  "LIMPEZA",
  "SEGURANCA",
  "VIGILANCIA",
  "PORTARIA",
  "ONIBUS",
  "RODOVIARIO",
  "MUDANCA",
  "ENTREGA",
  "DELIVERY",
  "MOTOTAXI",
  "MOTOBOY",
  "TELECOM",
  "ESPORTS",
  "ESPORTE",
  "FUTEBOL",
  "IGREJA",
  "CONDOMINIO",
  "CONSTRUTORA",
  "IMOBILIARIA",
  "JORNAIS",
  "REVISTAS",
  "HORTIFRUTI",
  "ESTACIONAMENTO",
  "PARK",
  "TURISMO",
  "VIAGEM",
  "VIAGENS",
  "HOTEL",
  "HOTELARIA",
];

const REGEX_NOME_TAXI = /\bTAXI\b|RADIO ?TAXI|RADIO-TAXI|TAXISTA/;
const REGEX_COOPERATIVA = /\bCOOP\w*/;

export function normalizarTexto(valor: string | undefined): string {
  return (valor || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/**
 * Parser CSV compatível com RFC 4180 para o delimitador usado pela Receita
 * Federal (;). O campo CNAE_TAXI_DESCRICAO contém ";" dentro de aspas em 295
 * linhas da base; um split(";") ingênuo desalinha essas linhas.
 */
export function analisarCsv(texto: string, delimitador = ";"): string[][] {
  const conteudo = texto.replace(/^\uFEFF/, "");
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let dentroDeAspas = false;

  const concluirLinha = () => {
    linha.push(campo);
    linhas.push(linha);
    linha = [];
    campo = "";
  };

  for (let i = 0; i < conteudo.length; i++) {
    const caractere = conteudo[i];

    if (dentroDeAspas) {
      if (caractere === '"') {
        if (conteudo[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroDeAspas = false;
        }
      } else {
        campo += caractere;
      }
      continue;
    }

    if (caractere === '"') {
      dentroDeAspas = true;
    } else if (caractere === delimitador) {
      linha.push(campo);
      campo = "";
    } else if (caractere === "\n") {
      concluirLinha();
    } else if (caractere === "\r") {
      if (conteudo[i + 1] === "\n") i++;
      concluirLinha();
    } else {
      campo += caractere;
    }
  }

  if (campo.length > 0 || linha.length > 0) concluirLinha();

  return linhas.filter((registro) => registro.some((valor) => valor.trim() !== ""));
}

export function mapearRegistrosCsv(texto: string): RegistroFonteCooperativa[] {
  const linhas = analisarCsv(texto);
  if (linhas.length <= 1) return [];

  const cabecalho = linhas[0].map((coluna) => coluna.trim());
  return linhas.slice(1).map((linha) => {
    const registro: Record<string, string> = {};
    cabecalho.forEach((coluna, indice) => {
      registro[coluna] = (linha[indice] ?? "").trim();
    });
    return registro as unknown as RegistroFonteCooperativa;
  });
}

function formatarCnae(codigo: string): string {
  const digitos = (codigo || "").replace(/\D/g, "");
  if (digitos.length !== 7) return codigo || "Não informado";
  return `${digitos.slice(0, 4)}-${digitos.slice(4, 5)}/${digitos.slice(5)}`;
}

function descreverCnae(codigo: string): string {
  return DESCRICOES_CNAE[codigo] || "Descrição oficial não mapeada nesta base";
}

export function classificarRegistroTaxi(
  registro: RegistroFonteCooperativa,
): ClassificacaoRegistroTaxi {
  const nomeCompleto = normalizarTexto(
    `${registro.RAZAO_SOCIAL} ${registro.NOME_FANTASIA} ${registro.NATUREZA_JURIDICA}`,
  );
  const natureza = normalizarTexto(registro.NATUREZA_JURIDICA);
  const razaoSocial = normalizarTexto(registro.RAZAO_SOCIAL);
  const cnaePrincipal = (registro.CNAE_FISCAL_PRINCIPAL || "").trim();
  const cnaesSecundarios = (registro.CNAE_FISCAL_SECUNDARIA || "")
    .split(",")
    .map((codigo) => codigo.trim())
    .filter(Boolean);

  const nomeTemTaxi = REGEX_NOME_TAXI.test(nomeCompleto);
  const termosDivergentes = TERMOS_SEGMENTO_INCOMPATIVEL.filter((termo) =>
    new RegExp(`\\b${termo}\\b`).test(nomeCompleto),
  );
  const ehCooperativa =
    natureza.includes("COOPERATIVA") ||
    razaoSocial.includes("COOPERATIVA") ||
    REGEX_COOPERATIVA.test(razaoSocial);
  const ehAssociacao =
    natureza.includes("ASSOCIACAO") ||
    nomeCompleto.includes("ASSOCIACAO") ||
    nomeCompleto.includes("SINDICATO");
  const ehRadioTaxi = /RADIO ?TAXI|RADIO-TAXI/.test(nomeCompleto);
  const ehCentral = nomeCompleto.includes("CENTRAL");

  const temCnaeTaxiPrincipal = CNAES_TAXI_NUCLEO.has(cnaePrincipal);
  const cnaesTaxiSecundarios = cnaesSecundarios.filter((codigo) =>
    CNAES_TAXI_NUCLEO.has(codigo),
  );
  const temCnaeTaxiSecundario = cnaesTaxiSecundarios.length > 0;

  const categoria: CategoriaCooperativaTaxi = ehAssociacao
    ? "ASSOCIACAO_SINDICATO"
    : ehCooperativa
      ? "COOPERATIVA_TAXI"
      : ehRadioTaxi || ehCentral || cnaePrincipal === "5229001"
        ? "CENTRAL_RADIO_TAXI"
        : "FROTA_TAXI_EXECUTIVO";

  const identidadeTaxi =
    ehCooperativa ||
    ehAssociacao ||
    ehRadioTaxi ||
    (ehCentral && temCnaeTaxiSecundario);

  const evidencias: string[] = [];
  if (cnaePrincipal) {
    evidencias.push(
      `CNAE principal ${formatarCnae(cnaePrincipal)} — ${descreverCnae(cnaePrincipal)}`,
    );
  }
  cnaesTaxiSecundarios.forEach((codigo) => {
    evidencias.push(
      `CNAE secundário ${formatarCnae(codigo)} — ${descreverCnae(codigo)}`,
    );
  });
  if (nomeTemTaxi) {
    evidencias.push("Nome ou nome fantasia contém referência a táxi/rádio-táxi");
  }
  if (ehCooperativa && registro.NATUREZA_JURIDICA) {
    evidencias.push(`Natureza jurídica: ${registro.NATUREZA_JURIDICA}`);
  }
  if (ehAssociacao && !ehCooperativa) {
    evidencias.push("Razão social ou natureza indica associação/sindicato");
  }
  if (termosDivergentes.length > 0) {
    evidencias.push(
      `Termo de segmento divergente no nome: ${termosDivergentes.join(", ").toLowerCase()}`,
    );
  }
  evidencias.push(
    `Estabelecimento ${registro.MATRIZ_OU_FILIAL || "não informado"} na base da Receita Federal`,
  );

  // Segmento incompatível sem qualquer menção a táxi: só permanece na lista
  // quando o CNAE principal é oficialmente de táxi, e nesse caso como pendente.
  if (termosDivergentes.length > 0 && !nomeTemTaxi) {
    if (temCnaeTaxiPrincipal) {
      return {
        incluido: true,
        categoria,
        statusRevisao: "PENDENTE_REVISAO",
        nivelEvidencia: "MODERADA",
        motivoClassificacao: "CONFLITO_SEGMENTO",
        evidencias,
        cnaesTaxiSecundarios,
      };
    }
    return { incluido: false, motivoExclusao: "SEGMENTO_INCOMPATIVEL" };
  }

  const temAlgumaEvidencia =
    nomeTemTaxi || temCnaeTaxiPrincipal || (temCnaeTaxiSecundario && identidadeTaxi);

  if (!temAlgumaEvidencia) {
    return {
      incluido: false,
      motivoExclusao: temCnaeTaxiSecundario
        ? "CNAE_TAXI_APENAS_SECUNDARIO"
        : "SEM_EVIDENCIA_TAXI",
    };
  }

  if (temCnaeTaxiPrincipal) {
    return {
      incluido: true,
      categoria,
      statusRevisao: "CONFIRMADO",
      nivelEvidencia: "FORTE",
      motivoClassificacao: "CNAE_PRINCIPAL_TAXI",
      evidencias,
      cnaesTaxiSecundarios,
    };
  }

  if (nomeTemTaxi && temCnaeTaxiSecundario) {
    return {
      incluido: true,
      categoria,
      statusRevisao: "CONFIRMADO",
      nivelEvidencia: "FORTE",
      motivoClassificacao: "NOME_TAXI_COM_CNAE_SECUNDARIO",
      evidencias,
      cnaesTaxiSecundarios,
    };
  }

  return {
    incluido: true,
    categoria,
    statusRevisao: "PENDENTE_REVISAO",
    nivelEvidencia: "MODERADA",
    motivoClassificacao: nomeTemTaxi
      ? "NOME_TAXI_COM_CNAE_AMPLO"
      : "CNAE_TAXI_SECUNDARIO_COM_IDENTIDADE",
    evidencias,
    cnaesTaxiSecundarios,
  };
}

function resolverDiretorioMapeamento(): string {
  const candidatos = [
    path.resolve(process.cwd(), "..", "mapeamento_2026-09-29"),
    path.resolve(process.cwd(), "mapeamento_2026-09-29"),
  ];
  for (const dir of candidatos) {
    if (fs.existsSync(/* turbopackIgnore: true */ dir)) return dir;
  }
  return candidatos[0];
}

function obterCaminhoPersistenciaAbordagens(): string {
  const dir = resolverDiretorioMapeamento();
  return path.join(dir, "data", "processed", "abordagens_cooperativas_taxi.json");
}

export function carregarAbordagensSalvasCooperativas(): Record<
  string,
  AbordagemCooperativaSalva
> {
  const arquivo = obterCaminhoPersistenciaAbordagens();
  if (!fs.existsSync(arquivo)) return {};
  try {
    const bruto = fs.readFileSync(arquivo, "utf8");
    return JSON.parse(bruto) as Record<string, AbordagemCooperativaSalva>;
  } catch {
    return {};
  }
}

export function salvarAbordagemCooperativa(
  idOuRaiz: string,
  statusAbordagem: StatusAbordagemCooperativa,
  anotacoesComerciais?: string,
  operador?: string,
): void {
  const arquivo = obterCaminhoPersistenciaAbordagens();
  const atual = carregarAbordagensSalvasCooperativas();
  atual[idOuRaiz] = {
    statusAbordagem,
    anotacoesComerciais:
      anotacoesComerciais ?? atual[idOuRaiz]?.anotacoesComerciais ?? "",
    atualizadoEm: new Date().toISOString(),
    atualizadoPor: operador ?? atual[idOuRaiz]?.atualizadoPor,
  };
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, JSON.stringify(atual, null, 2), "utf8");
}

function limparTelefone(telBruto: string, telSecundario?: string): string {
  const candidatos = [telBruto, telSecundario || ""];
  for (const c of candidatos) {
    const limpo = (c || "").trim();
    if (!limpo) continue;
    const digitos = limpo.replace(/\D/g, "");
    if (
      digitos.length >= 8 &&
      !/^0+$/.test(digitos) &&
      !/(\d)\1{7,}/.test(digitos)
    ) {
      return limpo;
    }
  }
  return "";
}

function limparEmail(emailBruto: string): string {
  const limpo = (emailBruto || "").trim().toLowerCase();
  if (!limpo || !limpo.includes("@") || limpo.includes("0000")) return "";
  return limpo;
}

function converterCapitalSocial(valorBruto: string): number {
  if (!valorBruto) return 0;
  const normalizado = valorBruto.replace(/\./g, "").replace(",", ".").trim();
  const num = Number(normalizado);
  return Number.isFinite(num) ? num : 0;
}

function formatarMoedaBRL(valor: number): string {
  if (!valor || valor <= 0) return "Não informado";
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function traduzirPorte(codigoPorte: string, natureza: string): string {
  const natUpper = normalizarTexto(natureza);
  if (natUpper.includes("COOP") || natUpper.includes("ASSOCIACAO")) {
    return "Cooperativa / Entidade Associativa";
  }
  if (codigoPorte === "05") return "Médio / Grande Porte";
  if (codigoPorte === "03") return "Empresa de Pequeno Porte (EPP)";
  if (codigoPorte === "01") return "Microempresa (PJ)";
  return "Porte não informado";
}

export function calcularAnosAtuacao(
  dataIso: string,
  anoReferencia = new Date().getFullYear(),
): number {
  if (!dataIso || !/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) return 0;
  const ano = Number(dataIso.slice(0, 4));
  if (!Number.isFinite(ano)) return 0;
  return Math.max(0, anoReferencia - ano);
}

function construirPitchComercial(params: {
  nomeExibicao: string;
  categoria: CategoriaCooperativaTaxi;
  bairro: string;
  anosAtuacao: number;
}): {
  rotuloCategoria: string;
  modulosRecomendados: string[];
  dorOperacionalMapeada: string;
  argumentoChaveVenda: string;
  pitchWhatsAppEmail: string;
} {
  const { nomeExibicao, categoria, bairro, anosAtuacao } = params;
  const regiaoTxt = bairro ? `na região de ${bairro}` : "em São Paulo";
  const tempoTxt =
    anosAtuacao >= 1 ? `${anosAtuacao} anos de mercado` : "atuação recente";

  if (categoria === "COOPERATIVA_TAXI") {
    return {
      rotuloCategoria: "Cooperativa de Táxi & Condutores",
      modulosRecomendados: [
        "CRM B2B Corporativo & Saúde (7.600+ contas)",
        "Mapa GIS de 997 Pontos DTP & Alocação de Frota",
        "Base de 16.863 Alvarás DTP para Captação de Cooperados",
      ],
      dorOperacionalMapeada:
        "Dependência de corridas avulsas ou aplicativos terceiros com altas taxas e falta de equipe estruturada de inteligência comercial B2B para fechar contratos diretos de voucher corporativo com hospitais e empresas.",
      argumentoChaveVenda:
        "Transforma a cooperativa em uma máquina de prospecção B2B: entrega 7.600+ empresas e polos hospitalares mapeados com CNPJ, decisor e raio de 5 km dos pontos da cooperativa, além de apoiar a retenção e recrutamento de novos taxistas com alvará ativo.",
      pitchWhatsAppEmail: `Olá, diretoria da ${nomeExibicao}! Vimos a atuação consolidada da cooperativa (${tempoTxt} ${regiaoTxt}) e gostaríamos de apresentar o WiNS Hub Táxi: uma plataforma de Inteligência Comercial B2B e GIS exclusiva para cooperativas de táxi em SP. Nela, a ${nomeExibicao} acessa mais de 7.600 empresas e hospitais de alto fluxo num raio de 5 km para fechar contratos diretos de corridas corporativas (sem intermediários), além do mapa oficial de 997 pontos DTP e 16.863 alvarás ativos para expansão de cooperados. Podemos agendar uma demonstração rápida de 15 minutos esta semana?`,
    };
  }

  if (categoria === "CENTRAL_RADIO_TAXI") {
    return {
      rotuloCategoria: "Central de Rádio-Táxi & Despacho",
      modulosRecomendados: [
        "Radar B2B de Polos Corporativos & Hospitais (Raio 5 km)",
        "Playbook de Prospecção de Contas Voucher B2B",
        "Inteligência Geoespacial de Demanda & Sinistralidade",
      ],
      dorOperacionalMapeada:
        "Necessidade de expandir a carteira de clientes corporativos faturados (vouchers/contas PJ) para manter os motoristas da central com alta ocupação nos horários de entrepico.",
      argumentoChaveVenda:
        "Fornece para a área comercial da Rádio-Táxi o mapeamento pronto de hospitais, laboratórios e sedes corporativas em São Paulo com 1 CNPJ e 1 contato principal por grupo econômico, acelerando o fechamento de contratos recorrentes.",
      pitchWhatsAppEmail: `Olá, equipe comercial da ${nomeExibicao}! Sabemos que o maior diferencial de uma central de Rádio-Táxi ${regiaoTxt} é ter contratos corporativos recorrentes para alimentar a frota. Desenvolvemos o WiNS Hub Táxi, uma ferramenta que já traz mapeados mais de 7.600 grupos empresariais, hospitais e clínicas de São Paulo (com CNPJ, porte, contato e distância para os pontos de táxi) prontos para prospecção de voucher corporativo. Gostaria de mostrar em 10 minutos como sua central pode fechar novos contratos B2B ainda este mês. Qual o melhor horário?`,
    };
  }

  if (categoria === "ASSOCIACAO_SINDICATO") {
    return {
      rotuloCategoria: "Associação / Entidade de Taxistas",
      modulosRecomendados: [
        "Painel do Ecossistema de Táxi 360º (DTP + OSM + Infosiga)",
        "Auditoria de 997 Pontos de Táxi e Concorrência no Entorno",
        "Convênio Corporativo para Associados",
      ],
      dorOperacionalMapeada:
        "Falta de dados geoespaciais consolidados sobre os pontos de táxi, licenças DTP ativas, pressão competitiva de locadoras e polos geradores de demanda no entorno dos pontos representados.",
      argumentoChaveVenda:
        "Permite à associação oferecer inteligência de mercado aos seus taxistas associados, defender melhorias nos pontos junto ao DTP/Prefeitura com dados oficiais e firmar convênios com clínicas e empresas vizinhas.",
      pitchWhatsAppEmail: `Olá, presidência/diretoria da ${nomeExibicao}! Apresentamos o WiNS Hub Táxi, plataforma que unifica os dados oficiais do DTP (16.863 alvarás e 997 pontos de táxi georreferenciados), Infosiga e mais de 7.600 polos geradores de corridas (hospitais e empresas) ${regiaoTxt}. É uma ferramenta estratégica para apoiar os associados da ${nomeExibicao} a captarem clientes corporativos no entorno dos pontos. Podemos apresentar a plataforma em uma breve conversa?`,
    };
  }

  return {
    rotuloCategoria: "Empresa de Táxi PJ",
    modulosRecomendados: [
      "Mapeamento de Polos Geradores de Corridas (Hospitais & Empresas)",
      "Monitoramento de Frota, Sinistralidade Infosiga & Concorrência",
      "Captação de Contratos B2B de Transporte Executivo",
    ],
    dorOperacionalMapeada:
      "Ociosidade de veículos e necessidade de posicionar os motoristas nos pontos e corredores corporativos de maior rentabilidade e menor risco de sinistro.",
    argumentoChaveVenda:
      "Ajuda a empresa de táxi a aumentar a receita por veículo (orientando motoristas para os polos hospitalares e corporativos de maior demanda) e a reduzir custos de sinistralidade com o cruzamento viário Infosiga.",
    pitchWhatsAppEmail: `Olá, gestão da ${nomeExibicao}! Vimos que vocês atuam com serviço de táxi ${regiaoTxt} e gostaríamos de apresentar o WiNS Hub Táxi: uma plataforma que mapeia os 997 pontos de táxi da capital, as zonas de sinistralidade e mais de 7.600 hospitais e empresas geradoras de corridas corporativas. A ferramenta ajuda empresas de táxi a fecharem contratos PJ diretos e otimizarem o giro dos motoristas. Podemos demonstrar a ferramenta em uma chamada de 10 minutos?`,
  };
}

function resumoVazio(): ResumoCooperativasTaxiSaaS {
  return {
    totalRegistrosFonte: 0,
    totalGruposAnalisados: 0,
    totalGruposMapeados: 0,
    totalGruposExcluidos: 0,
    totalRegistrosExcluidos: 0,
    totalConfirmados: 0,
    totalPendentesRevisao: 0,
    totalCooperativasPuras: 0,
    totalCentraisRadioTaxi: 0,
    totalAssociacoesSindicatos: 0,
    totalFrotasTaxiPj: 0,
    totalTier1: 0,
    totalComContatoDireto: 0,
    totalEmNegociacaoOuAbordadas: 0,
    exclusoesPorMotivo: [],
    cooperativas: [],
  };
}

interface CacheBaseCooperativas {
  caminho: string;
  modificadoEm: number;
  registros: RegistroFonteCooperativa[];
}

let cacheBaseCooperativas: CacheBaseCooperativas | null = null;

function carregarRegistrosFonte(caminho: string): RegistroFonteCooperativa[] {
  const modificadoEm = fs.statSync(caminho).mtimeMs;
  if (
    cacheBaseCooperativas &&
    cacheBaseCooperativas.caminho === caminho &&
    cacheBaseCooperativas.modificadoEm === modificadoEm
  ) {
    return cacheBaseCooperativas.registros;
  }
  const conteudo = fs.readFileSync(caminho, "utf8");
  const registros = mapearRegistrosCsv(conteudo);
  cacheBaseCooperativas = { caminho, modificadoEm, registros };
  return registros;
}

export function carregarCooperativasEFrotasTaxiSP(): ResumoCooperativasTaxiSaaS {
  const dir = resolverDiretorioMapeamento();
  const caminhoCsv = path.join(dir, "data", "processed", "empresas_taxi_pj_ativas_sp.csv");

  if (!fs.existsSync(caminhoCsv)) return resumoVazio();

  const registros = carregarRegistrosFonte(caminhoCsv);
  if (registros.length === 0) return resumoVazio();

  const abordagensSalvas = carregarAbordagensSalvasCooperativas();

  const registrosPorRaiz = new Map<string, RegistroFonteCooperativa[]>();
  const exclusoesPorMotivo = new Map<MotivoExclusaoCooperativa, number>();
  const candidatosPorRaiz = new Map<
    string,
    Array<{ registro: RegistroFonteCooperativa; classificacao: Extract<ClassificacaoRegistroTaxi, { incluido: true }> }>
  >();

  for (const registro of registros) {
    const digitosCnpj = registro.CNPJ.replace(/\D/g, "");
    const raiz = digitosCnpj.length >= 8 ? digitosCnpj.slice(0, 8) : registro.CNPJ;

    const doGrupo = registrosPorRaiz.get(raiz);
    if (doGrupo) doGrupo.push(registro);
    else registrosPorRaiz.set(raiz, [registro]);

    const classificacao = classificarRegistroTaxi(registro);
    if (classificacao.incluido) {
      const candidatos = candidatosPorRaiz.get(raiz);
      const item = { registro, classificacao };
      if (candidatos) candidatos.push(item);
      else candidatosPorRaiz.set(raiz, [item]);
    } else {
      exclusoesPorMotivo.set(
        classificacao.motivoExclusao,
        (exclusoesPorMotivo.get(classificacao.motivoExclusao) ?? 0) + 1,
      );
    }
  }

  const prioridadeStatus: Record<StatusRevisaoCooperativa, number> = {
    CONFIRMADO: 2,
    PENDENTE_REVISAO: 1,
  };

  const cooperativas: CooperativaTaxiAlvoSaaS[] = [];

  for (const [raiz, candidatos] of candidatosPorRaiz.entries()) {
    candidatos.sort((a, b) => {
      const prioridade =
        prioridadeStatus[b.classificacao.statusRevisao] -
        prioridadeStatus[a.classificacao.statusRevisao];
      if (prioridade !== 0) return prioridade;

      const cnaePrincipalA = CNAES_TAXI_NUCLEO.has(a.registro.CNAE_FISCAL_PRINCIPAL) ? 1 : 0;
      const cnaePrincipalB = CNAES_TAXI_NUCLEO.has(b.registro.CNAE_FISCAL_PRINCIPAL) ? 1 : 0;
      if (cnaePrincipalB !== cnaePrincipalA) return cnaePrincipalB - cnaePrincipalA;

      const matrizA = a.registro.MATRIZ_OU_FILIAL === "Matriz" ? 1 : 0;
      const matrizB = b.registro.MATRIZ_OU_FILIAL === "Matriz" ? 1 : 0;
      if (matrizB !== matrizA) return matrizB - matrizA;

      return a.registro.CNPJ.localeCompare(b.registro.CNPJ, "pt-BR");
    });

    const { registro: r, classificacao } = candidatos[0];
    const registrosDoGrupo = registrosPorRaiz.get(raiz) ?? [r];

    let melhorTelefone = "";
    let melhorEmail = "";
    for (const registro of registrosDoGrupo) {
      if (!melhorTelefone) {
        melhorTelefone = limparTelefone(
          registro.TELEFONE_INSTITUCIONAL,
          registro.TELEFONE_INSTITUCIONAL_2,
        );
      }
      if (!melhorEmail) melhorEmail = limparEmail(registro.EMAIL_INSTITUCIONAL);
      if (melhorTelefone && melhorEmail) break;
    }

    const capitalSocial = converterCapitalSocial(r.CAPITAL_SOCIAL);
    const anosAtuacao = calcularAnosAtuacao(r.DATA_INICIO_ATIVIDADE);
    const possuiTelefone = Boolean(melhorTelefone);
    const possuiEmail = Boolean(melhorEmail);
    const possuiContatoDireto = possuiTelefone || possuiEmail;
    const nomeFantasiaLimpo = r.NOME_FANTASIA.trim();
    const nomeExibicao =
      nomeFantasiaLimpo && nomeFantasiaLimpo.length >= 3
        ? `${nomeFantasiaLimpo} (${r.RAZAO_SOCIAL})`
        : r.RAZAO_SOCIAL;

    const pitchInfo = construirPitchComercial({
      nomeExibicao: nomeFantasiaLimpo || r.RAZAO_SOCIAL,
      categoria: classificacao.categoria,
      bairro: r.BAIRRO,
      anosAtuacao,
    });

    // Cálculo de aderência comercial (0 a 100). A classificação pendente
    // reduz o score e nunca é promovida a Tier 1 antes da revisão humana.
    let score = 50;
    if (classificacao.categoria === "COOPERATIVA_TAXI") score += 28;
    else if (classificacao.categoria === "CENTRAL_RADIO_TAXI") score += 26;
    else if (classificacao.categoria === "ASSOCIACAO_SINDICATO") score += 20;
    else score += 10;

    if (
      normalizarTexto(r.RAZAO_SOCIAL).includes("TAXI") ||
      normalizarTexto(r.NOME_FANTASIA).includes("TAXI") ||
      CNAES_TAXI_NUCLEO.has(r.CNAE_FISCAL_PRINCIPAL)
    ) {
      score += 8;
    }
    if (possuiTelefone) score += 7;
    if (possuiEmail) score += 5;
    if (anosAtuacao >= 5) score += 4;
    if (capitalSocial >= 100000) score += 3;
    if (classificacao.statusRevisao === "PENDENTE_REVISAO") score -= 12;
    score = Math.max(0, Math.min(99, score));

    let tierSaaS: TierPotencialSaaS = "TIER_3_EXPANSAO_FROTA";
    if (
      classificacao.statusRevisao === "CONFIRMADO" &&
      (score >= 82 ||
        classificacao.categoria === "COOPERATIVA_TAXI" ||
        classificacao.categoria === "CENTRAL_RADIO_TAXI")
    ) {
      tierSaaS = "TIER_1_ALTA_PRIORIDADE";
    } else if (
      classificacao.statusRevisao === "PENDENTE_REVISAO" ||
      score >= 70 ||
      classificacao.categoria === "ASSOCIACAO_SINDICATO"
    ) {
      tierSaaS = "TIER_2_MEDIA_PRIORIDADE";
    }

    const id = `COOP-${raiz}`;
    const salvo = abordagensSalvas[id] || abordagensSalvas[raiz];

    const partesEndereco = [
      r.LOGRADOURO,
      r.NUMERO ? `nº ${r.NUMERO}` : "",
      r.COMPLEMENTO || "",
    ].filter(Boolean);

    cooperativas.push({
      id,
      cnpj: r.CNPJ,
      raizCnpj: raiz,
      razaoSocial: r.RAZAO_SOCIAL,
      nomeExibicao,
      categoria: classificacao.categoria,
      rotuloCategoria: pitchInfo.rotuloCategoria,
      tierSaaS,
      scorePotencialSaaS: score,
      statusRevisao: classificacao.statusRevisao,
      nivelEvidencia: classificacao.nivelEvidencia,
      motivoClassificacao: classificacao.motivoClassificacao,
      evidencias: classificacao.evidencias,
      tipoEstabelecimento: r.MATRIZ_OU_FILIAL || "Não informado",
      naturezaJuridica:
        r.NATUREZA_JURIDICA ||
        (classificacao.categoria === "COOPERATIVA_TAXI"
          ? "Cooperativa"
          : classificacao.categoria === "ASSOCIACAO_SINDICATO"
            ? "Associação Privada"
            : "Sociedade Empresária Limitada"),
      porte: traduzirPorte(r.PORTE, r.NATUREZA_JURIDICA || r.RAZAO_SOCIAL),
      capitalSocial,
      capitalSocialFormatado: formatarMoedaBRL(capitalSocial),
      cnaePrincipal: r.CNAE_FISCAL_PRINCIPAL,
      cnaePrincipalFormatado: formatarCnae(r.CNAE_FISCAL_PRINCIPAL),
      cnaePrincipalDescricao: descreverCnae(r.CNAE_FISCAL_PRINCIPAL),
      cnaeDescricao:
        r.CNAE_TAXI_DESCRICAO ||
        classificacao.cnaesTaxiSecundarios
          .map((codigo) => `${formatarCnae(codigo)} — ${descreverCnae(codigo)}`)
          .join("; ") ||
        "Transporte por táxi e centrais de chamada",
      cnaesTaxiSecundarios: classificacao.cnaesTaxiSecundarios,
      dataInicioAtividade: r.DATA_INICIO_ATIVIDADE || "Não informada",
      anosAtuacao,
      enderecoCompleto:
        partesEndereco.join(", ") || "Endereço comercial registrado na Receita Federal",
      bairro: r.BAIRRO || "SÃO PAULO",
      cep: r.CEP || "",
      municipio: r.MUNICIPIO || "SAO PAULO",
      uf: r.UF || "SP",
      telefonePrincipal: melhorTelefone || "Não informado na Receita Federal",
      emailPrincipal: melhorEmail || "Não informado na Receita Federal",
      possuiContatoDireto,
      unidadesConsolidadasGrupo: registrosDoGrupo.length,
      modulosRecomendados: pitchInfo.modulosRecomendados,
      dorOperacionalMapeada: pitchInfo.dorOperacionalMapeada,
      argumentoChaveVenda: pitchInfo.argumentoChaveVenda,
      pitchWhatsAppEmail: pitchInfo.pitchWhatsAppEmail,
      statusAbordagem: salvo?.statusAbordagem ?? "NAO_ABORDADA",
      anotacoesComerciais: salvo?.anotacoesComerciais ?? "",
      atualizadoEm: salvo?.atualizadoEm,
      atualizadoPor: salvo?.atualizadoPor,
    });
  }

  cooperativas.sort((a, b) => {
    if (a.statusRevisao !== b.statusRevisao) {
      return a.statusRevisao === "CONFIRMADO" ? -1 : 1;
    }
    if (b.scorePotencialSaaS !== a.scorePotencialSaaS) {
      return b.scorePotencialSaaS - a.scorePotencialSaaS;
    }
    if (a.possuiContatoDireto !== b.possuiContatoDireto) {
      return a.possuiContatoDireto ? -1 : 1;
    }
    return a.razaoSocial.localeCompare(b.razaoSocial, "pt-BR");
  });

  const totalRegistrosExcluidos = Array.from(exclusoesPorMotivo.values()).reduce(
    (total, quantidade) => total + quantidade,
    0,
  );

  return {
    totalRegistrosFonte: registros.length,
    totalGruposAnalisados: registrosPorRaiz.size,
    totalGruposMapeados: cooperativas.length,
    totalGruposExcluidos: registrosPorRaiz.size - cooperativas.length,
    totalRegistrosExcluidos,
    totalConfirmados: cooperativas.filter((c) => c.statusRevisao === "CONFIRMADO").length,
    totalPendentesRevisao: cooperativas.filter(
      (c) => c.statusRevisao === "PENDENTE_REVISAO",
    ).length,
    totalCooperativasPuras: cooperativas.filter(
      (c) => c.categoria === "COOPERATIVA_TAXI",
    ).length,
    totalCentraisRadioTaxi: cooperativas.filter(
      (c) => c.categoria === "CENTRAL_RADIO_TAXI",
    ).length,
    totalAssociacoesSindicatos: cooperativas.filter(
      (c) => c.categoria === "ASSOCIACAO_SINDICATO",
    ).length,
    totalFrotasTaxiPj: cooperativas.filter(
      (c) => c.categoria === "FROTA_TAXI_EXECUTIVO",
    ).length,
    totalTier1: cooperativas.filter((c) => c.tierSaaS === "TIER_1_ALTA_PRIORIDADE").length,
    totalComContatoDireto: cooperativas.filter((c) => c.possuiContatoDireto).length,
    totalEmNegociacaoOuAbordadas: cooperativas.filter(
      (c) => c.statusAbordagem !== "NAO_ABORDADA" && c.statusAbordagem !== "DESCARTADA",
    ).length,
    exclusoesPorMotivo: (
      Object.keys(ROTULOS_EXCLUSAO) as MotivoExclusaoCooperativa[]
    )
      .map((motivo) => ({
        motivo,
        rotulo: ROTULOS_EXCLUSAO[motivo],
        registros: exclusoesPorMotivo.get(motivo) ?? 0,
      }))
      .filter((item) => item.registros > 0),
    cooperativas,
  };
}
