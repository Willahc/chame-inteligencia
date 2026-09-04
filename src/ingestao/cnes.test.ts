import { describe, expect, it } from "vitest";
import { parseCsv } from "./origem/cnes";
import { normalizarLinhaCNES, validarRegistro } from "./normalizacao/cnes";

describe("CNES", () => {
  it("interpreta CSV delimitado por ponto e vírgula", () => {
    const [r] = parseCsv('CO_UNIDADE;CO_IBGE;CO_UF;NO_FANTASIA\n"123";"355030";"35";"Hospital Teste"');
    expect(r.CO_UNIDADE).toBe("123"); expect(r.NO_FANTASIA).toBe("Hospital Teste");
  });
  it("normaliza e aceita hospital de São Paulo", () => {
    const r = normalizarLinhaCNES({ __linha: "2", CO_UNIDADE: "123", CO_IBGE: "355030", CO_UF: "35", NO_FANTASIA: "Hospital Teste", TP_UNIDADE: "Hospital Geral", NO_LOGRADOURO: "Rua A", NU_ENDERECO: "1", NO_BAIRRO: "Centro", CO_CEP: "01000000" });
    expect(validarRegistro(r).aceita).toBe(true);
  });
  it("rejeita CNES ausente e município divergente", () => {
    const r = normalizarLinhaCNES({ __linha: "2", CO_IBGE: "999999", CO_UF: "99", NO_FANTASIA: "Hospital" });
    const v = validarRegistro(r); expect(v.aceita).toBe(false); expect(v.erros.join(" ")).toContain("CNES ausente");
  });
});
