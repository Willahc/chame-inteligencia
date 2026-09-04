import type { OrigemPublica } from "./contratos";

export const FONTES_PLANEJADAS: Array<{ origem: OrigemPublica; finalidade: string; ativa: false }> = [
  { origem: "CNES_DATASUS", finalidade: "Estabelecimentos e serviços de saúde", ativa: false },
  { origem: "RECEITA_CNPJ", finalidade: "Identidade e situação cadastral de pessoas jurídicas", ativa: false },
  { origem: "ANS", finalidade: "Relações públicas com o setor de saúde suplementar", ativa: false },
  { origem: "SITE_INSTITUCIONAL", finalidade: "Informações institucionais publicadas", ativa: false },
  { origem: "EVENTO_SAUDE", finalidade: "Sinais públicos de presença e expansão no setor", ativa: false },
  { origem: "DADO_GEOGRAFICO", finalidade: "Normalização e análise territorial pública", ativa: false },
];

// Nenhum conector realiza chamadas neste Gate. A ativação futura exige autorização,
// termos de uso revisados, limitação de volume e registro completo de proveniência.
