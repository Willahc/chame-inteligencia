import { describe, expect, it } from "vitest";
import * as path from "node:path";
import { ImportadorReceitaLocal } from "./importador-receita";
import { CandidatoCnesCNPJ } from "../../domain/receita/tipos";
import { validarLinhaEmpresa, validarLinhaEstabelecimento } from "./validador-leiaute";

describe("Importador e Validador de Arquivos da Receita Federal", () => {
  const caminhoFixtures = path.join(__dirname, "__fixtures__");
  const fixtureEmpresas = path.join(caminhoFixtures, "empresas-demo.csv");
  const fixtureEstabelecimentos = path.join(caminhoFixtures, "estabelecimentos-demo.csv");

  it("deve validar leiaute oficial de Empresas (7 colunas)", () => {
    const linhaValida = '"60970371";"HOSPITAL ALBERT EINSTEIN DEMO S.A.";"2054";"10";"500000000,00";"05";""';
    const res = validarLinhaEmpresa(linhaValida);
    expect(res.valido).toBe(true);
    expect(res.registro?.cnpjBasico).toBe("60970371");
    expect(res.registro?.razaoSocial).toBe("HOSPITAL ALBERT EINSTEIN DEMO S.A.");
    expect(res.registro?.capitalSocial).toBe(500000000);

    const linhaInvalida = '"60970371";"EMPRESA INCOMPLETA"';
    const resInvalida = validarLinhaEmpresa(linhaInvalida);
    expect(resInvalida.valido).toBe(false);
  });

  it("deve validar leiaute oficial de Estabelecimentos (30 colunas)", () => {
    const linhaValida = '"60970371";"0001";"28";"1";"HOSPITAL EINSTEIN MORUMBI DEMO";"02";"19710101";"00";"";"";"19710101";"8610101";"";"AV";"ALBERT EINSTEIN";"627";"";"MORUMBI";"05652900";"SP";"7107";"11";"21511233";"";"";"";"";"contato@einstein.demo";"";""';
    const res = validarLinhaEstabelecimento(linhaValida);
    expect(res.valido).toBe(true);
    expect(res.registro?.cnpjCompleto).toBe("60970371000128");
    expect(res.registro?.identificadorMatrizFilial).toBe(1);
    expect(res.registro?.uf).toBe("SP");

    const linhaInvalida = '"60970371";"0001";"28"';
    const resInvalida = validarLinhaEstabelecimento(linhaInvalida);
    expect(resInvalida.valido).toBe(false);
  });

  it("deve processar arquivos de fixture em streaming filtrando somente os candidatos", async () => {
    const candidatos: CandidatoCnesCNPJ[] = [
      {
        instituicaoId: "inst-einstein",
        instituicaoNome: "Hospital Albert Einstein",
        cnes: "2077488",
        cnpjCnes: "60970371000128",
        cnpjBasicoCnes: "60970371",
        possuiCnpjValido: true,
      },
      {
        instituicaoId: "inst-sirio",
        instituicaoNome: "Hospital Sírio-Libanês",
        cnes: "2080349",
        cnpjCnes: "60747318000162",
        cnpjBasicoCnes: "60747318",
        possuiCnpjValido: true,
      },
      {
        instituicaoId: "inst-sem-cnpj",
        instituicaoNome: "Posto Sem CNPJ",
        cnes: "0000000",
        cnpjCnes: null,
        cnpjBasicoCnes: null,
        possuiCnpjValido: false,
      },
    ];

    const importador = new ImportadorReceitaLocal();
    const relatorio = await importador.processar({
      caminhoEmpresas: fixtureEmpresas,
      caminhoEstabelecimentos: fixtureEstabelecimentos,
      candidatos,
      competencia: "2026-08",
      modoSimulacao: true,
    });

    expect(relatorio.sucesso).toBe(true);
    expect(relatorio.hashArquivoEstabelecimentos).toBeDefined();
    expect(relatorio.hashArquivoEmpresas).toBeDefined();

    // A fixture tem 5 estabelecimentos (3 pertencentes aos 2 CNPJs básicos dos candidatos: 60970371 [2 un.] e 60747318 [1 un.])
    expect(relatorio.linhasLidasEstabelecimentos).toBe(5);
    expect(relatorio.estabelecimentosCarregados).toBe(3);

    // Registros fora do escopo (CNPJ básico 99999999 e 43202472) NÃO devem ser carregados
    const encontrouForaDoEscopo = relatorio.estabelecimentos.some((e) => e.cnpjBasico === "99999999");
    expect(encontrouForaDoEscopo).toBe(false);

    // Resoluções calculadas
    expect(relatorio.resolucoesCalculadas).toBe(3);
    expect(relatorio.distribuicaoResolucoes.EXATO_CNPJ).toBe(2);
    expect(relatorio.distribuicaoResolucoes.NAO_RESOLVIDO).toBe(1);
  });

  it("deve ser idempotente (duas execuções com mesmos parâmetros produzem exatamente os mesmos resultados)", async () => {
    const candidatos: CandidatoCnesCNPJ[] = [
      {
        instituicaoId: "inst-einstein",
        instituicaoNome: "Hospital Albert Einstein",
        cnes: "2077488",
        cnpjCnes: "60970371000128",
        cnpjBasicoCnes: "60970371",
        possuiCnpjValido: true,
      },
    ];

    const importador = new ImportadorReceitaLocal();

    const execucao1 = await importador.processar({
      caminhoEmpresas: fixtureEmpresas,
      caminhoEstabelecimentos: fixtureEstabelecimentos,
      candidatos,
      competencia: "2026-08",
      modoSimulacao: true,
    });

    const execucao2 = await importador.processar({
      caminhoEmpresas: fixtureEmpresas,
      caminhoEstabelecimentos: fixtureEstabelecimentos,
      candidatos,
      competencia: "2026-08",
      modoSimulacao: true,
    });

    expect(execucao1.hashArquivoEstabelecimentos).toBe(execucao2.hashArquivoEstabelecimentos);
    expect(execucao1.hashArquivoEmpresas).toBe(execucao2.hashArquivoEmpresas);
    expect(execucao1.linhasLidasEstabelecimentos).toBe(execucao2.linhasLidasEstabelecimentos);
    expect(execucao1.estabelecimentosCarregados).toBe(execucao2.estabelecimentosCarregados);
    expect(execucao1.resolucoesCalculadas).toBe(execucao2.resolucoesCalculadas);
    expect(execucao1.resolucoes[0].tipoResolucao).toBe(execucao2.resolucoes[0].tipoResolucao);
    expect(execucao1.resolucoes[0].empresaReceita?.cnpj).toBe(execucao2.resolucoes[0].empresaReceita?.cnpj);
  });
});
