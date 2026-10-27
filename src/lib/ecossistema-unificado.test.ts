import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  carregarDadosAbertosMobilidadeSP,
  carregarPolosCorporativos5km,
  carregarPontosTaxiGeorreferenciados,
  carregarResumoEcossistemaTaxiSP,
  consultarTaxistasMapeados,
} from "./ecossistema-unificado";
import {
  listarContasComerciais,
  listarRadarUnificado,
  obterContaComercial,
  obterInstituicaoPorSlug,
} from "./dados";
import { carregarCooperativasEFrotasTaxiSP } from "./cooperativas-taxi";

describe("Integração do Ecossistema Unificado (Mapeamento Oferta Taxistas + Radar B2B + Banco de Clientes/Empresas)", { timeout: 30000 }, () => {
  it("carrega métricas higienizadas da base pública de taxistas, pontos georreferenciados e polos 5km sem expor PII", () => {
    const resumo = carregarResumoEcossistemaTaxiSP();
    expect(resumo.disponivel).toBe(true);
    expect(resumo.conformidadeLgpd.arquivoPublicoPresente).toBe(true);
    expect(resumo.conformidadeLgpd.colunasPiiRemovidas).toBe(true);
    expect(resumo.taxistas.totalMapeados).toBe(16863);
    expect(resumo.taxistas.homonimosBloqueados).toBeGreaterThan(350);
    expect(resumo.taxistas.meiValidado1Para1).toBeGreaterThan(1900);
    expect(resumo.pontosTaxi.totalGeocodificados).toBe(997);
    expect(resumo.radar5kmButanta.polosSaudeHospitais).toBe(94);
    expect(resumo.radar5kmButanta.grandesEmpresasCorporativas).toBe(96);
    expect(resumo.radar5kmButanta.totalProspectsRaio5km).toBe(190);
  });

  it("permite busca e paginação server-side dos 16.863 taxistas sem expor telefone, CPF ou e-mail pessoal", () => {
    const pagina1 = consultarTaxistasMapeados({ pagina: 1, tamanhoPagina: 25 });
    expect(pagina1.total).toBe(16863);
    expect(pagina1.itens).toHaveLength(25);

    const apenasMei1Para1 = consultarTaxistasMapeados({ mei: "SIM", pagina: 1, tamanhoPagina: 10 });
    expect(apenasMei1Para1.total).toBeGreaterThan(1900);
    expect(apenasMei1Para1.itens.every((item) => item.possuiMei.startsWith("Sim"))).toBe(true);

    const apenasHomonimos = consultarTaxistasMapeados({ mei: "HOMONIMO", pagina: 1, tamanhoPagina: 10 });
    expect(apenasHomonimos.total).toBeGreaterThan(350);
    expect(apenasHomonimos.itens.every((item) => item.possuiMei.includes("Homônimo"))).toBe(true);
  });

  it("carrega os 997 pontos de táxi georreferenciados, consolida os polos 5km por grupo único e carrega os dados abertos", () => {
    const pontos = carregarPontosTaxiGeorreferenciados();
    expect(pontos).toHaveLength(997);
    expect(pontos[0]?.latitude).toBeLessThan(-20);

    const polosConsolidados = carregarPolosCorporativos5km();
    expect(polosConsolidados.length).toBeGreaterThan(110);
    expect(polosConsolidados.length).toBeLessThan(190);
    expect(polosConsolidados.some((p) => p.pitchComercial.toLowerCase().includes("chame táxi"))).toBe(false);

    const dadosAbertos = carregarDadosAbertosMobilidadeSP();
    expect(dadosAbertos.licencasSgtpTotal).toBeGreaterThan(37000);
    expect(dadosAbertos.empresasTaxiPjAtivas).toBeGreaterThan(5000);
    expect(dadosAbertos.topSubprefeiturasSinistros.length).toBeGreaterThan(0);
  });

  it("mantém estritamente 1 CNPJ principal, no máximo 1 contato principal e 1 conta consolidada por Grupo Econômico", async () => {
    const contasUnificadas = await listarContasComerciais("MODO_REAL");
    expect(contasUnificadas.length).toBeGreaterThan(7600);

    // Garantir que nenhuma conta possui mais de 1 contato por grupo
    expect(contasUnificadas.every((c) => c.quantidadeContatos <= 1)).toBe(true);

    // Garantir que os grupos possuem CNPJ principal único preenchido
    const comCnpjUnico = contasUnificadas.filter((c) => Boolean(c.cnpjPrincipal));
    expect(comCnpjUnico.length).toBeGreaterThan(7300);

    const primeiraContaPolo = contasUnificadas.find((c) => c.id.startsWith("conta-polo-"));
    expect(primeiraContaPolo).toBeDefined();
    const detalheEmpresa = await obterContaComercial(primeiraContaPolo!.id, "MODO_REAL");
    expect(detalheEmpresa).not.toBeNull();
    expect(detalheEmpresa?.grupoEconomico?.contatos).toHaveLength(1);

    const radarConsolidado = await listarRadarUnificado("MODO_REAL");
    expect(radarConsolidado.length).toBeGreaterThan(7500);
    expect(radarConsolidado.every((r) => (r.quantidadeContatos ?? 0) <= 1)).toBe(true);

    const primeiroPoloRadar = radarConsolidado.find((r) => r.slug.startsWith("polo-5km-"));
    expect(primeiroPoloRadar).toBeDefined();
    const instEmpresa = await obterInstituicaoPorSlug(primeiroPoloRadar!.slug, "MODO_REAL");
    expect(instEmpresa).not.toBeNull();
    expect(instEmpresa?.contatosProfissionais).toHaveLength(1);
  });

  it("mapeia Cooperativas de Táxi, Centrais de Rádio-Táxi, Associações e Empresas de Táxi PJ com evidência e revisão explícita", () => {
    const resumoCoops = carregarCooperativasEFrotasTaxiSP();

    // A base cobre 5.558 registros PJ ativos e 5.462 raízes de CNPJ; apenas os
    // grupos com evidência de táxi entram na lista comercial.
    expect(resumoCoops.totalRegistrosFonte).toBeGreaterThan(5000);
    expect(resumoCoops.totalGruposAnalisados).toBeGreaterThan(5000);
    expect(resumoCoops.totalGruposMapeados).toBeGreaterThan(120);
    expect(resumoCoops.totalGruposMapeados).toBeLessThan(250);
    expect(resumoCoops.totalGruposExcluidos).toBeGreaterThan(5000);
    expect(resumoCoops.totalRegistrosExcluidos).toBeGreaterThan(5000);

    expect(resumoCoops.totalCooperativasPuras).toBeGreaterThanOrEqual(9);
    expect(resumoCoops.totalCentraisRadioTaxi).toBeGreaterThanOrEqual(15);
    expect(resumoCoops.totalAssociacoesSindicatos).toBeGreaterThanOrEqual(4);
    expect(resumoCoops.totalConfirmados).toBeGreaterThan(120);
    expect(resumoCoops.totalPendentesRevisao).toBeGreaterThanOrEqual(3);
    expect(resumoCoops.totalComContatoDireto).toBeGreaterThan(130);

    // Garantir 1 único registro por raiz de CNPJ (sem duplicidade de grupo)
    const raizes = new Set(resumoCoops.cooperativas.map((c) => c.raizCnpj));
    expect(raizes.size).toBe(resumoCoops.cooperativas.length);

    // Nomes reais que devem permanecer na lista revisada
    const nomes = resumoCoops.cooperativas.map((c) =>
      `${c.razaoSocial} ${c.nomeExibicao}`.toUpperCase(),
    );
    for (const esperado of ["COOPERTAX", "LIGUE-TAXI", "FAST MOBIL", "27 TAXI", "AMAAP"]) {
      expect(nomes.some((nome) => nome.includes(esperado))).toBe(true);
    }

    // Falsos positivos identificados na revisão não podem voltar à lista
    for (const excluido of ["COOPER BRASVIAS", "COOPERATIVA DOS PROFISSIONAIS AUTONOMOS DA AREA DA SAUDE"]) {
      expect(nomes.some((nome) => nome.includes(excluido))).toBe(false);
    }

    // Pendências ficam visíveis e nunca são promovidas a Tier 1
    const pendentes = resumoCoops.cooperativas.filter(
      (c) => c.statusRevisao === "PENDENTE_REVISAO",
    );
    expect(pendentes).toHaveLength(resumoCoops.totalPendentesRevisao);
    expect(pendentes.every((c) => c.nivelEvidencia === "MODERADA")).toBe(true);
    expect(pendentes.some((c) => c.razaoSocial.includes("COOTRASP"))).toBe(true);
    expect(
      resumoCoops.cooperativas
        .filter((c) => c.tierSaaS === "TIER_1_ALTA_PRIORIDADE")
        .every((c) => c.statusRevisao === "CONFIRMADO"),
    ).toBe(true);

    // Rastreabilidade mínima por registro
    expect(
      resumoCoops.cooperativas.every(
        (c) => c.evidencias.length > 0 && c.tipoEstabelecimento.length > 0,
      ),
    ).toBe(true);
    expect(
      resumoCoops.cooperativas.every(
        (c) =>
          c.capitalSocialFormatado === "Não informado" ||
          c.capitalSocialFormatado.startsWith("R$"),
      ),
    ).toBe(true);

    // Garantir pitch SaaS personalizado com marca WiNS Hub Táxi
    expect(
      resumoCoops.cooperativas.every((c) =>
        c.pitchWhatsAppEmail.includes("WiNS Hub Táxi"),
      ),
    ).toBe(true);
  });
});
