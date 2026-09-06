import { describe, expect, it } from "vitest";
import { resolverCnpjInstituicao } from "./resolucao-cnpj";
import { CandidatoCnesCNPJ, RegistroEstabelecimentoRFB } from "./tipos";

describe("Contrato de Resolução CNPJ / Receita Federal", () => {
  const estMatrizEinstein: RegistroEstabelecimentoRFB = {
    cnpjBasico: "60970371",
    cnpjOrdem: "0001",
    cnpjDv: "28",
    cnpjCompleto: "60970371000128",
    identificadorMatrizFilial: 1,
    nomeFantasia: "HOSPITAL ISRAELITA ALBERT EINSTEIN",
    situacaoCadastral: "02",
    uf: "SP",
    municipio: "SAO PAULO",
  };

  const estFilialEinstein: RegistroEstabelecimentoRFB = {
    cnpjBasico: "60970371",
    cnpjOrdem: "0002",
    cnpjDv: "09",
    cnpjCompleto: "60970371000209",
    identificadorMatrizFilial: 2,
    nomeFantasia: "UNIDADE IBIRAPUERA",
    situacaoCadastral: "02",
    uf: "SP",
    municipio: "SAO PAULO",
  };

  it("deve classificar como EXATO_CNPJ quando o CNPJ do CNES for idêntico ao da Receita", () => {
    const candidato: CandidatoCnesCNPJ = {
      instituicaoId: "inst-1",
      instituicaoNome: "Hospital Israelita Albert Einstein",
      cnes: "2077488",
      cnpjCnes: "60970371000128",
      cnpjBasicoCnes: "60970371",
      possuiCnpjValido: true,
    };

    const resolucao = resolverCnpjInstituicao(candidato, [estMatrizEinstein, estFilialEinstein]);

    expect(resolucao.tipoResolucao).toBe("EXATO_CNPJ");
    expect(resolucao.confianca).toBe("ALTA");
    expect(resolucao.metodo).toBe("CORRESPONDENCIA_EXATA_CNPJ");
    expect(resolucao.empresaReceita?.cnpj).toBe("60970371000128");
  });

  it("deve classificar como MATRIZ_FILIAL quando CNPJ não for exato mas matriz for localizada pela raiz", () => {
    const candidato: CandidatoCnesCNPJ = {
      instituicaoId: "inst-99",
      instituicaoNome: "Einstein Outra Unidade",
      cnes: "9999999",
      cnpjCnes: "60970371000209", // É a filial 0002
      cnpjBasicoCnes: "60970371",
      possuiCnpjValido: true,
    };

    // Fornecemos apenas a matriz (sem a filial 0002)
    const resolucao = resolverCnpjInstituicao(candidato, [estMatrizEinstein]);

    expect(resolucao.tipoResolucao).toBe("MATRIZ_FILIAL");
    expect(resolucao.confianca).toBe("ALTA");
    expect(resolucao.metodo).toBe("VINCULO_OFICIAL_MATRIZ_RECEITA");
    expect(resolucao.empresaReceita?.identificadorMatrizFilial).toBe(1);
  });

  it("deve classificar como MESMO_CNPJ_BASICO quando apenas outra filial for localizada pela raiz", () => {
    const candidato: CandidatoCnesCNPJ = {
      instituicaoId: "inst-98",
      instituicaoNome: "Einstein Filial 3",
      cnes: "8888888",
      cnpjCnes: "60970371000390",
      cnpjBasicoCnes: "60970371",
      possuiCnpjValido: true,
    };

    // Apenas a filial 0002 está disponível na lista (sem a matriz 0001)
    const resolucao = resolverCnpjInstituicao(candidato, [estFilialEinstein]);

    expect(resolucao.tipoResolucao).toBe("MESMO_CNPJ_BASICO");
    expect(resolucao.confianca).toBe("MEDIA");
    expect(resolucao.metodo).toBe("MESMA_RAIZ_EMPRESARIAL_RECEITA");
  });

  it("deve classificar como NAO_RESOLVIDO quando CNPJ não existir no CNES", () => {
    const candidato: CandidatoCnesCNPJ = {
      instituicaoId: "inst-sem-cnpj",
      instituicaoNome: "Unidade Comunitária Sem CNPJ",
      cnes: "1111111",
      cnpjCnes: null,
      cnpjBasicoCnes: null,
      possuiCnpjValido: false,
    };

    const resolucao = resolverCnpjInstituicao(candidato, [estMatrizEinstein]);

    expect(resolucao.tipoResolucao).toBe("NAO_RESOLVIDO");
    expect(resolucao.metodo).toBe("CNPJ_AUSENTE_NO_CNES");
    expect(resolucao.empresaReceita).toBeNull();
  });

  it("deve classificar como NAO_RESOLVIDO quando CNPJ não for localizado na base oficial", () => {
    const candidato: CandidatoCnesCNPJ = {
      instituicaoId: "inst-outro",
      instituicaoNome: "Hospital Desconhecido",
      cnes: "2222222",
      cnpjCnes: "00000000000191", // Banco do Brasil
      cnpjBasicoCnes: "00000000",
      possuiCnpjValido: true,
    };

    const resolucao = resolverCnpjInstituicao(candidato, [estMatrizEinstein]);

    expect(resolucao.tipoResolucao).toBe("NAO_RESOLVIDO");
    expect(resolucao.metodo).toBe("CNPJ_NAO_LOCALIZADO_NA_BASE_RECEITA");
  });

  it("deve classificar como CONFLITO em caso de duplicidade na base oficial", () => {
    const estDuplicado1: RegistroEstabelecimentoRFB = {
      ...estMatrizEinstein,
      nomeFantasia: "Hospital A",
    };
    const estDuplicado2: RegistroEstabelecimentoRFB = {
      ...estMatrizEinstein,
      nomeFantasia: "Hospital B Divergente",
    };

    const candidato: CandidatoCnesCNPJ = {
      instituicaoId: "inst-1",
      instituicaoNome: "Hospital Einstein",
      cnes: "2077488",
      cnpjCnes: "60970371000128",
      cnpjBasicoCnes: "60970371",
      possuiCnpjValido: true,
    };

    const resolucao = resolverCnpjInstituicao(candidato, [estDuplicado1, estDuplicado2]);

    expect(resolucao.tipoResolucao).toBe("CONFLITO");
    expect(resolucao.confianca).toBe("BAIXA");
    expect(resolucao.metodo).toBe("DUPLICIDADE_CADASTRAL_RECEITA");
    expect(resolucao.divergencias).toBeDefined();
  });
});
