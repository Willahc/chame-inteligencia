import fs from "node:fs";
import path from "node:path";
import type {
  FaixaPrioridade,
  InstituicaoRadar,
  NivelConfianca,
  TipoDado,
} from "@/domain/tipos";
import type {
  ContaComercialCompleta,
  ContaComercialResumo,
  InstituicaoCompleta,
  OrganizacaoCompleta,
} from "./dados";
import { carregarPolosCorporativos5km, type PoloCorporativo5km } from "./ecossistema-unificado";

type AbordagemPoloPersistida = {
  id: string;
  contaComercialId: string;
  data: string;
  resultado:
    | "NAO_ABORDADA"
    | "ABORDADA"
    | "EM_ANALISE"
    | "REUNIAO"
    | "PROPOSTA"
    | "CONTRATO"
    | "DESCARTADA"
    | "AGUARDANDO_DADOS";
  usuarioResponsavel: string | null;
  observacao: string;
  proximaAcao: string | null;
  fonteOuEvidencia: string | null;
  tipoDado: TipoDado;
};

function caminhoArquivoAbordagensPolos(): string {
  const dir = path.resolve(process.cwd(), "data", "processed");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, "abordagens_polos_5km.json");
}

function lerAbordagensPolos(): AbordagemPoloPersistida[] {
  const arq = caminhoArquivoAbordagensPolos();
  if (!fs.existsSync(arq)) return [];
  try {
    return JSON.parse(fs.readFileSync(arq, "utf8")) as AbordagemPoloPersistida[];
  } catch {
    return [];
  }
}

