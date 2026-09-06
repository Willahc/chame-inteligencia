import { CandidatoCnesCNPJ, ResumoCandidatosCNPJ } from "./tipos";
import { desformatarCNPJ, extrairCnpjBasico, validarCNPJ } from "./validacao-cnpj";

export interface RegistroCnesBrutoParaCandidato {
  id: string;
  nome: string;
  cnes: string | null;
  payloadJson: string | null;
}

export function extrairCandidatosNucleoHospitalar(
  registros: RegistroCnesBrutoParaCandidato[]
): ResumoCandidatosCNPJ {
  const cnpjsValidosSet = new Set<string>();
  const cnpjsBasicosSet = new Set<string>();
  const candidatos: CandidatoCnesCNPJ[] = [];

  let comCnpjValido = 0;
  let semCnpjOuInvalido = 0;

  for (const reg of registros) {
    let rawCnpj = "";
    if (reg.payloadJson) {
      try {
        const parsed = JSON.parse(reg.payloadJson);
        rawCnpj = parsed.NU_CNPJ || parsed.cnpj || "";
      } catch {
        rawCnpj = "";
      }
    }

    const cnpjLimpo = desformatarCNPJ(rawCnpj);
    const valido = validarCNPJ(cnpjLimpo);

    if (valido) {
      cnpjsValidosSet.add(cnpjLimpo);
      cnpjsBasicosSet.add(extrairCnpjBasico(cnpjLimpo));
      comCnpjValido++;

      candidatos.push({
        instituicaoId: reg.id,
        instituicaoNome: reg.nome,
        cnes: reg.cnes,
        cnpjCnes: cnpjLimpo,
        cnpjBasicoCnes: extrairCnpjBasico(cnpjLimpo),
        possuiCnpjValido: true,
      });
    } else {
      semCnpjOuInvalido++;
      candidatos.push({
        instituicaoId: reg.id,
        instituicaoNome: reg.nome,
        cnes: reg.cnes,
        cnpjCnes: cnpjLimpo || null,
        cnpjBasicoCnes: cnpjLimpo.length >= 8 ? extrairCnpjBasico(cnpjLimpo) : null,
        possuiCnpjValido: false,
      });
    }
  }

  return {
    totalUnidadesAnalisadas: registros.length,
    unidadesComCnpjValido: comCnpjValido,
    unidadesSemCnpjOuInvalido: semCnpjOuInvalido,
    cnpjsUnicosValidos: Array.from(cnpjsValidosSet).sort(),
    cnpjsBasicosValidos: Array.from(cnpjsBasicosSet).sort(),
    candidatos,
  };
}
