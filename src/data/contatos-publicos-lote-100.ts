/**
 * Manifesto versionado de contatos reproduzidos em fontes profissionais públicas.
 * Campos de e-mail e telefone não são declarados: só entram após comprovação explícita.
 */
export const VERSAO_MANIFESTO_CONTATOS = "100.0.0";
export const DATA_COLETA_MANIFESTO = "2026-09-05T00:00:00.000Z";

export interface ContatoPublicoManifesto {
  id: string;
  nome: string;
  cargo: string;
  area: string;
  empresa: string;
  urlPublica: string;
  grupoEconomicoId: string;
  papelComercial: string;
  observacao: string;
  fonte: { id: string; nome: string; url: string };
}

export const CONTATOS_PUBLICOS_LOTE_100: readonly ContatoPublicoManifesto[] = [
  {
    id: "contato-fleury-clovis-porto",
    nome: "Clóvis Porto",
    cargo: "Gerente sênior",
    area: "Facilities",
    empresa: "FLEURY S A",
    urlPublica: "https://pt.linkedin.com/posts/grupo-fleury_fm-entrevista-fm-edmar-cioletti-e-cl%C3%B3vis-activity-6488395072973864960-X2UZ",
    grupoEconomicoId: "org-e8caa657",
    papelComercial: "Influenciador estratégico",
    observacao: "Publicação pública do Grupo Fleury identifica o profissional como gerente sênior de Facilities. Diretor, expansão, e-mail e telefone não foram confirmados.",
    fonte: { id: "fonte-publica-linkedin-grupo-fleury-clovis-2026", nome: "Publicação pública do Grupo Fleury no LinkedIn", url: "https://pt.linkedin.com/posts/grupo-fleury_fm-entrevista-fm-edmar-cioletti-e-cl%C3%B3vis-activity-6488395072973864960-X2UZ" },
  },
  {
    id: "contato-fleury-andreia-r",
    nome: "Andréia R.",
    cargo: "Profissional de Compras",
    area: "Strategic Sourcing",
    empresa: "FLEURY S A",
    urlPublica: "https://br.linkedin.com/in/andreiarochadasilva",
    grupoEconomicoId: "org-e8caa657",
    papelComercial: "Compras",
    observacao: "O perfil público exibe o nome abreviado e o título Profissional de Compras | Strategic Sourcing. Nome completo, e-mail e telefone não foram inferidos.",
    fonte: { id: "fonte-publica-linkedin-andreia-r-fleury-2026", nome: "Perfil público de Andréia R. no LinkedIn", url: "https://br.linkedin.com/in/andreiarochadasilva" },
  },
  {
    id: "contato-sirio-matheus-martins",
    nome: "Matheus Martins dos Anjos",
    cargo: "Comprador sênior",
    area: "Compras",
    empresa: "SOCIEDADE BENEFICENTE DE SENHORAS HOSPITAL SIRIO LIBANES",
    urlPublica: "https://br.linkedin.com/in/matheus-martins-dos-anjos-191ab8150",
    grupoEconomicoId: "org-627ee072",
    papelComercial: "Compras",
    observacao: "Perfil público associado ao Hospital Sírio-Libanês e à função de comprador sênior. E-mail e telefone não foram confirmados.",
    fonte: { id: "fonte-publica-contato-sirio-matheus-martins", nome: "Perfil público de Matheus Martins dos Anjos no LinkedIn", url: "https://br.linkedin.com/in/matheus-martins-dos-anjos-191ab8150" },
  },
  {
    id: "contato-sirio-eduardo-ambrosio",
    nome: "Eduardo Ambrósio",
    cargo: "Profissional de compras",
    area: "Compras e Facilities",
    empresa: "SOCIEDADE BENEFICENTE DE SENHORAS HOSPITAL SIRIO LIBANES",
    urlPublica: "https://br.linkedin.com/in/eduardo-ambrosio-7209619",
    grupoEconomicoId: "org-627ee072",
    papelComercial: "Compras e Facilities",
    observacao: "Perfil público associado ao Hospital Sírio-Libanês e a processos de compras, obras, manutenção, serviços e facilities. E-mail e telefone não foram confirmados.",
    fonte: { id: "fonte-publica-contato-sirio-eduardo-ambrosio", nome: "Perfil público de Eduardo Ambrósio no LinkedIn", url: "https://br.linkedin.com/in/eduardo-ambrosio-7209619" },
  },
  {
    id: "contato-sirio-thiago-otoni",
    nome: "Thiago Otoni",
    cargo: "Coordenador de Compras",
    area: "Compras",
    empresa: "SOCIEDADE BENEFICENTE DE SENHORAS HOSPITAL SIRIO LIBANES",
    urlPublica: "https://br.linkedin.com/in/thiago-otoni-98873364",
    grupoEconomicoId: "org-627ee072",
    papelComercial: "Compras",
    observacao: "Perfil público identifica coordenação de Compras no Hospital Sírio-Libanês. E-mail e telefone não foram confirmados.",
    fonte: { id: "fonte-publica-contato-sirio-thiago-otoni", nome: "Perfil público de Thiago Otoni no LinkedIn", url: "https://br.linkedin.com/in/thiago-otoni-98873364" },
  },
  {
    id: "contato-rededor-rafael-almeida",
    nome: "Rafael Almeida",
    cargo: "Profissional de Gestão de Compras",
    area: "Compras",
    empresa: "REDE DOR SAO LUIZ S A",
    urlPublica: "https://br.linkedin.com/in/rafael-almeida-1641a168",
    grupoEconomicoId: "org-d753d961",
    papelComercial: "Compras",
    observacao: "Perfil público associado à Rede D’Or São Luiz e a atividades de gestão de compras. E-mail e telefone não foram confirmados.",
    fonte: { id: "fonte-publica-contato-rededor-rafael-almeida", nome: "Perfil público de Rafael Almeida no LinkedIn", url: "https://br.linkedin.com/in/rafael-almeida-1641a168" },
  },
  {
    id: "contato-cema-domenico-forte",
    nome: "Domenico Rodolfo Forte",
    cargo: "Gestor administrativo e operacional",
    area: "Facilities e Operações",
    empresa: "CEMA HOSPITAL ESPECIALIZADO LIMITADA",
    urlPublica: "https://br.linkedin.com/in/domenico-rodolfo-forte-a40b866a",
    grupoEconomicoId: "org-22379759",
    papelComercial: "Operações e Facilities",
    observacao: "Perfil público associado ao CEMA Hospital Especializado, com experiência em gestão administrativa, operacional e facilities. E-mail e telefone não foram confirmados.",
    fonte: { id: "fonte-publica-contato-cema-domenico-forte", nome: "Perfil público de Domenico Rodolfo Forte no LinkedIn", url: "https://br.linkedin.com/in/domenico-rodolfo-forte-a40b866a" },
  },
  {
    id: "contato-santacatarina-evelin-rodrigues",
    nome: "Evelin Rodrigues",
    cargo: "Profissional de Compras",
    area: "Compras",
    empresa: "ASSOCIACAO CONGREGACAO DESANTA CATARINA",
    urlPublica: "https://br.linkedin.com/in/evelin-rodrigues-5b94931b5",
    grupoEconomicoId: "org-isol-inst-cnes-2688603",
    papelComercial: "Compras",
    observacao: "Perfil público associado ao Hospital Santa Catarina - Paulista e à área de compras. E-mail e telefone não foram confirmados.",
    fonte: { id: "fonte-publica-contato-santacatarina-evelin-rodrigues", nome: "Perfil público de Evelin Rodrigues no LinkedIn", url: "https://br.linkedin.com/in/evelin-rodrigues-5b94931b5" },
  },
];
