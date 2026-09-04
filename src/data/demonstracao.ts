import type { EvidenciaDominio, Porte, TipoDado } from "@/domain/tipos";
import type { EntradaIndice } from "@/domain/indice/calcular-indice";

interface UnidadeDemo {
  id: string;
  nome: string;
  operacao24h: boolean;
  endereco: { logradouro: string; numero: string; bairro: string; municipio: string; uf: string };
}

export interface InstituicaoDemonstracao {
  id: string;
  slug: string;
  nome: string;
  grupo?: { id: string; nome: string };
  tipo: { id: string; nome: string };
  descricao: string;
  operacao24h: boolean;
  porte: Porte;
  perfilCorporativo: boolean;
  tipoDado: TipoDado;
  unidades: UnidadeDemo[];
  servicos: string[];
  sinaisExpansao: Array<{ id: string; titulo: string; descricao: string; dataReferencia: string; evidenciaIds: string[] }>;
  necessidades: Array<{ titulo: string; descricao: string }>;
  areasDecisoras: Array<{ nome: string; justificativa: string }>;
  evidencias: EvidenciaDominio[];
  acao: { titulo: string; descricao: string };
  fatoresIndice: Omit<EntradaIndice, "operacao24h" | "quantidadeUnidades" | "porte" | "perfilPrivadoCorporativo" | "quantidadeMunicipios" | "possuiExpansaoRecente" | "evidenciasPorCriterio">;
}

const coleta = "2026-09-04T12:00:00.000Z";

function evidencia(
  id: string,
  instituicao: string,
  titulo: string,
  descricao: string,
  confianca: "ALTA" | "MEDIA" | "BAIXA",
  statusRevisao: "APROVADA" | "PENDENTE" = "APROVADA",
): EvidenciaDominio {
  return {
    id,
    titulo,
    descricao,
    observacao: "Conteúdo criado exclusivamente para demonstração funcional; não representa uma instituição real.",
    dataColeta: coleta,
    dataReferencia: "2026-08-15T12:00:00.000Z",
    tipo: "DEMONSTRACAO",
    confianca,
    statusRevisao,
    fonte: {
      id: `fonte-${instituicao}`,
      nome: "Catálogo fictício do Gate 1",
      identificador: `DEMO-G1-${instituicao.toUpperCase()}`,
      tipoDado: "DEMONSTRACAO",
    },
  };
}

