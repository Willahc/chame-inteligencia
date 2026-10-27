import { describe, expect, it } from "vitest";
import {
  analisarCsv,
  calcularAnosAtuacao,
  classificarRegistroTaxi,
  mapearRegistrosCsv,
  normalizarTexto,
  type RegistroFonteCooperativa,
} from "./cooperativas-taxi";

function registro(
  sobrescritas: Partial<RegistroFonteCooperativa> = {},
): RegistroFonteCooperativa {
  return {
    CNPJ: "12.345.678/0001-90",
    RAZAO_SOCIAL: "EMPRESA TESTE LTDA",
    NOME_FANTASIA: "",
    NATUREZA_JURIDICA: "Sociedade Empresaria Limitada",
    PORTE: "01",
    CAPITAL_SOCIAL: "0,00",
    CNAE_FISCAL_PRINCIPAL: "4923001",
    CNAE_FISCAL_SECUNDARIA: "",
    CNAE_TAXI_DESCRICAO: "",
    SITUACAO_CADASTRAL: "Ativa",
    DATA_INICIO_ATIVIDADE: "2010-01-01",
    MATRIZ_OU_FILIAL: "Matriz",
    LOGRADOURO: "RUA TESTE",
    NUMERO: "1",
    COMPLEMENTO: "",
    BAIRRO: "CENTRO",
    CEP: "01000-000",
    MUNICIPIO: "SAO PAULO",
    UF: "SP",
    TELEFONE_INSTITUCIONAL: "",
    TELEFONE_INSTITUCIONAL_2: "",
    EMAIL_INSTITUCIONAL: "",
    ...sobrescritas,
  };
}

describe("cooperativas-taxi: leitura do CSV da Receita Federal", () => {
  it("preserva ponto e vírgula dentro de campos entre aspas", () => {
    const csv = [
      "CNPJ;RAZAO_SOCIAL;CNAE_TAXI_DESCRICAO;EMAIL_INSTITUCIONAL",
      '11.111.111/0001-11;COOPERATIVA TESTE;"4923001=Servico de taxi; 4923002=Transporte de passageiros";teste@exemplo.com',
      '22.222.222/0001-22;"EMPRESA ""ASPAS"" LTDA";4923001=Servico de taxi;',
    ].join("\r\n");

    const registros = mapearRegistrosCsv("\uFEFF" + csv);

    expect(registros).toHaveLength(2);
    expect(registros[0].CNAE_TAXI_DESCRICAO).toBe(
      "4923001=Servico de taxi; 4923002=Transporte de passageiros",
    );
    expect(registros[0].EMAIL_INSTITUCIONAL).toBe("teste@exemplo.com");
    expect(registros[1].RAZAO_SOCIAL).toBe('EMPRESA "ASPAS" LTDA');
  });

  it("ignora linhas vazias e mantém o número de colunas do cabeçalho", () => {
    const linhas = analisarCsv(
      "CNPJ;NOME\r\n11.111.111/0001-11;TESTE\r\n\r\n22.222.222/0001-22;OUTRO\r\n",
    );

    expect(linhas).toEqual([
      ["CNPJ", "NOME"],
      ["11.111.111/0001-11", "TESTE"],
      ["22.222.222/0001-22", "OUTRO"],
    ]);
  });
});

