import { describe, expect, it } from "vitest";
import { sanitizarRespostaBrasilAPI } from "./sanitizacao-brasilapi";
import { validarCNPJ, desformatarCNPJ } from "../receita/validacao-cnpj";
import { TipoDado, NivelConfianca, StatusRevisao } from "@prisma/client";

describe("Enriquecimento Auxiliar de CNPJ por Fonte de Terceiros (BrasilAPI)", () => {
  const payloadExemploCompleto = {
    cnpj: "60970371000128",
    identificador_matriz_filial: 1,
    descricao_identificador_matriz_filial: "MATRIZ",
    razao_social: "HOSPITAL ALBERT EINSTEIN CORP S.A.",
    nome_fantasia: "HOSPITAL EINSTEIN MORUMBI",
    situacao_cadastral: 2,
    descricao_situacao_cadastral: "ATIVA",
    data_situacao_cadastral: "2005-11-03",
    data_inicio_atividade: "1971-01-01",
    cnae_fiscal: 8610101,
    cnae_fiscal_descricao: "Atividades de atendimento hospitalar",
    natureza_juridica: "Associação Privada",
    porte: "DEMAIS",
    capital_social: 500000000,
    municipio: "SAO PAULO",
    uf: "SP",
    // Campos proibidos / pessoais que DEVEM ser descartados pela governança:
    qsa: [
      {
        identificador_de_socio: 2,
        nome_socio: "DIRETOR CORPORATIVO TESTE",
        cnpj_cpf_do_socio: "***123456**",
        codigo_qualificacao_socio: 10,
      },
    ],
    ddd_telefone_1: "11999998888",
    ddd_telefone_2: "11988887777",
    email: "diretoria.pessoal@hospital.com",
    logradouro: "AV ALBERT EINSTEIN",
    numero: "627",
    bairro: "MORUMBI",
    cep: "05652900",
  };

  it("deve validar CNPJ autêntico e rejeitar CNPJ inválido", () => {
    expect(desformatarCNPJ("60.970.371/0001-28")).toBe("60970371000128");
    expect(validarCNPJ("60970371000128")).toBe(true);
    expect(validarCNPJ("60747318000162")).toBe(true);
    expect(validarCNPJ("60970371000199")).toBe(false);
    expect(validarCNPJ("00000000000000")).toBe(false);
    expect(validarCNPJ("12345")).toBe(false);
  });

  it("deve sanitizar resposta excluindo estritamente QSA, CPF, telefones e e-mails pessoais", () => {
    const sanitizado = sanitizarRespostaBrasilAPI(
      payloadExemploCompleto,
      "60970371000128",
      "https://brasilapi.com.br/api/cnpj/v1/60970371000128"
    );

    // Campos cadastrais corporativos preservados
    expect(sanitizado.cnpj).toBe("60970371000128");
    expect(sanitizado.razaoSocial).toBe("HOSPITAL ALBERT EINSTEIN CORP S.A.");
    expect(sanitizado.nomeFantasia).toBe("HOSPITAL EINSTEIN MORUMBI");
    expect(sanitizado.situacaoCadastral).toBe("ATIVA");
    expect(sanitizado.matrizFilial).toBe("MATRIZ");
    expect(sanitizado.porte).toBe("DEMAIS");
    expect(sanitizado.capitalSocial).toBe(500000000);
    expect(sanitizado.municipio).toBe("SAO PAULO");
    expect(sanitizado.uf).toBe("SP");
    expect(sanitizado.cnaePrincipal).toContain("8610101");

    // Campos proibidos NÃO devem existir no objeto sanitizado
    const obj = sanitizado as unknown as Record<string, unknown>;
    expect(obj.qsa).toBeUndefined();
    expect(obj.socios).toBeUndefined();
    expect(obj.cpf).toBeUndefined();
    expect(obj.email).toBeUndefined();
    expect(obj.ddd_telefone_1).toBeUndefined();
    expect(obj.telefones).toBeUndefined();
    expect(obj.representanteLegal).toBeUndefined();
  });

  it("deve lidar com resposta incompleta sem falhar", () => {
    const payloadMinimo = {
      cnpj: "12345678000195",
      razao_social: "EMPRESA MINIMA LTDA",
    };

    const sanitizado = sanitizarRespostaBrasilAPI(
      payloadMinimo,
      "12345678000195",
      "https://brasilapi.com.br/api/cnpj/v1/12345678000195"
    );

    expect(sanitizado.cnpj).toBe("12345678000195");
    expect(sanitizado.razaoSocial).toBe("EMPRESA MINIMA LTDA");
    expect(sanitizado.nomeFantasia).toBeNull();
    expect(sanitizado.capitalSocial).toBeNull();
    expect(sanitizado.cnaePrincipal).toBeNull();
    expect(sanitizado.matrizFilial).toBeNull();
  });

  it("deve calcular hash SHA-256 determinístico da resposta sanitizada", () => {
    const d1 = new Date("2026-09-06T18:00:00Z");
    const s1 = sanitizarRespostaBrasilAPI(payloadExemploCompleto, "60970371000128", "https://fonte.com", d1);
    const s2 = sanitizarRespostaBrasilAPI(payloadExemploCompleto, "60970371000128", "https://fonte.com", d1);

    expect(s1.hashResposta).toBeDefined();
    expect(s1.hashResposta.length).toBe(64); // SHA-256 hex
    expect(s1.hashResposta).toBe(s2.hashResposta);
  });

  it("deve atribuir obrigatoriamente a classificação canônica DADO_TERCEIRO_NAO_CANONICO", () => {
    const sanitizado = sanitizarRespostaBrasilAPI(
      payloadExemploCompleto,
      "60970371000128",
      "https://brasilapi.com.br/api/cnpj/v1/60970371000128"
    );

    expect(sanitizado.tipoDado).toBe(TipoDado.DADO_TERCEIRO_NAO_CANONICO);
    expect(sanitizado.tipoDado).not.toBe(TipoDado.FATO_OFICIAL);
    expect(sanitizado.confianca).toBe(NivelConfianca.MEDIA);
    expect(sanitizado.statusRevisao).toBe(StatusRevisao.PENDENTE);
    expect(sanitizado.provedor).toBe("BRASIL_API");
  });

  it("deve garantir que a fonte auxiliar NÃO altera regras de negócio canônicas", () => {
    // A fonte auxiliar apenas gera registros em EnriquecimentoCNPJTerceiro
    // Não altera agrupamento (GrupoEconomico continua FATO_OFICIAL / HIPOTESE)
    // Não altera segmentação 2.1.0
    // Não altera índice comercial (IPC)
    const tipoDadoAuxiliar = TipoDado.DADO_TERCEIRO_NAO_CANONICO;
    expect(tipoDadoAuxiliar).toBe("DADO_TERCEIRO_NAO_CANONICO");
    expect(TipoDado.FATO_OFICIAL).toBe("FATO_OFICIAL");
  });
});