export const INSTITUICOES_DEMONSTRACAO: InstituicaoDemonstracao[] = [
  {
    id: "inst-rede-saude-exemplo",
    slug: "rede-saude-exemplo",
    nome: "Rede Saúde Exemplo",
    grupo: { id: "grupo-horizonte-demo", nome: "Grupo Horizonte Demonstração" },
    tipo: { id: "tipo-rede-hospitalar", nome: "Rede hospitalar" },
    descricao: "Rede fictícia de atendimento hospitalar criada para testar priorização de contas com presença regional.",
    operacao24h: true,
    porte: "MUITO_GRANDE",
    perfilCorporativo: true,
    tipoDado: "DEMONSTRACAO",
    unidades: [
      { id: "un-rede-1", nome: "Unidade Central Modelo", operacao24h: true, endereco: { logradouro: "Avenida Demonstração", numero: "100", bairro: "Bairro Modelo", municipio: "São Paulo", uf: "SP" } },
      { id: "un-rede-2", nome: "Unidade Oeste Exemplo", operacao24h: true, endereco: { logradouro: "Rua Exemplo", numero: "200", bairro: "Jardim Fictício", municipio: "Osasco", uf: "SP" } },
      { id: "un-rede-3", nome: "Unidade Interior Demonstração", operacao24h: false, endereco: { logradouro: "Alameda Modelo", numero: "300", bairro: "Centro Demonstrativo", municipio: "Campinas", uf: "SP" } },
      { id: "un-rede-4", nome: "Unidade ABC Modelo", operacao24h: true, endereco: { logradouro: "Praça Demonstração", numero: "400", bairro: "Vila Exemplo", municipio: "Santo André", uf: "SP" } },
    ],
    servicos: ["Pronto atendimento", "Diagnóstico", "Internação"],
    sinaisExpansao: [{ id: "exp-rede-1", titulo: "Nova unidade em preparação", descricao: "Sinal fictício de expansão regional para validar o fluxo de evidências.", dataReferencia: "2026-08-15T12:00:00.000Z", evidenciaIds: ["ev-rede-1"] }],
    necessidades: [
      { titulo: "Deslocamento entre unidades", descricao: "Hipótese comercial de circulação de equipes e materiais entre quatro municípios." },
      { titulo: "Recepção de visitantes", descricao: "Hipótese de transporte para executivos, fornecedores e acompanhantes." },
    ],
    areasDecisoras: [
      { nome: "Suprimentos", justificativa: "Possível responsável pela contratação e homologação de fornecedores." },
      { nome: "Operações", justificativa: "Possível participante na definição de cobertura e nível de serviço." },
    ],
    evidencias: [
      evidencia("ev-rede-1", "rede", "Expansão regional demonstrativa", "Registro fictício indica preparação de uma nova unidade.", "ALTA"),
      evidencia("ev-rede-2", "rede", "Operação contínua demonstrativa", "Três unidades fictícias foram marcadas com funcionamento 24 horas.", "ALTA"),
    ],
    acao: { titulo: "Mapear Operações e Suprimentos", descricao: "Validar a estrutura regional, identificar responsáveis funcionais e preparar abordagem consultiva sobre mobilidade entre unidades." },
    fatoresIndice: { potencialDeslocamento: 1, potencialVisitantes: 0.9, facilidadeAcessoDecisor: 0.6, qualidadeEvidencias: 1 },
  },
  {
    id: "inst-hospital-alfa",
    slug: "hospital-demonstracao-alfa",
    nome: "Hospital Demonstração Alfa",
    tipo: { id: "tipo-hospital-geral", nome: "Hospital geral" },
    descricao: "Hospital geral fictício de grande porte usado para demonstrar uma instituição independente com operação contínua.",
    operacao24h: true,
    porte: "GRANDE",
    perfilCorporativo: true,
    tipoDado: "DEMONSTRACAO",
    unidades: [{ id: "un-alfa-1", nome: "Unidade Alfa", operacao24h: true, endereco: { logradouro: "Rua Alfa Demonstração", numero: "10", bairro: "Distrito Modelo", municipio: "Belo Horizonte", uf: "MG" } }],
    servicos: ["Urgência", "Internação", "Centro cirúrgico"],
    sinaisExpansao: [],
    necessidades: [{ titulo: "Transporte em horários estendidos", descricao: "Hipótese comercial associada à operação contínua e a visitantes externos." }],
    areasDecisoras: [{ nome: "Administração", justificativa: "Possível ponto inicial para compreender regras de contratação." }],
    evidencias: [
      evidencia("ev-alfa-1", "alfa", "Operação 24 horas demonstrativa", "Registro fictício de funcionamento contínuo.", "ALTA"),
      evidencia("ev-alfa-2", "alfa", "Porte demonstrativo", "Classificação fictícia de grande porte para testar o índice.", "MEDIA"),
    ],
    acao: { titulo: "Validar demanda fora do horário comercial", descricao: "Confirmar jornadas críticas, volume potencial e área responsável antes de propor um piloto." },
    fatoresIndice: { potencialDeslocamento: 0.3, potencialVisitantes: 1, facilidadeAcessoDecisor: 0.7, qualidadeEvidencias: 0.8 },
  },
  {
    id: "inst-hospital-modelo-sul",
    slug: "hospital-modelo-sul",
    nome: "Hospital Modelo Sul",
    grupo: { id: "grupo-horizonte-demo", nome: "Grupo Horizonte Demonstração" },
    tipo: { id: "tipo-hospital-especializado", nome: "Hospital especializado" },
    descricao: "Instituição fictícia com duas unidades, criada para demonstrar dispersão geográfica e potencial de deslocamento interno.",
    operacao24h: true,
    porte: "MEDIO",
    perfilCorporativo: true,
    tipoDado: "DEMONSTRACAO",
    unidades: [
      { id: "un-sul-1", nome: "Unidade Curitiba Modelo", operacao24h: true, endereco: { logradouro: "Avenida Sul Exemplo", numero: "20", bairro: "Setor Modelo", municipio: "Curitiba", uf: "PR" } },
      { id: "un-sul-2", nome: "Unidade Metropolitana Modelo", operacao24h: false, endereco: { logradouro: "Rua Metropolitana Demonstração", numero: "21", bairro: "Bairro Exemplo", municipio: "São José dos Pinhais", uf: "PR" } },
    ],
    servicos: ["Internação especializada", "Exames"],
    sinaisExpansao: [],
    necessidades: [{ titulo: "Conexão metropolitana", descricao: "Hipótese de deslocamento entre as duas unidades fictícias." }],
    areasDecisoras: [{ nome: "Operações", justificativa: "Possível responsável por fluxos entre unidades." }],
    evidencias: [evidencia("ev-sul-1", "sul", "Duas unidades demonstrativas", "Cadastro fictício contém duas unidades em municípios distintos.", "MEDIA")],
    acao: { titulo: "Investigar fluxo entre unidades", descricao: "Levantar horários, perfis de passageiros e recorrência antes de formular proposta." },
    fatoresIndice: { potencialDeslocamento: 0.8, potencialVisitantes: 0.6, facilidadeAcessoDecisor: 0.6, qualidadeEvidencias: 0.6 },
  },
  {
    id: "inst-centro-diagnostico",
    slug: "centro-diagnostico-modelo",
    nome: "Centro Diagnóstico Modelo",
    tipo: { id: "tipo-centro-diagnostico", nome: "Centro de diagnóstico" },
    descricao: "Centro diagnóstico fictício de funcionamento diurno, usado para validar uma prioridade moderada.",
    operacao24h: false,
    porte: "MEDIO",
    perfilCorporativo: true,
    tipoDado: "DEMONSTRACAO",
    unidades: [{ id: "un-diag-1", nome: "Unidade Diagnóstica Modelo", operacao24h: false, endereco: { logradouro: "Rua Diagnóstico Exemplo", numero: "30", bairro: "Centro Modelo", municipio: "Rio de Janeiro", uf: "RJ" } }],
    servicos: ["Imagem", "Análises clínicas"],
    sinaisExpansao: [{ id: "exp-diag-1", titulo: "Ampliação de horário em estudo", descricao: "Hipótese fictícia ainda pendente de revisão.", dataReferencia: "2026-08-15T12:00:00.000Z", evidenciaIds: ["ev-diag-1"] }],
    necessidades: [{ titulo: "Recepção programada", descricao: "Hipótese de mobilidade para exames agendados e fornecedores." }],
    areasDecisoras: [{ nome: "Administrativo", justificativa: "Possível porta de entrada para validação da hipótese." }],
    evidencias: [evidencia("ev-diag-1", "diag", "Ampliação demonstrativa em estudo", "Sinal fictício pendente de revisão.", "BAIXA", "PENDENTE")],
    acao: { titulo: "Reforçar evidência antes do contato", descricao: "Revisar o sinal de ampliação e buscar confirmação antes de priorizar uma abordagem." },
    fatoresIndice: { potencialDeslocamento: 0.2, potencialVisitantes: 0.6, facilidadeAcessoDecisor: 0.8, qualidadeEvidencias: 0.1 },
  },
  {
    id: "inst-instituto-clinico",
    slug: "instituto-clinico-demonstracao",
    nome: "Instituto Clínico Demonstração",
    tipo: { id: "tipo-clinica", nome: "Clínica especializada" },
    descricao: "Instituto clínico fictício de pequeno porte, criado para testar baixa prioridade e insuficiência de evidências.",
    operacao24h: false,
    porte: "PEQUENO",
    perfilCorporativo: false,
    tipoDado: "DEMONSTRACAO",
    unidades: [{ id: "un-clinico-1", nome: "Unidade Clínica Demonstração", operacao24h: false, endereco: { logradouro: "Travessa Clínica Modelo", numero: "40", bairro: "Vila Demonstração", municipio: "Recife", uf: "PE" } }],
    servicos: ["Consultas agendadas"],
    sinaisExpansao: [],
    necessidades: [{ titulo: "Necessidade a validar", descricao: "Não há evidência suficiente para caracterizar uma necessidade de mobilidade." }],
    areasDecisoras: [{ nome: "Administração", justificativa: "Hipótese genérica que não deve orientar contato sem validação." }],
    evidencias: [evidencia("ev-clinico-1", "clinico", "Cadastro mínimo demonstrativo", "Registro fictício contém apenas informações básicas.", "BAIXA", "PENDENTE")],
    acao: { titulo: "Não abordar antes de validar", descricao: "Buscar evidências mínimas confiáveis sobre porte, operação e necessidade antes de qualquer contato." },
    fatoresIndice: { potencialDeslocamento: 0.1, potencialVisitantes: 0.2, facilidadeAcessoDecisor: 0.4, qualidadeEvidencias: 0 },
  },
];