export function salvarAbordagemPolo5km(entrada: {
  contaComercialId: string;
  resultado: AbordagemPoloPersistida["resultado"];
  usuarioResponsavel?: string;
  observacao: string;
  proximaAcao?: string;
  fonteOuEvidencia?: string;
  tipoDado?: TipoDado;
}) {
  const lista = lerAbordagensPolos();
  const novo: AbordagemPoloPersistida = {
    id: `reg-abordagem-polo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    contaComercialId: entrada.contaComercialId,
    data: new Date().toISOString(),
    resultado: entrada.resultado,
    usuarioResponsavel: entrada.usuarioResponsavel?.trim() || null,
    observacao: entrada.observacao.trim(),
    proximaAcao: entrada.proximaAcao?.trim() || null,
    fonteOuEvidencia: entrada.fonteOuEvidencia?.trim() || null,
    tipoDado: entrada.tipoDado ?? "FATO_PUBLICO",
  };
  lista.unshift(novo);
  fs.writeFileSync(caminhoArquivoAbordagensPolos(), JSON.stringify(lista, null, 2), "utf8");
  return {
    ...novo,
    data: new Date(novo.data),
    criadoEm: new Date(novo.data),
  };
}

export function normalizarNomeCliente(nome: string): string {
  return (nome || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\b(SA|S A|LTDA|HOSPITAL|UNIDADE|INSTITUTO|REDE|GRUPO|CLINICA|CENTRO|MEDICO)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function idContaDePolo(polo: PoloCorporativo5km): string {
  return `conta-polo-${polo.id.toLowerCase()}`;
}

export function idGrupoDePolo(polo: PoloCorporativo5km): string {
  return `grupo-polo-${polo.id.toLowerCase()}`;
}

export function slugInstituicaoDePolo(polo: PoloCorporativo5km): string {
  return `polo-5km-${polo.id.toLowerCase()}`;
}

function faixaDeScore(score: number): FaixaPrioridade {
  if (score >= 80) return "MUITO_ALTA";
  if (score >= 60) return "ALTA";
  if (score >= 40) return "MODERADA";
  return "BAIXA";
}

function contarContatosPolo(): number {
  return 1;
}

function construirContatosDePolo(polo: PoloCorporativo5km) {
  const grupoId = idGrupoDePolo(polo);
  const instId = `inst-polo-${polo.id.toLowerCase()}`;
  const dataRef = new Date("2026-09-29T12:00:00Z");
  const fonte = {
    id: `fonte-polo-${polo.id.toLowerCase()}`,
    nome:
      polo.categoria === "EMPRESA_CORPORATIVA"
        ? "Mapeamento B2B Empresas Corporativas (Raio 5 km DTP/OSM)"
        : "Mapeamento B2B Polos de Saúde (Raio 5 km CNES/DTP/OSM)",
    url: polo.linkLinkedin || polo.linkGoogle || "https://dados.prefeitura.sp.gov.br",
    identificador: polo.id,
    tipoDado: "FATO_PUBLICO" as const,
  };

  const contatos = [
    {
      id: `contato-canal-${polo.id.toLowerCase()}`,
      nome:
        polo.liderancasMapeadas && polo.liderancasMapeadas !== "—" && !polo.liderancasMapeadas.startsWith("Mapear")
          ? polo.liderancasMapeadas
          : `Mesa Corporativa — ${polo.areaDecisora}`,
      cargo: polo.cargosDecisores || `Gestão de ${polo.areaDecisora}`,
      area: polo.areaDecisora || "Facilities / Compras / RH",
      empresa: polo.nome,
      linkedinUrl: polo.linkLinkedin || null,
      paginaProfissionalUrl: polo.linkGoogle || null,
      emailCorporativo: polo.emailCompras && polo.emailCompras !== "—" ? polo.emailCompras : null,
      telefoneProfissional: polo.telefone && polo.telefone !== "—" ? polo.telefone : null,
      ramal: null,
      telefoneDepartamental: polo.telefone && polo.telefone !== "—" ? polo.telefone : null,
      senioridade: "DECISOR",
      papelComercial: `Decisor / Canal Oficial (${polo.areaDecisora})`,
      indiceQualidade: 90,
      justificativaQualidade: `Canal institucional e decisores mapeados no raio de ${polo.distanciaKm} km (${polo.pontoMaisProximo}). Domínio: ${polo.dominioEmail || "N/D"}`,
      tipoPapelComercial: "INFERENCIA" as const,
      tipoDado: "FATO_PUBLICO" as const,
      confianca: "ALTA" as const,
      statusRevisao: "APROVADA" as const,
      ativo: true,
      linkedinSimulado: false,
      fonteId: fonte.id,
      dataEvidencia: dataRef,
      observacao: `Canal recomendado: ${polo.canalRecomendado}. Ponto de táxi mais próximo: ${polo.pontoMaisProximo} (${polo.distanciaKm} km / ~${polo.tempoMin} min).`,
      criadoEm: dataRef,
      atualizadoEm: dataRef,
      grupoEconomicoId: grupoId,
      instituicaoId: instId,
      escopoContato: "ORGANIZACAO" as const,
      statusDecisao: "APROVADO" as const,
      fonte,
    },
  ];

  return contatos;
}

export function mesclarContasComerciaisUnificadas(
  contasCnes: ContaComercialResumo[],
): ContaComercialResumo[] {
  const polos = carregarPolosCorporativos5km();
  if (polos.length === 0) return contasCnes;

  const abordagensPolos = lerAbordagensPolos();
  const mapaAbordagemRecente = new Map<string, AbordagemPoloPersistida["resultado"]>();
  for (const ab of abordagensPolos) {
    if (!mapaAbordagemRecente.has(ab.contaComercialId)) {
      mapaAbordagemRecente.set(ab.contaComercialId, ab.resultado);
    }
  }

  // Indexar contas CNES por nome normalizado para enriquecer grupos já existentes sem duplicar
  const mapaNomeCnes = new Map<string, ContaComercialResumo>();
  const contasEnriquecidas = contasCnes.map((c) => {
    const copia = {
      ...c,
      quantidadeContatos: Math.min(1, c.quantidadeContatos),
    };
    const chave = normalizarNomeCliente(c.nome);
    if (chave.length >= 4) {
      mapaNomeCnes.set(chave, copia);
    }
    return copia;
  });

  const novasContasPolos: ContaComercialResumo[] = [];

  for (const polo of polos) {
    const chaveGrupo = normalizarNomeCliente(polo.grupoOuRazao);
    const chaveNome = normalizarNomeCliente(polo.nome);
    const matchCnes =
      (chaveGrupo.length >= 4 ? mapaNomeCnes.get(chaveGrupo) : undefined) ??
      (chaveNome.length >= 4 ? mapaNomeCnes.get(chaveNome) : undefined);

    if (matchCnes) {
      const ctPolo = construirContatosDePolo(polo)[0]!;
      matchCnes.indicePrioridadeComercial = Math.max(
        matchCnes.indicePrioridadeComercial,
        polo.score,
      );
      matchCnes.faixaPrioridadeComercial = faixaDeScore(matchCnes.indicePrioridadeComercial);
      matchCnes.quantidadeContatos = 1;
      if (!matchCnes.contatoPrincipal) {
        matchCnes.contatoPrincipal = {
          id: ctPolo.id,
          nome: ctPolo.nome,
          cargo: ctPolo.cargo,
          emailCorporativo: ctPolo.emailCorporativo,
          telefoneProfissional: ctPolo.telefoneProfissional,
        };
      }
      matchCnes.acaoRecomendada = "ABORDAR_IMEDIATAMENTE";
      matchCnes.justificativaAcao = `[Polo 5 km · ${polo.distanciaKm} km · Ponto próx.: ${polo.pontoMaisProximo}] ${polo.estrategiaAbordagem}`;
      continue;
    }

    const idConta = idContaDePolo(polo);
    const ehPublico =
      polo.grupoOuRazao.toUpperCase().includes("USP") ||
      polo.grupoOuRazao.toUpperCase().includes("ESTADUAL") ||
      polo.grupoOuRazao.toUpperCase().includes("MUNICIPAL") ||
      polo.grupoOuRazao.toUpperCase().includes("PÚBLICO") ||
      polo.grupoOuRazao.toUpperCase().includes("PUBLICO");

    const segmento =
      polo.categoria === "EMPRESA_CORPORATIVA"
        ? ("POLO_CORPORATIVO_B2B_5KM" as unknown as "SAUDE_CORPORATIVA_EXPANDIDA")
        : "NUCLEO_HOSPITALAR";

    const contatoUnico = construirContatosDePolo(polo)[0]!;

    novasContasPolos.push({
      id: idConta,
      nome:
        polo.categoria === "EMPRESA_CORPORATIVA"
          ? `${polo.grupoOuRazao || polo.nome} [Grupo Corporativo · ${polo.tipoOuSetor}]`
          : `${polo.grupoOuRazao || polo.nome} [Grupo Saúde 5 km]`,
      tipoDado: "FATO_OFICIAL",
      grupoEconomicoId: idGrupoDePolo(polo),
      natureza: ehPublico ? "PUBLICO" : "PRIVADO",
      quantidadeUnidades: 1,
      quantidadeHospitais: polo.categoria === "HOSPITAL_SAUDE" ? 1 : 0,
      quantidadeContatos: 1,
      cidades: JSON.stringify([`São Paulo (${polo.bairro})`]),
      cnpjPrincipal: polo.dominioEmail && polo.dominioEmail !== "—" ? `DOMÍNIO: ${polo.dominioEmail}` : "MATRIZ CORPORATIVA",
      tipoVinculo: "OFICIAL",
      confiancaOrganizacional: "ALTA",
      coberturaDados: 100,
      statusRevisao: "APROVADO",
      indicePrioridadeComercial: polo.score,
      faixaPrioridadeComercial: faixaDeScore(polo.score),
      acaoRecomendada: "ABORDAR_IMEDIATAMENTE",
      justificativaAcao: `[Raio 5 km (${polo.distanciaKm} km) · Ponto próx.: ${polo.pontoMaisProximo} · Potencial: ${polo.corridasEstimadasMes}] ${polo.estrategiaAbordagem}`,
      resultadoAbordagem: mapaAbordagemRecente.get(idConta) ?? "NAO_ABORDADA",
      contatoPrincipal: {
        id: contatoUnico.id,
        nome: contatoUnico.nome,
        cargo: contatoUnico.cargo,
        emailCorporativo: contatoUnico.emailCorporativo,
        telefoneProfissional: contatoUnico.telefoneProfissional,
      },
      grupoEconomico: {
        instituicoes: [
          {
            segmentacao: {
              segmento,
            },
          },
        ],
      },
    });
  }

  return [...novasContasPolos, ...contasEnriquecidas].sort(
    (a, b) =>
      b.indicePrioridadeComercial - a.indicePrioridadeComercial ||
      b.quantidadeUnidades - a.quantidadeUnidades,
  );
}

export function obterContaComercialDePolo5km(id: string): ContaComercialCompleta | null {
  if (!id.startsWith("conta-polo-")) return null;
  const codigoPolo = id.replace("conta-polo-", "").toUpperCase();
  const polo = carregarPolosCorporativos5km().find((p) => p.id.toUpperCase() === codigoPolo);
  if (!polo) return null;

  const inst = construirInstituicaoCompletaDePolo(polo);
  const contatos = construirContatosDePolo(polo);
  const dataRef = new Date("2026-09-29T12:00:00Z");
  const abordagens = lerAbordagensPolos()
    .filter((a) => a.contaComercialId === id)
    .map((a) => ({
      ...a,
      data: new Date(a.data),
      criadoEm: new Date(a.data),
    }));

  const ehPublico =
    polo.grupoOuRazao.toUpperCase().includes("USP") ||
    polo.grupoOuRazao.toUpperCase().includes("ESTADUAL") ||
    polo.grupoOuRazao.toUpperCase().includes("MUNICIPAL");

  const componentesIndice = {
    versao: "1.0.0-B2B-5KM",
    totalPontos: polo.score,
    faixa: faixaDeScore(polo.score),
    dataCalculo: dataRef.toISOString(),
    componentes: [
      {
        criterio: "PROXIMIDADE_5KM_PONTO_DTP",
        rotulo: "Proximidade Geoespacial (Raio 5 km) e Ponto DTP",
        peso: 30,
        pontosObtidos: Math.round(polo.score * 0.3),
        justificativa: `Localizado a ${polo.distanciaKm} km (~${polo.tempoMin} min) com cobertura imediata pelo ${polo.pontoMaisProximo}.`,
      },
      {
        criterio: "POTENCIAL_VOUCHERS_CORRIDAS",
        rotulo: "Potencial de Corridas Mensais e Vouchers",
        peso: 25,
        pontosObtidos: Math.round(polo.score * 0.25),
        justificativa: `Estimativa de ${polo.corridasEstimadasMes} corridas/mês. Demanda de vouchers/turnos: ${polo.demandaVouchers}.`,
      },
      {
        criterio: "DEMANDA_ESG_ACESSIBILIDADE",
        rotulo: "Aderência a Frota Híbrida/Elétrica (ESG) e Acessível",
        peso: 20,
        pontosObtidos: Math.round(polo.score * 0.2),
        justificativa: `Demanda ESG/Elétrica: ${polo.demandaEsg}. Porte: ${polo.porteFaixa}.`,
      },
      {
        criterio: "CANAL_DECISOR_MAPEADO",
        rotulo: "Mapeamento de Área Decisora e Canal Corporativo",
        peso: 15,
        pontosObtidos: Math.round(polo.score * 0.15),
        justificativa: `Área decisora: ${polo.areaDecisora} (${polo.cargosDecisores}). E-mail/Domínio: ${polo.emailCompras || polo.dominioEmail}.`,
      },
      {
        criterio: "GARGALO_OPERACIONAL_ATUAL",
        rotulo: "Oportunidade de Substituição / Gargalo Atual",
        peso: 10,
        pontosObtidos: Math.max(
          0,
          polo.score -
            Math.round(polo.score * 0.3) -
            Math.round(polo.score * 0.25) -
            Math.round(polo.score * 0.2) -
            Math.round(polo.score * 0.15),
        ),
        justificativa: `Fornecedor atual provável: ${polo.fornecedorAtual}. Gargalo: ${polo.gargaloAtual}.`,
      },
    ],
  };

  return {
    id,
    nome: polo.nome,
    tipoDado: "FATO_OFICIAL",
    grupoEconomicoId: idGrupoDePolo(polo),
    natureza: ehPublico ? "PUBLICO" : "PRIVADO",
    naturezaPublicaOuPrivada: ehPublico ? "PUBLICO" : "PRIVADO",
    quantidadeUnidades: 1,
    quantidadeHospitais: polo.categoria === "HOSPITAL_SAUDE" ? 1 : 0,
    quantidadeContatos: contatos.length,
    cidades: JSON.stringify(["São Paulo"]),
    cnpjPrincipal: null,
    situacaoCadastral: "ATIVA",
    tipoVinculo: "OFICIAL",
    confiancaOrganizacional: "ALTA",
    coberturaDados: 100,
    statusRevisao: "APROVADO",
    indicePrioridadeComercial: polo.score,
    faixaPrioridadeComercial: faixaDeScore(polo.score),
    acaoRecomendada: "ABORDAR_IMEDIATAMENTE",
    justificativaAcao: `${polo.estrategiaAbordagem} | Pitch: ${polo.pitchComercial}`,
    componentesIndiceJson: JSON.stringify(componentesIndice),
    resultadoAbordagem: abordagens[0]?.resultado ?? "NAO_ABORDADA",
    criadoEm: dataRef,
    atualizadoEm: dataRef,
    grupoEconomico: {
      id: idGrupoDePolo(polo),
      nome: polo.grupoOuRazao || polo.nome,
      nomeNormalizado: normalizarNomeCliente(polo.grupoOuRazao || polo.nome),
      tipoDado: "FATO_OFICIAL",
      tipoVinculo: "OFICIAL",
      nivelConfianca: "ALTA",
      tipoEvidencia: "Cruzamento Geoespacial DTP/OSM + Base Corporativa B2B 5 km",
      regraAgrupamento: "POLO_B2B_5KM_UNIFICADO",
      versaoRegra: "2.1.0",
      statusRevisao: "APROVADO",
      dataCalculo: dataRef,
      observacao: `Distância da base: ${polo.distanciaKm} km (~${polo.tempoMin} min). Ponto de táxi mais próximo: ${polo.pontoMaisProximo}.`,
      natureza: ehPublico ? "PUBLICO" : "PRIVADO",
      instituicoes: [inst],
      contatos,
    },
    historicoAbordagem: abordagens,
  } as unknown as ContaComercialCompleta;
}

export function construirInstituicaoCompletaDePolo(
  polo: PoloCorporativo5km,
): InstituicaoCompleta {
  const instId = `inst-polo-${polo.id.toLowerCase()}`;
  const grupoId = idGrupoDePolo(polo);
  const slug = slugInstituicaoDePolo(polo);
  const dataRef = new Date("2026-09-29T12:00:00Z");
  const contatos = construirContatosDePolo(polo);
  const ehPublico =
    polo.grupoOuRazao.toUpperCase().includes("USP") ||
    polo.grupoOuRazao.toUpperCase().includes("ESTADUAL") ||
    polo.grupoOuRazao.toUpperCase().includes("MUNICIPAL");

  const fonte = contatos[0]!.fonte;

  const evidencias = [
    {
      id: `ev-geo-${polo.id.toLowerCase()}`,
      titulo: `Cruzamento Geoespacial 5 km — ${polo.pontoMaisProximo}`,
      descricao: `Localizado em ${polo.endereco} (${polo.bairro}), a ${polo.distanciaKm} km (~${polo.tempoMin} min). Coordenadas: ${polo.latitude}, ${polo.longitude}. Estimativa de ${polo.corridasEstimadasMes} corridas/mês.`,
      observacao: `Gargalo mapeado: ${polo.gargaloAtual}`,
      dataColeta: dataRef,
      dataReferencia: dataRef,
      tipo: "FATO_PUBLICO" as const,
      confianca: "ALTA" as const,
      statusRevisao: "APROVADA" as const,
      instituicaoId: instId,
      fonteId: fonte.id,
      loteId: null,
      origemCampo: "clientes_corporativos_5km.csv",
      fonte,
    },
    {
      id: `ev-pitch-${polo.id.toLowerCase()}`,
      titulo: `Estratégia B2B e Pitch Comercial (${polo.areaDecisora})`,
      descricao: `${polo.estrategiaAbordagem} — Proposta de Valor: ${polo.pitchComercial}`,
      observacao: `Fornecedor atual provável: ${polo.fornecedorAtual} | Canal: ${polo.canalRecomendado}`,
      dataColeta: dataRef,
      dataReferencia: dataRef,
      tipo: "INFERENCIA" as const,
      confianca: "ALTA" as const,
      statusRevisao: "APROVADA" as const,
      instituicaoId: instId,
      fonteId: fonte.id,
      loteId: null,
      origemCampo: "Proposta_Valor_Pitch",
      fonte,
    },
  ];

  const segmento =
    polo.categoria === "EMPRESA_CORPORATIVA"
      ? ("POLO_CORPORATIVO_B2B_5KM" as unknown as "SAUDE_CORPORATIVA_EXPANDIDA")
      : "NUCLEO_HOSPITALAR";

  return {
    id: instId,
    slug,
    nome: polo.nome,
    descricao: `${polo.tipoOuSetor} (${polo.porteFaixa}) no bairro ${polo.bairro}, a ${polo.distanciaKm} km da base operacional. Ponto de táxi mais próximo: ${polo.pontoMaisProximo}. ${polo.estrategiaAbordagem}`,
    operacao24h: polo.categoria === "HOSPITAL_SAUDE" || polo.demandaVouchers.toUpperCase().includes("ALTA"),
    porte: "GRANDE",
    perfilCorporativo: true,
    tipoDado: "FATO_OFICIAL",
    cnes: null,
    nomeOriginal: polo.grupoOuRazao || polo.nome,
    naturezaGestao: ehPublico ? "PUBLICO" : "PRIVADO",
    situacaoCadastral: "ATIVA",
    coberturaDados: 100,
    coberturaJustificativa: "Mapeamento georreferenciado completo (Raio 5 km + Ponto DTP + Decisores).",
    grupoEconomicoId: grupoId,
    tipoEstabelecimentoId: `tipo-${polo.categoria.toLowerCase()}`,
    grupoEconomico: {
      id: grupoId,
      nome: polo.grupoOuRazao || polo.nome,
      nomeNormalizado: normalizarNomeCliente(polo.grupoOuRazao || polo.nome),
      tipoDado: "FATO_OFICIAL",
      tipoVinculo: "OFICIAL",
      nivelConfianca: "ALTA",
      tipoEvidencia: "Cruzamento Geoespacial DTP/OSM + Base Corporativa B2B 5 km",
      regraAgrupamento: "POLO_B2B_5KM_UNIFICADO",
      versaoRegra: "2.1.0",
      statusRevisao: "APROVADO",
      dataCalculo: dataRef,
      observacao: `Ponto mais próximo: ${polo.pontoMaisProximo} (${polo.distanciaKm} km)`,
      natureza: ehPublico ? "PUBLICO" : "PRIVADO",
      _count: { instituicoes: 1 },
      contaComercial: {
        id: idContaDePolo(polo),
        nome: polo.nome,
        tipoDado: "FATO_OFICIAL",
        grupoEconomicoId: grupoId,
        natureza: ehPublico ? "PUBLICO" : "PRIVADO",
        naturezaPublicaOuPrivada: ehPublico ? "PUBLICO" : "PRIVADO",
        quantidadeUnidades: 1,
        quantidadeHospitais: polo.categoria === "HOSPITAL_SAUDE" ? 1 : 0,
        quantidadeContatos: contatos.length,
        cidades: JSON.stringify(["São Paulo"]),
        cnpjPrincipal: null,
        situacaoCadastral: "ATIVA",
        tipoVinculo: "OFICIAL",
        confiancaOrganizacional: "ALTA",
        coberturaDados: 100,
        statusRevisao: "APROVADO",
        indicePrioridadeComercial: polo.score,
        faixaPrioridadeComercial: faixaDeScore(polo.score),
        acaoRecomendada: "ABORDAR_IMEDIATAMENTE",
        justificativaAcao: polo.estrategiaAbordagem,
        componentesIndiceJson: null,
        resultadoAbordagem: "NAO_ABORDADA",
        criadoEm: dataRef,
        atualizadoEm: dataRef,
      },
      contatos,
    },
    tipoEstabelecimento: {
      id: `tipo-${polo.categoria.toLowerCase()}`,
      nome:
        polo.categoria === "EMPRESA_CORPORATIVA"
          ? `Empresa Corporativa (${polo.tipoOuSetor})`
          : polo.tipoOuSetor || "Hospital / Polo de Saúde",
    },
    unidades: [
      {
        id: `unid-polo-${polo.id.toLowerCase()}`,
        nome: `${polo.nome} (${polo.bairro})`,
        operacao24h: polo.categoria === "HOSPITAL_SAUDE",
        tipoDado: "FATO_OFICIAL",
        cnes: null,
        nomeOriginal: polo.nome,
        loteOrigemId: null,
        instituicaoId: instId,
        endereco: {
          id: `end-polo-${polo.id.toLowerCase()}`,
          logradouro: polo.endereco,
          numero: "S/N",
          bairro: `${polo.bairro} (${polo.distanciaKm} km · ${polo.pontoMaisProximo})`,
          municipio: "São Paulo",
          uf: "SP",
          tipoDado: "FATO_OFICIAL",
          unidadeId: `unid-polo-${polo.id.toLowerCase()}`,
        },
      },
    ],
    servicos: [
      {
        id: `srv-1-${polo.id.toLowerCase()}`,
        nome: `Potencial: ${polo.corridasEstimadasMes} corridas/mês`,
        descricao: polo.estrategiaAbordagem,
        tipoDado: "INFERENCIA",
        instituicaoId: instId,
      },
      {
        id: `srv-2-${polo.id.toLowerCase()}`,
        nome: `Ponto DTP: ${polo.pontoMaisProximo}`,
        descricao: `Distância de ${polo.distanciaKm} km (~${polo.tempoMin} min)`,
        tipoDado: "FATO_PUBLICO",
        instituicaoId: instId,
      },
      {
        id: `srv-3-${polo.id.toLowerCase()}`,
        nome: `Demanda ESG/Elétrica: ${polo.demandaEsg}`,
        descricao: `Demanda Vouchers/Turnos: ${polo.demandaVouchers}`,
        tipoDado: "INFERENCIA",
        instituicaoId: instId,
      },
    ],
    sinaisExpansao: [],
    necessidades: [
      {
        id: `nec-1-${polo.id.toLowerCase()}`,
        titulo: "Gargalo Operacional e Demanda de Vouchers B2B",
        descricao: `Gargalo atual: ${polo.gargaloAtual}. Fornecedor provável: ${polo.fornecedorAtual}. Demanda de vouchers: ${polo.demandaVouchers}.`,
        tipoDado: "INFERENCIA",
        instituicaoId: instId,
      },
      {
        id: `nec-2-${polo.id.toLowerCase()}`,
        titulo: "Atendimento Rápido via Ponto de Táxi Georreferenciado",
        descricao: `Cobertura direta a partir do ${polo.pontoMaisProximo} (${polo.distanciaKm} km / ${polo.tempoMin} min) com frota executiva/híbrida/acessível.`,
        tipoDado: "FATO_PUBLICO",
        instituicaoId: instId,
      },
    ],
    areasDecisoras: [
      {
        id: `area-1-${polo.id.toLowerCase()}`,
        nome: polo.areaDecisora || "Facilities / Compras / RH",
        justificativa: `Cargos-alvo: ${polo.cargosDecisores}. Canal recomendado: ${polo.canalRecomendado}. Pitch: ${polo.pitchComercial}`,
        tipoDado: "INFERENCIA",
        instituicaoId: instId,
      },
    ],
    evidencias,
    indice: {
      id: `idx-polo-${polo.id.toLowerCase()}`,
      total: polo.score,
      faixa: faixaDeScore(polo.score),
      versao: "1.0.0-B2B-5KM",
      calculadoEm: dataRef,
      instituicaoId: instId,
      componentes: [
        {
          id: `comp-1-${polo.id.toLowerCase()}`,
          criterio: "PROXIMIDADE_5KM_PONTO_DTP",
          rotulo: "Proximidade Geoespacial (Raio 5 km) e Ponto DTP",
          peso: 35,
          valorObtido: Math.round(polo.score * 0.35),
          disponivel: true,
          justificativa: `Situado a ${polo.distanciaKm} km (~${polo.tempoMin} min) com atendimento pelo ${polo.pontoMaisProximo}.`,
          indicePrioridadeId: `idx-polo-${polo.id.toLowerCase()}`,
          evidencias: [evidencias[0]!],
        },
        {
          id: `comp-2-${polo.id.toLowerCase()}`,
          criterio: "POTENCIAL_VOUCHERS_CORRIDAS",
          rotulo: "Potencial de Corridas Mensais e Turnos",
          peso: 35,
          valorObtido: Math.round(polo.score * 0.35),
          disponivel: true,
          justificativa: `Estimativa de ${polo.corridasEstimadasMes} corridas/mês (${polo.porteFaixa}).`,
          indicePrioridadeId: `idx-polo-${polo.id.toLowerCase()}`,
          evidencias: [evidencias[0]!],
        },
        {
          id: `comp-3-${polo.id.toLowerCase()}`,
          criterio: "ESTRATEGIA_CANAL_DECISOR",
          rotulo: "Mapeamento de Decisores, Canal B2B e Aderência ESG",
          peso: 30,
          valorObtido: Math.max(
            0,
            polo.score - Math.round(polo.score * 0.35) - Math.round(polo.score * 0.35),
          ),
          disponivel: true,
          justificativa: `Decisores mapeados em ${polo.areaDecisora} (${polo.emailCompras || polo.dominioEmail}).`,
          indicePrioridadeId: `idx-polo-${polo.id.toLowerCase()}`,
          evidencias: [evidencias[1]!],
        },
      ],
    },
    acoesComerciais: [
      {
        id: `acao-1-${polo.id.toLowerCase()}`,
        titulo: `Abordar ${polo.areaDecisora} (${polo.distanciaKm} km · ${polo.pontoMaisProximo})`,
        descricao: polo.estrategiaAbordagem,
        prioridade: 1,
        concluida: false,
        tipoDado: "INFERENCIA",
        instituicaoId: instId,
      },
    ],
    segmentacao: {
      id: `seg-polo-${polo.id.toLowerCase()}`,
      instituicaoId: instId,
      segmento,
      indiceAderencia: polo.score,
      faixaAderencia: "ALTA",
      regraAplicada:
        polo.categoria === "EMPRESA_CORPORATIVA"
          ? "POLO_CORPORATIVO_RAIO_5KM"
          : "POLO_SAUDE_RAIO_5KM",
      versaoRegra: "2.1.0",
      dataCalculo: dataRef,
      nivelConfianca: "ALTA",
      justificativa: `${polo.estrategiaAbordagem} Ponto DTP mais próximo: ${polo.pontoMaisProximo} (${polo.distanciaKm} km).`,
      componentesJson: "{}",
      statusRevisao: "APROVADO",
      criadoEm: dataRef,
      atualizadoEm: dataRef,
    },
    contatosProfissionais: contatos,
    sinaisContratacaoPublica: [],
  } as unknown as InstituicaoCompleta;
}

export function obterInstituicaoPorSlugDePolo5km(slug: string): InstituicaoCompleta | null {
  if (!slug.startsWith("polo-5km-")) return null;
  const codigo = slug.replace("polo-5km-", "").toUpperCase();
  const polo = carregarPolosCorporativos5km().find((p) => p.id.toUpperCase() === codigo);
  if (!polo) return null;
  return construirInstituicaoCompletaDePolo(polo);
}

export function mesclarRadarUnificado(radarCnes: InstituicaoRadar[]): InstituicaoRadar[] {
  const polos = carregarPolosCorporativos5km();

  // Consolidar estritamente 1 registro por Grupo Econômico no Radar (1 CNPJ, 1 contato, unidades somadas)
  const porGrupoCnes = new Map<string, InstituicaoRadar>();
  const mapaNomeGrupo = new Map<string, InstituicaoRadar>();

  for (const r of radarCnes) {
    const chaveGrupoId = r.organizacao?.id || normalizarNomeCliente(r.grupo || r.nome) || r.id;
    const existente = porGrupoCnes.get(chaveGrupoId);
    if (!existente) {
      const copia: InstituicaoRadar = {
        ...r,
        nome: r.organizacao && (r.organizacao.quantidadeUnidades ?? 1) > 1 ? r.organizacao.nome : r.nome,
        quantidadeUnidades: r.organizacao?.quantidadeUnidades || r.quantidadeUnidades || 1,
        quantidadeContatos: Math.min(1, r.quantidadeContatos ?? 0),
      };
      porGrupoCnes.set(chaveGrupoId, copia);
      const chaveNorm = normalizarNomeCliente(copia.grupo || copia.nome);
      if (chaveNorm.length >= 4) {
        mapaNomeGrupo.set(chaveNorm, copia);
      }
    } else {
      if (r.indice > existente.indice) {
        existente.indice = r.indice;
        existente.faixa = r.faixa;
        existente.principalMotivo = r.principalMotivo;
        existente.acaoRecomendada = r.acaoRecomendada;
      }
      existente.operacao24h = existente.operacao24h || r.operacao24h;
      existente.possuiExpansao = existente.possuiExpansao || r.possuiExpansao;
      existente.possuiSinalPNCP = existente.possuiSinalPNCP || r.possuiSinalPNCP;
      existente.quantidadeContatos = Math.min(1, Math.max(existente.quantidadeContatos ?? 0, r.quantidadeContatos ?? 0));
    }
  }

  const cnesConsolidadoPorGrupo = Array.from(porGrupoCnes.values());
  if (polos.length === 0) return cnesConsolidadoPorGrupo;

  const novosItensRadar: InstituicaoRadar[] = [];

  for (const polo of polos) {
    const chaveGrupo = normalizarNomeCliente(polo.grupoOuRazao);
    const chaveNome = normalizarNomeCliente(polo.nome);
    const match =
      (chaveGrupo.length >= 4 ? mapaNomeGrupo.get(chaveGrupo) : undefined) ??
      (chaveNome.length >= 4 ? mapaNomeGrupo.get(chaveNome) : undefined);

    if (match) {
      match.indice = Math.max(match.indice, polo.score);
      match.faixa = faixaDeScore(match.indice);
      match.quantidadeContatos = 1;
      match.principalMotivo = `Raio 5 km (${polo.distanciaKm} km) · ${polo.pontoMaisProximo}`;
      match.acaoRecomendada = `Abordar ${polo.areaDecisora} (${polo.corridasEstimadasMes} corridas/mês)`;
      continue;
    }

    const ehPublico =
      polo.grupoOuRazao.toUpperCase().includes("USP") ||
      polo.grupoOuRazao.toUpperCase().includes("ESTADUAL") ||
      polo.grupoOuRazao.toUpperCase().includes("MUNICIPAL");

    const segmento =
      polo.categoria === "EMPRESA_CORPORATIVA"
        ? "POLO_CORPORATIVO_B2B_5KM"
        : "NUCLEO_HOSPITALAR";

    novosItensRadar.push({
      id: `inst-polo-${polo.id.toLowerCase()}`,
      slug: slugInstituicaoDePolo(polo),
      nome: polo.nome,
      grupo: polo.grupoOuRazao || polo.nome,
      organizacao: {
        id: idGrupoDePolo(polo),
        nome: polo.grupoOuRazao || polo.nome,
        nomeNormalizado: normalizarNomeCliente(polo.grupoOuRazao || polo.nome),
        tipoDado: "FATO_OFICIAL",
        tipoVinculo: "OFICIAL",
        confianca: "ALTA" as NivelConfianca,
        natureza: ehPublico ? "PUBLICO" : "PRIVADO",
        quantidadeUnidades: 1,
        statusRevisao: "APROVADO",
        regraAgrupamento: "POLO_B2B_5KM_UNIFICADO",
        versaoRegra: "2.1.0",
        tipoEvidencia: "Cruzamento Geoespacial DTP/OSM + Base Corporativa B2B 5 km",
        observacao: `Distância: ${polo.distanciaKm} km · Ponto DTP: ${polo.pontoMaisProximo}`,
        dataCalculo: "2026-09-29T12:00:00.000Z",
        precisaRevisao: false,
      },
      municipio: `São Paulo (${polo.bairro})`,
      municipios: ["São Paulo"],
      tipo:
        polo.categoria === "EMPRESA_CORPORATIVA"
          ? `Empresa Corporativa (${polo.tipoOuSetor})`
          : polo.tipoOuSetor || "Hospital Geral",
      quantidadeUnidades: 1,
      operacao24h: polo.categoria === "HOSPITAL_SAUDE" || polo.demandaVouchers.toUpperCase().includes("ALTA"),
      possuiExpansao: true,
      indice: polo.score,
      faixa: faixaDeScore(polo.score),
      principalMotivo: `Polo 5 km (${polo.distanciaKm} km) · ${polo.pontoMaisProximo}`,
      qualidadeEvidencias: "ALTA",
      acaoRecomendada: `Abordar ${polo.areaDecisora} (${polo.corridasEstimadasMes} corridas/mês)`,
      tipoDado: "FATO_OFICIAL",
      cnes: null,
      situacaoCadastral: "ATIVA",
      coberturaDados: 100,
      segmentacao: {
        segmento,
        faixaAderencia: "ALTA",
        confianca: "ALTA",
        indiceAderencia: polo.score,
        versaoRegra: "2.1.0",
        justificativa: `${polo.estrategiaAbordagem} | Ponto mais próximo: ${polo.pontoMaisProximo} (${polo.distanciaKm} km).`,
        regraAplicada:
          polo.categoria === "EMPRESA_CORPORATIVA"
            ? "POLO_CORPORATIVO_RAIO_5KM"
            : "POLO_SAUDE_RAIO_5KM",
        statusRevisao: "APROVADO",
        precisaRevisao: false,
      },
      totalSinaisPNCP: 0,
      possuiSinalPNCP: false,
      possuiSinalMobilidadePNCP: false,
      dataSinalPNCPMaisRecente: null,
      vinculoPNCPExato: false,
      possuiContratacaoRecente: false,
      quantidadeContatos: contarContatosPolo(),
      riscoOuLimitacao: null,
    });
  }

  return [...novosItensRadar, ...cnesConsolidadoPorGrupo].sort((a, b) => b.indice - a.indice);
}

export function obterOrganizacaoDePolo5km(id: string): OrganizacaoCompleta | null {
  if (!id.startsWith("grupo-polo-")) return null;
  const codigo = id.replace("grupo-polo-", "").toUpperCase();
  const polo = carregarPolosCorporativos5km().find((p) => p.id.toUpperCase() === codigo);
  if (!polo) return null;
  const inst = construirInstituicaoCompletaDePolo(polo);
  return {
    ...inst.grupoEconomico!,
    instituicoes: [inst],
    contatos: inst.contatosProfissionais,
  } as unknown as OrganizacaoCompleta;
}