describe("cooperativas-taxi: classificação por evidência", () => {
  it("confirma cooperativa com CNAE principal de serviço de táxi", () => {
    const resultado = classificarRegistroTaxi(
      registro({
        RAZAO_SOCIAL: "COOPERATIVA DE TAXI TESTE",
        NATUREZA_JURIDICA: "Cooperativa",
        CNAE_FISCAL_PRINCIPAL: "4923001",
      }),
    );

    expect(resultado.incluido).toBe(true);
    if (!resultado.incluido) return;
    expect(resultado.categoria).toBe("COOPERATIVA_TAXI");
    expect(resultado.statusRevisao).toBe("CONFIRMADO");
    expect(resultado.nivelEvidencia).toBe("FORTE");
    expect(resultado.motivoClassificacao).toBe("CNAE_PRINCIPAL_TAXI");
    expect(resultado.evidencias.join(" ")).toContain("4923-0/01");
  });

  it("mantém cooperativa com CNAE de táxi apenas secundário como pendente", () => {
    const resultado = classificarRegistroTaxi(
      registro({
        RAZAO_SOCIAL: "COOPERATIVA DE TRANSPORTES TESTE",
        NATUREZA_JURIDICA: "Cooperativa",
        CNAE_FISCAL_PRINCIPAL: "4930202",
        CNAE_FISCAL_SECUNDARIA: "4923001,4930201",
      }),
    );

    expect(resultado.incluido).toBe(true);
    if (!resultado.incluido) return;
    expect(resultado.categoria).toBe("COOPERATIVA_TAXI");
    expect(resultado.statusRevisao).toBe("PENDENTE_REVISAO");
    expect(resultado.nivelEvidencia).toBe("MODERADA");
    expect(resultado.motivoClassificacao).toBe(
      "CNAE_TAXI_SECUNDARIO_COM_IDENTIDADE",
    );
    expect(resultado.cnaesTaxiSecundarios).toEqual(["4923001"]);
  });

  it("exclui cooperativa de logística mesmo com CNAE de táxi secundário", () => {
    const resultado = classificarRegistroTaxi(
      registro({
        RAZAO_SOCIAL: "COOPER BRASVIAS - COOPERATIVA DE TRANSPORTES E LOGISTICA",
        NATUREZA_JURIDICA: "Cooperativa",
        CNAE_FISCAL_PRINCIPAL: "4930201",
        CNAE_FISCAL_SECUNDARIA: "4923001,4923002",
      }),
    );

    expect(resultado.incluido).toBe(false);
    if (resultado.incluido) return;
    expect(resultado.motivoExclusao).toBe("SEGMENTO_INCOMPATIVEL");
  });

  it("mantém como pendente o CNAE principal de táxi com nome de segmento divergente", () => {
    const resultado = classificarRegistroTaxi(
      registro({
        RAZAO_SOCIAL: "AUTOSSOCORRO TESTE LTDA",
        CNAE_FISCAL_PRINCIPAL: "4923001",
      }),
    );

    expect(resultado.incluido).toBe(true);
    if (!resultado.incluido) return;
    expect(resultado.statusRevisao).toBe("PENDENTE_REVISAO");
    expect(resultado.motivoClassificacao).toBe("CONFLITO_SEGMENTO");
    expect(resultado.evidencias.join(" ")).toContain("autossocorro");
  });

  it("exclui empresa sem evidência de táxi no nome ou na atividade principal", () => {
    const resultado = classificarRegistroTaxi(
      registro({
        RAZAO_SOCIAL: "EMPRESA GENERICA LTDA",
        CNAE_FISCAL_PRINCIPAL: "5229002",
        CNAE_FISCAL_SECUNDARIA: "",
      }),
    );

    expect(resultado.incluido).toBe(false);
    if (resultado.incluido) return;
    expect(resultado.motivoExclusao).toBe("SEM_EVIDENCIA_TAXI");
  });

  it("mantém como pendente empresa com táxi no nome e CNAE amplo de locação com motorista", () => {
    const resultado = classificarRegistroTaxi(
      registro({
        RAZAO_SOCIAL: "TAXI TONELLI LTDA",
        NOME_FANTASIA: "TAXI TONELLI EXPRESS",
        CNAE_FISCAL_PRINCIPAL: "4923002",
      }),
    );

    expect(resultado.incluido).toBe(true);
    if (!resultado.incluido) return;
    expect(resultado.statusRevisao).toBe("PENDENTE_REVISAO");
    expect(resultado.motivoClassificacao).toBe("NOME_TAXI_COM_CNAE_AMPLO");
  });

  it("confirma central de rádio-táxi quando o nome e o CNAE secundário coincidem", () => {
    const resultado = classificarRegistroTaxi(
      registro({
        RAZAO_SOCIAL: "RADIO TAXI TESTE LTDA",
        CNAE_FISCAL_PRINCIPAL: "7711000",
        CNAE_FISCAL_SECUNDARIA: "5229001",
      }),
    );

    expect(resultado.incluido).toBe(true);
    if (!resultado.incluido) return;
    expect(resultado.categoria).toBe("CENTRAL_RADIO_TAXI");
    expect(resultado.statusRevisao).toBe("CONFIRMADO");
    expect(resultado.motivoClassificacao).toBe("NOME_TAXI_COM_CNAE_SECUNDARIO");
  });

  it("classifica associação de taxistas a partir do nome, mesmo sem CNAE principal de táxi", () => {
    const resultado = classificarRegistroTaxi(
      registro({
        RAZAO_SOCIAL: "ASSOCIACAO DOS TAXISTAS TESTE",
        NATUREZA_JURIDICA: "",
        CNAE_FISCAL_PRINCIPAL: "9499500",
        CNAE_FISCAL_SECUNDARIA: "4923001",
      }),
    );

    expect(resultado.incluido).toBe(true);
    if (!resultado.incluido) return;
    expect(resultado.categoria).toBe("ASSOCIACAO_SINDICATO");
    expect(resultado.statusRevisao).toBe("CONFIRMADO");
  });
});

describe("cooperativas-taxi: utilitários", () => {
  it("normaliza acentos, caixa e espaços", () => {
    expect(normalizarTexto("  Rádio Táxi São Paulo  ")).toBe(
      "RADIO TAXI SAO PAULO",
    );
  });

  it("calcula anos de atuação com o ano de referência, sem fixar 2026", () => {
    expect(calcularAnosAtuacao("2016-05-01", 2026)).toBe(10);
    expect(calcularAnosAtuacao("2026-01-10", 2026)).toBe(0);
    expect(calcularAnosAtuacao("2030-01-10", 2026)).toBe(0);
    expect(calcularAnosAtuacao("data-invalida", 2026)).toBe(0);
  });
});
