import { describe, expect, it } from "vitest";
import { desformatarCNPJ, extrairCnpjBasico, validarCNPJ } from "./validacao-cnpj";
import { resolverCnpjInstituicao } from "./resolucao-cnpj";
import { CandidatoCnesCNPJ, RegistroEstabelecimentoRFB } from "./tipos";
import { validarLinhaEstabelecimento } from "../../ingestao/receita/validador-leiaute";

describe("Regras Obrigatórias e Governança do Gate 4 — Receita Federal", () => {
  const estMatriz: RegistroEstabelecimentoRFB = {
    cnpjBasico: "60970371",
    cnpjOrdem: "0001",
    cnpjDv: "28",
    cnpjCompleto: "60970371000128",
    identificadorMatrizFilial: 1, // 1 = Matriz
    nomeFantasia: "HOSPITAL ISRAELITA ALBERT EINSTEIN MORUMBI",
    situacaoCadastral: "02", // 02 = Ativa
    uf: "SP",
    municipio: "SAO PAULO",
  };

  const estFilial: RegistroEstabelecimentoRFB = {
    cnpjBasico: "60970371",
    cnpjOrdem: "0002",
    cnpjDv: "09",
    cnpjCompleto: "60970371000209",
    identificadorMatrizFilial: 2, // 2 = Filial
    nomeFantasia: "UNIDADE AV PAULISTA",
    situacaoCadastral: "02",
    uf: "SP",
    municipio: "SAO PAULO",
  };

  const estBaixado: RegistroEstabelecimentoRFB = {
    cnpjBasico: "60970371",
    cnpjOrdem: "0003",
    cnpjDv: "90",
    cnpjCompleto: "60970371000390",
    identificadorMatrizFilial: 2,
    nomeFantasia: "UNIDADE ANTIGA DESATIVADA",
    situacaoCadastral: "08", // 08 = Baixada
    uf: "SP",
    municipio: "SAO PAULO",
  };

  it("deve validar dígitos verificadores e distinguir CNPJ válido de inválido", () => {
    // Formatação e extração da raiz básica
    expect(desformatarCNPJ("60.970.371/0001-28")).toBe("60970371000128");
    expect(extrairCnpjBasico("60970371000128")).toBe("60970371");

    // CNPJs válidos autênticos
    expect(validarCNPJ("60970371000128")).toBe(true);
    expect(validarCNPJ("60747318000162")).toBe(true);
    expect(validarCNPJ("43202472000130")).toBe(true);

    // CNPJs inválidos (dígito errado, tamanho incorreto, repetidos)
    expect(validarCNPJ("60970371000129")).toBe(false);
    expect(validarCNPJ("00000000000000")).toBe(false);
    expect(validarCNPJ("11111111111111")).toBe(false);
    expect(validarCNPJ("123456")).toBe(false);
    expect(validarCNPJ("")).toBe(false);
  });

  it("deve resolver corretamente vínculos de Matriz, Filial e Mesmo CNPJ Básico", () => {
    // 1. Resolução exata de Matriz
    const candidatoMatriz: CandidatoCnesCNPJ = {
      instituicaoId: "inst-matriz",
      instituicaoNome: "Hospital Albert Einstein Morumbi",
      cnes: "2077488",
      cnpjCnes: "60970371000128",
      cnpjBasicoCnes: "60970371",
      possuiCnpjValido: true,
    };
    const resMatriz = resolverCnpjInstituicao(candidatoMatriz, [estMatriz, estFilial]);
    expect(resMatriz.tipoResolucao).toBe("EXATO_CNPJ");
    expect(resMatriz.empresaReceita?.identificadorMatrizFilial).toBe(1);

    // 2. Resolução exata de Filial
    const candidatoFilial: CandidatoCnesCNPJ = {
      instituicaoId: "inst-filial",
      instituicaoNome: "Unidade Paulista",
      cnes: "2088888",
      cnpjCnes: "60970371000209",
      cnpjBasicoCnes: "60970371",
      possuiCnpjValido: true,
    };
    const resFilial = resolverCnpjInstituicao(candidatoFilial, [estMatriz, estFilial]);
    expect(resFilial.tipoResolucao).toBe("EXATO_CNPJ");
    expect(resFilial.empresaReceita?.identificadorMatrizFilial).toBe(2);

    // 3. Resolução por raiz com Matriz oficial quando filial específica não estiver cadastrada
    const candidatoSemFilial: CandidatoCnesCNPJ = {
      instituicaoId: "inst-ambulatorio",
      instituicaoNome: "Ambulatório Perdizes",
      cnes: "2099999",
      cnpjCnes: "60970371009999", // Filial 9999 não listada
      cnpjBasicoCnes: "60970371",
      possuiCnpjValido: true,
    };
    const resVinculoMatriz = resolverCnpjInstituicao(candidatoSemFilial, [estMatriz]);
    expect(resVinculoMatriz.tipoResolucao).toBe("MATRIZ_FILIAL");
    expect(resVinculoMatriz.confianca).toBe("ALTA");
    expect(resVinculoMatriz.empresaReceita?.identificadorMatrizFilial).toBe(1);

    // 4. Resolução por Mesmo CNPJ Básico (quando não há correspondência exata nem matriz disponível)
    const resMesmoBasico = resolverCnpjInstituicao(candidatoSemFilial, [estFilial]);
    expect(resMesmoBasico.tipoResolucao).toBe("MESMO_CNPJ_BASICO");
    expect(resMesmoBasico.confianca).toBe("MEDIA");
  });

  it("deve detectar situações de Conflito cadastral e manter divergências explícitas", () => {
    const estConflito1: RegistroEstabelecimentoRFB = {
      ...estMatriz,
      nomeFantasia: "Hospital Nome 1",
    };
    const estConflito2: RegistroEstabelecimentoRFB = {
      ...estMatriz,
      nomeFantasia: "Hospital Nome 2 Divergente",
    };

    const candidato: CandidatoCnesCNPJ = {
      instituicaoId: "inst-conflito",
      instituicaoNome: "Hospital Teste",
      cnes: "2077488",
      cnpjCnes: "60970371000128",
      cnpjBasicoCnes: "60970371",
      possuiCnpjValido: true,
    };

    const resConflito = resolverCnpjInstituicao(candidato, [estConflito1, estConflito2]);
    expect(resConflito.tipoResolucao).toBe("CONFLITO");
    expect(resConflito.confianca).toBe("BAIXA");
    expect(resConflito.divergencias).toBeDefined();
    expect(resConflito.metodo).toBe("DUPLICIDADE_CADASTRAL_RECEITA");
  });

  it("deve registrar e preservar a Situação Cadastral oficial da Receita Federal", () => {
    const candidatoAtivo: CandidatoCnesCNPJ = {
      instituicaoId: "inst-1",
      instituicaoNome: "Hospital Morumbi",
      cnes: "2077488",
      cnpjCnes: "60970371000128",
      cnpjBasicoCnes: "60970371",
      possuiCnpjValido: true,
    };
    const resAtiva = resolverCnpjInstituicao(candidatoAtivo, [estMatriz]);
    expect(resAtiva.empresaReceita?.situacaoCadastral).toBe("02"); // 02 = Ativa

    const candidatoBaixado: CandidatoCnesCNPJ = {
      instituicaoId: "inst-2",
      instituicaoNome: "Unidade Antiga",
      cnes: "2077489",
      cnpjCnes: "60970371000390",
      cnpjBasicoCnes: "60970371",
      possuiCnpjValido: true,
    };
    const resBaixada = resolverCnpjInstituicao(candidatoBaixado, [estBaixado]);
    expect(resBaixada.empresaReceita?.situacaoCadastral).toBe("08"); // 08 = Baixada
  });

  it("deve garantir que o leiaute da Receita NÃO extrai nem ingere dados pessoais (sem CPF, sem QSA)", () => {
    const linhaEstabelecimentoOficial =
      '"60970371";"0001";"28";"1";"HOSPITAL MORUMBI";"02";"19710101";"00";"";"";"19710101";"8610101";"";"AV";"ALBERT EINSTEIN";"627";"";"MORUMBI";"05652900";"SP";"7107";"11";"21511233";"";"";"";"";"contato@hospital.com.br";"";""';

    const parsed = validarLinhaEstabelecimento(linhaEstabelecimentoOficial);
    expect(parsed.valido).toBe(true);
    expect(parsed.registro).toBeDefined();

    const reg = parsed.registro as unknown as Record<string, unknown>;
    // Propriedades proibidas NÃO devem existir no modelo nem no parser
    expect(reg.cpf).toBeUndefined();
    expect(reg.representanteLegal).toBeUndefined();
    expect(reg.socios).toBeUndefined();
    expect(reg.qsa).toBeUndefined();
    expect(reg.dadosPessoais).toBeUndefined();
  });

  it("deve garantir preservação do Agrupamento 1.0.0 e da integridade da instituição CNES", () => {
    // A resolução da Receita atua estritamente como enriquecimento cadastral (ResolucaoCNPJ e EmpresaReceita)
    // Ela NÃO deve sobrepor a regra canônica de agrupamento nem reclassificar o segmento hospitalar
    const candidato: CandidatoCnesCNPJ = {
      instituicaoId: "inst-1",
      instituicaoNome: "Hospital Albert Einstein",
      cnes: "2077488",
      cnpjCnes: "60970371000128",
      cnpjBasicoCnes: "60970371",
      possuiCnpjValido: true,
    };
    const res = resolverCnpjInstituicao(candidato, [estMatriz]);

    // O método e resolução são determinísticos e auditados
    expect(res.tipoResolucao).toBe("EXATO_CNPJ");
    expect(res.confianca).toBe("ALTA");
    expect(res.metodo).toBe("CORRESPONDENCIA_EXATA_CNPJ");
    // Não altera agrupamento nem perde a rastreabilidade da instituição CNES
    expect(res.instituicaoId).toBe("inst-1");
    expect(res.empresaReceita?.cnpj).toBe("60970371000128");
  });
});
