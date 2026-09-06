import { describe, expect, it } from "vitest";
import {
  calcularHashRegistroOriginal,
  detectarSinalMobilidade,
  extrairOrgaoDefensivo,
  extrairUnidadeDefensivo,
  validarLoteRegistrosPNCP,
  validarRegistroPNCP,
} from "./validador-pncp";
import type { RegistroPNCPBruto } from "./tipos";

describe("PNCP — Validação e Processamento de Sinais de Contratação", () => {
  it("valida registro completo com sucesso e classifica como FATO_PUBLICO", () => {
    const raw: RegistroPNCPBruto = {
      numeroControlePNCP: "12345678000195-1-000001/2026",
      modalidadeId: 6,
      modalidadeNome: "Pregão Eletrônico",
      dataPublicacaoPncp: "2026-08-15T10:00:00",
      objetoCompra: "Contratação de serviço de transporte sanitário de pacientes",
      valorTotalEstimado: 250000.5,
      orgao: {
        cnpj: "12345678000195",
        razaoSocial: "Hospital das Clínicas de São Paulo",
        esfera: "E",
        poder: "E",
      },
      unidade: {
        municipio: "São Paulo",
        uf: "SP",
        nome: "Diretoria de Logística",
      },
      keywordsEncontradas: ["transporte", "paciente", "hospital"],
      sinalMobilidade: true,
    };

    const res = validarRegistroPNCP(raw, 0);
    expect(res.sucesso).toBe(true);
    if (res.sucesso) {
      expect(res.dado.identificadorPNCP).toBe("12345678000195-1-000001/2026");
      expect(res.dado.tipoDado).toBe("FATO_PUBLICO");
      expect(res.dado.confianca).toBe("ALTA");
      expect(res.dado.statusRevisao).toBe("APROVADA");
      expect(res.dado.cnpjOrgao).toBe("12345678000195");
      expect(res.dado.razaoSocialOrgao).toBe("Hospital das Clínicas de São Paulo");
      expect(res.dado.municipio).toBe("São Paulo");
      expect(res.dado.uf).toBe("SP");
      expect(res.dado.sinalMobilidade).toBe(true);
      expect(res.dado.valorEstimado).toBe(250000.5);
      expect(res.dado.hashRegistro).toBeDefined();
    }
  });

  it("rejeita registro sem identificador PNCP (numeroControlePNCP ausente ou vazio)", () => {
    const semId: RegistroPNCPBruto = {
      objetoCompra: "Aquisição de medicamentos",
      modalidadeNome: "Dispensa",
    };

    const res = validarRegistroPNCP(semId, 1);
    expect(res.sucesso).toBe(false);
    if (!res.sucesso) {
      expect(res.rejeicao.motivo).toContain("Identificador PNCP");
    }
  });

  it("rejeita registro sem objeto de compra (objetoCompra ausente ou vazio)", () => {
    const semObjeto: RegistroPNCPBruto = {
      numeroControlePNCP: "99999999000199-1-000002/2026",
      objetoCompra: "   ",
    };

    const res = validarRegistroPNCP(semObjeto, 2);
    expect(res.sucesso).toBe(false);
    if (!res.sucesso) {
      expect(res.rejeicao.motivo).toContain("Objeto da compra");
    }
  });

  it("trata defensivamente órgãos e unidades serializados em formato texto @{...} sem inventar dados", () => {
    const textoOrgao = "@{cnpj=46587275000174; razaoSocial=MUNICIPIO}";
    const textoUnidade = "@{municipio=Santos; uf=SP}";

    const extraidoOrgao = extrairOrgaoDefensivo(textoOrgao);
    expect(extraidoOrgao.valido).toBe(false);
    expect(extraidoOrgao.cnpj).toBeNull();
    expect(extraidoOrgao.razaoSocial).toBeNull();
    expect(extraidoOrgao.motivoInvalido).toContain("@{...}");

    const extraidaUnidade = extrairUnidadeDefensivo(textoUnidade);
    expect(extraidaUnidade.valido).toBe(false);
    expect(extraidaUnidade.municipio).toBeNull();
    expect(extraidaUnidade.uf).toBeNull();
    expect(extraidaUnidade.motivoInvalido).toContain("@{...}");

    // Registro com esse defeito deve ser aceito como sinal, mas com campos orgao nulos, sem inventar
    const raw: RegistroPNCPBruto = {
      numeroControlePNCP: "11111111000111-1-000003/2026",
      dataPublicacaoPncp: "2026-08-15T10:00:00",
      objetoCompra: "Manutenção predial hospitalar",
      orgao: textoOrgao,
      unidade: textoUnidade,
    };

    const res = validarRegistroPNCP(raw, 3);
    expect(res.sucesso).toBe(true);
    if (res.sucesso) {
      expect(res.dado.cnpjOrgao).toBeNull();
      expect(res.dado.razaoSocialOrgao).toBeNull();
      expect(res.dado.municipio).toBeNull();
      expect(res.dado.uf).toBeNull();
    }
  });

  it("identifica corretamente sinais de mobilidade e transporte corporativo", () => {
    expect(detectarSinalMobilidade("Locação de frotas de veículos com motorista")).toBe(true);
    expect(detectarSinalMobilidade("Serviço de táxi e transporte de passageiros")).toBe(true);
    expect(detectarSinalMobilidade("Remoção de pacientes em ambulância UTI")).toBe(true);
    expect(detectarSinalMobilidade("Aquisição de seringas e agulhas descartáveis")).toBe(false);
    expect(detectarSinalMobilidade("Fornecimento de oxigênio hospitalar medicinal")).toBe(false);
  });

  it("trata valor estimado ausente, zero ou negativo como null", () => {
    const rawZero: RegistroPNCPBruto = {
      numeroControlePNCP: "12345678000195-1-000004/2026",
      dataPublicacaoPncp: "2026-08-15T10:00:00",
      objetoCompra: "Serviço hospitalar",
      valorTotalEstimado: 0,
    };
    const resZero = validarRegistroPNCP(rawZero, 4);
    expect(resZero.sucesso).toBe(true);
    if (resZero.sucesso) {
      expect(resZero.dado.valorEstimado).toBeNull();
    }

    const rawNeg: RegistroPNCPBruto = {
      numeroControlePNCP: "12345678000195-1-000005/2026",
      dataPublicacaoPncp: "2026-08-15T10:00:00",
      objetoCompra: "Serviço hospitalar",
      valorTotalEstimado: -50,
    };
    const resNeg = validarRegistroPNCP(rawNeg, 5);
    expect(resNeg.sucesso).toBe(true);
    if (resNeg.sucesso) {
      expect(resNeg.dado.valorEstimado).toBeNull();
    }
  });

  it("gera hash SHA-256 determinístico independente da ordem das chaves", () => {
    const obj1 = { b: 2, a: 1, c: "teste" };
    const obj2 = { a: 1, c: "teste", b: 2 };

    const hash1 = calcularHashRegistroOriginal(obj1);
    const hash2 = calcularHashRegistroOriginal(obj2);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[A-F0-9]{64}$/);
  });

  it("processa lote misto contabilizando válidos, rejeitados e sinais de mobilidade", () => {
    const lote: RegistroPNCPBruto[] = [
      {
        numeroControlePNCP: "REG-01",
        dataPublicacaoPncp: "2026-08-15T10:00:00",
        objetoCompra: "Transporte sanitário de pacientes",
        sinalMobilidade: true,
      },
      {
        numeroControlePNCP: "", // Inválido (sem id)
        dataPublicacaoPncp: "2026-08-15T10:00:00",
        objetoCompra: "Serviço qualquer",
      },
      {
        numeroControlePNCP: "REG-03",
        dataPublicacaoPncp: "2026-08-15T10:00:00",
        objetoCompra: "Aquisição de gases medicinais",
        sinalMobilidade: false,
      },
    ];

    const resultado = validarLoteRegistrosPNCP(lote);
    expect(resultado.totalLidos).toBe(3);
    expect(resultado.validos.length).toBe(2);
    expect(resultado.rejeitados.length).toBe(1);
    expect(resultado.totalMobilidade).toBe(1);
  });

  it("rejeita data de publicação ausente ou inválida sem usar a data atual", () => {
    const ausente = validarRegistroPNCP({ numeroControlePNCP: "REG-DATA-1", objetoCompra: "Serviço hospitalar" }, 0);
    expect(ausente.sucesso).toBe(false);
    const invalida = validarRegistroPNCP({ numeroControlePNCP: "REG-DATA-2", objetoCompra: "Serviço hospitalar", dataPublicacaoPncp: "não-é-data" }, 1);
    expect(invalida.sucesso).toBe(false);
  });

  it("não considera CNPJ com dígitos verificadores inválidos como correspondência", () => {
    const resultado = extrairOrgaoDefensivo({ cnpj: "12345678000190", razaoSocial: "Órgão" });
    expect(resultado.cnpj).toBeNull();
    expect(resultado.valido).toBe(true);
  });
});
