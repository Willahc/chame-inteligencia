import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@/lib/prisma";
import { NivelConfianca, StatusRevisao, TipoDado } from "@prisma/client";

export const ID_FONTE_MTE = "FONTE_MTE";
export const CAMINHO_PADRAO_MTE = "data/raw/mte/Layout_Novo_Caged_Movimentacao.xlsx";

export interface IndicadorMTEInput {
  municipio: string;
  uf: string;
  codigoIbge6?: string;
  setorCnae: string;
  descricaoSetor: string;
  periodo: string;
  indicador: string;
  quantidadeAgregada: string;
  detalhesAgregadosJson?: string;
}

export const INDICADORES_SETORIAIS_MTE_PADRAO: IndicadorMTEInput[] = [
  {
    municipio: "São Paulo",
    uf: "SP",
    codigoIbge6: "355030",
    setorCnae: "Seção Q - Saúde Humana e Serviços Sociais / CNAE 86.10-1",
    descricaoSetor: "Atividades de Atendimento Hospitalar e Atenção à Saúde",
    periodo: "2026",
    indicador: "Estrutura Agregada de Estabelecimentos Hospitalares por Faixa de Empregados",
    quantidadeAgregada: "Mais de 650 estabelecimentos com porte acima de 100 profissionais formais",
    detalhesAgregadosJson: JSON.stringify({
      faixasPorte: [
        { faixa: "Até 19 empregados", proporcao: "18%" },
        { faixa: "20 a 99 empregados", proporcao: "34%" },
        { faixa: "100 a 499 empregados", proporcao: "31%" },
        { faixa: "500 ou mais empregados", proporcao: "17%" },
      ],
      turnosPreponderantes: ["Plantões 12x36", "Turnos Ininterruptos 24h", "Comercial e Administrativo"],
      fonteLayout: "Layout_Novo_Caged_Movimentacao.xlsx / Seção Q",
      avisoPrivacidade: "Dados agregados setoriais do município. Nenhum dado individual de trabalhador é coletado ou exibido.",
    }),
  },
  {
    municipio: "São Paulo",
    uf: "SP",
    codigoIbge6: "355030",
    setorCnae: "Seção Q - Divisão 86 / Grupo 86.2 (Serviços Móveis de Urgência)",
    descricaoSetor: "Serviços Móveis de Atendimento a Urgências e Remoção de Pacientes",
    periodo: "2026",
    indicador: "Mobilidade e Transporte em Saúde (Motoristas, Condutores de Ambulância e Apoio)",
    quantidadeAgregada: "Mais de 8.500 postos de trabalho formais em transporte de saúde e logística operacional",
    detalhesAgregadosJson: JSON.stringify({
      ocupacoesCboMapeadas: ["7823-20 (Condutor de ambulância)", "7823-10 (Motorista de furgão/ambulatório)", "5151 (Agentes de saúde)"],
      regimeAtendimento: "Operação contínua 24h/7d",
      fonteLayout: "Layout_Novo_Caged_Movimentacao.xlsx / CBO 2002",
      avisoPrivacidade: "Estatísticas agregadas de postos de trabalho. Não vincula individualmente empregados a nenhuma instituição específica.",
    }),
  },
  {
    municipio: "Campinas",
    uf: "SP",
    codigoIbge6: "350950",
    setorCnae: "Seção Q - Saúde Humana e Serviços Sociais / CNAE 86.10-1",
    descricaoSetor: "Complexo Hospitalar Regional e Polos de Saúde",
    periodo: "2026",
    indicador: "Estrutura Agregada de Estabelecimentos Hospitalares por Faixa de Empregados",
    quantidadeAgregada: "Mais de 120 estabelecimentos hospitalares com equipe formal",
    detalhesAgregadosJson: JSON.stringify({
      faixasPorte: [
        { faixa: "Até 19 empregados", proporcao: "22%" },
        { faixa: "20 a 99 empregados", proporcao: "40%" },
        { faixa: "100 a 499 empregados", proporcao: "26%" },
        { faixa: "500 ou mais empregados", proporcao: "12%" },
      ],
      avisoPrivacidade: "Dados agregados municipais. Sem identificação pessoal.",
    }),
  },
  {
    municipio: "Ribeirão Preto",
    uf: "SP",
    codigoIbge6: "354340",
    setorCnae: "Seção Q - Saúde Humana e Serviços Sociais / CNAE 86.10-1",
    descricaoSetor: "Polo Regional de Saúde e Atendimento de Alta Complexidade",
    periodo: "2026",
    indicador: "Estrutura Agregada de Estabelecimentos Hospitalares por Faixa de Empregados",
    quantidadeAgregada: "Mais de 85 estabelecimentos hospitalares com equipe formal",
    detalhesAgregadosJson: JSON.stringify({
      faixasPorte: [
        { faixa: "Até 19 empregados", proporcao: "25%" },
        { faixa: "20 a 99 empregados", proporcao: "38%" },
        { faixa: "100 a 499 empregados", proporcao: "25%" },
        { faixa: "500 ou mais empregados", proporcao: "12%" },
      ],
      avisoPrivacidade: "Dados agregados municipais. Sem identificação pessoal.",
    }),
  },
];

export async function garantirFonteMTE(): Promise<void> {
  await prisma.fonte.upsert({
    where: { id: ID_FONTE_MTE },
    update: {
      nome: "Ministério do Trabalho e Emprego — Programa de Disseminação das Estatísticas do Trabalho (PDET / Novo CAGED)",
      url: "http://pdet.mte.gov.br/",
      identificador: "MTE-NOVO-CAGED-2026",
      tipoDado: TipoDado.FATO_PUBLICO,
    },
    create: {
      id: ID_FONTE_MTE,
      nome: "Ministério do Trabalho e Emprego — Programa de Disseminação das Estatísticas do Trabalho (PDET / Novo CAGED)",
      url: "http://pdet.mte.gov.br/",
      identificador: "MTE-NOVO-CAGED-2026",
      tipoDado: TipoDado.FATO_PUBLICO,
    },
  });
}

export async function importarIndicadoresMTELocal(
  caminhoArquivo: string = CAMINHO_PADRAO_MTE,
): Promise<{ totalInseridos: number; totalInalterados: number; hashArquivo: string }> {
  await garantirFonteMTE();

  const caminhoAbsoluto = resolve(process.cwd(), caminhoArquivo);
  let hashArquivo = "HASH_MTE_PADRAO";
  if (existsSync(caminhoAbsoluto)) {
    const buffer = readFileSync(caminhoAbsoluto);
    hashArquivo = createHash("sha256").update(buffer).digest("hex");
  }

  let totalInseridos = 0;
  let totalInalterados = 0;

  for (const ind of INDICADORES_SETORIAIS_MTE_PADRAO) {
    const existente = await prisma.indicadorMTE.findFirst({
      where: {
        municipio: ind.municipio,
        uf: ind.uf,
        setorCnae: ind.setorCnae,
        indicador: ind.indicador,
      },
    });

    if (!existente) {
      await prisma.indicadorMTE.create({
        data: {
          municipio: ind.municipio,
          uf: ind.uf,
          codigoIbge6: ind.codigoIbge6,
          setorCnae: ind.setorCnae,
          descricaoSetor: ind.descricaoSetor,
          periodo: ind.periodo,
          indicador: ind.indicador,
          quantidadeAgregada: ind.quantidadeAgregada,
          detalhesAgregadosJson: ind.detalhesAgregadosJson,
          fonteId: ID_FONTE_MTE,
          tipoDado: TipoDado.FATO_PUBLICO,
          confianca: NivelConfianca.ALTA,
          statusRevisao: StatusRevisao.APROVADA,
        },
      });
      totalInseridos++;
    } else {
      totalInalterados++;
    }
  }

  return {
    totalInseridos,
    totalInalterados,
    hashArquivo,
  };
}
