import {
  CandidatoCnesCNPJ,
  ContratoResolucaoCNPJ,
  RegistroEstabelecimentoRFB,
} from "./tipos";

export function resolverCnpjInstituicao(
  candidato: CandidatoCnesCNPJ,
  estabelecimentosReceita: RegistroEstabelecimentoRFB[],
  razoesSociaisPorBasico?: Map<string, string>
): ContratoResolucaoCNPJ {
  // Caso 1: Candidato não possui CNPJ válido informado no CNES
  if (!candidato.possuiCnpjValido || !candidato.cnpjCnes) {
    return {
      instituicaoId: candidato.instituicaoId,
      cnes: candidato.cnes,
      cnpjCnes: candidato.cnpjCnes,
      cnpjBasicoCnes: candidato.cnpjBasicoCnes,
      empresaReceitaId: null,
      tipoResolucao: "NAO_RESOLVIDO",
      tipoDado: "FATO_OFICIAL",
      confianca: "BAIXA",
      statusRevisao: "APROVADA",
      metodo: "CNPJ_AUSENTE_NO_CNES",
      justificativa: "Unidade CNES não possui número de CNPJ cadastrado ou possui formato inválido",
      empresaReceita: null,
    };
  }

  // Busca correspondência exata de 14 dígitos
  const exatos = estabelecimentosReceita.filter(
    (e) => e.cnpjCompleto === candidato.cnpjCnes
  );

  if (exatos.length === 1) {
    const est = exatos[0];
    const razaoSocial = razoesSociaisPorBasico?.get(est.cnpjBasico) || est.nomeFantasia || candidato.instituicaoNome;

    return {
      instituicaoId: candidato.instituicaoId,
      cnes: candidato.cnes,
      cnpjCnes: candidato.cnpjCnes,
      cnpjBasicoCnes: candidato.cnpjBasicoCnes,
      empresaReceitaId: est.cnpjCompleto,
      tipoResolucao: "EXATO_CNPJ",
      tipoDado: "FATO_OFICIAL",
      confianca: "ALTA",
      statusRevisao: "APROVADA",
      metodo: "CORRESPONDENCIA_EXATA_CNPJ",
      justificativa: `CNPJ da unidade CNES (${candidato.cnpjCnes}) idêntico ao estabelecimento oficial da Receita Federal`,
      empresaReceita: {
        cnpj: est.cnpjCompleto,
        cnpjBasico: est.cnpjBasico,
        identificadorMatrizFilial: est.identificadorMatrizFilial,
        razaoSocial,
        nomeFantasia: est.nomeFantasia || null,
        situacaoCadastral: est.situacaoCadastral || null,
        uf: est.uf || null,
        municipio: est.municipio || null,
      },
    };
  }

  if (exatos.length > 1) {
    return {
      instituicaoId: candidato.instituicaoId,
      cnes: candidato.cnes,
      cnpjCnes: candidato.cnpjCnes,
      cnpjBasicoCnes: candidato.cnpjBasicoCnes,
      empresaReceitaId: exatos[0].cnpjCompleto,
      tipoResolucao: "CONFLITO",
      tipoDado: "FATO_OFICIAL",
      confianca: "BAIXA",
      statusRevisao: "PENDENTE",
      metodo: "DUPLICIDADE_CADASTRAL_RECEITA",
      justificativa: `Encontrados ${exatos.length} registros cadastrais com o mesmo CNPJ (${candidato.cnpjCnes}) na base Receita`,
      divergencias: [
        {
          campo: "cnpjCompleto",
          valorCnes: candidato.cnpjCnes,
          valorReceita: exatos.map((e) => e.cnpjCompleto),
          descricao: "Mais de um registro oficial retornado para o mesmo número de CNPJ",
        },
      ],
      empresaReceita: null,
    };
  }

  // Se não encontrou correspondência exata, busca estabelecimentos com o mesmo CNPJ básico (8 dígitos)
  if (candidato.cnpjBasicoCnes) {
    const doMesmoBasico = estabelecimentosReceita.filter(
      (e) => e.cnpjBasico === candidato.cnpjBasicoCnes
    );

    if (doMesmoBasico.length > 0) {
      // Verifica se há matriz identificada (identificadorMatrizFilial === 1)
      const matriz = doMesmoBasico.find((e) => e.identificadorMatrizFilial === 1);
      const estReferencia = matriz || doMesmoBasico[0];
      const razaoSocial = razoesSociaisPorBasico?.get(estReferencia.cnpjBasico) || estReferencia.nomeFantasia || candidato.instituicaoNome;

      if (matriz) {
        return {
          instituicaoId: candidato.instituicaoId,
          cnes: candidato.cnes,
          cnpjCnes: candidato.cnpjCnes,
          cnpjBasicoCnes: candidato.cnpjBasicoCnes,
          empresaReceitaId: matriz.cnpjCompleto,
          tipoResolucao: "MATRIZ_FILIAL",
          tipoDado: "FATO_OFICIAL",
          confianca: "ALTA",
          statusRevisao: "APROVADA",
          metodo: "VINCULO_OFICIAL_MATRIZ_RECEITA",
          justificativa: `Identificada matriz oficial (${matriz.cnpjCompleto}) para a raiz de CNPJ básico ${candidato.cnpjBasicoCnes}`,
          empresaReceita: {
            cnpj: matriz.cnpjCompleto,
            cnpjBasico: matriz.cnpjBasico,
            identificadorMatrizFilial: matriz.identificadorMatrizFilial,
            razaoSocial,
            nomeFantasia: matriz.nomeFantasia || null,
            situacaoCadastral: matriz.situacaoCadastral || null,
            uf: matriz.uf || null,
            municipio: matriz.municipio || null,
          },
        };
      }

      return {
        instituicaoId: candidato.instituicaoId,
        cnes: candidato.cnes,
        cnpjCnes: candidato.cnpjCnes,
        cnpjBasicoCnes: candidato.cnpjBasicoCnes,
        empresaReceitaId: estReferencia.cnpjCompleto,
        tipoResolucao: "MESMO_CNPJ_BASICO",
        tipoDado: "FATO_OFICIAL",
        confianca: "MEDIA",
        statusRevisao: "APROVADA",
        metodo: "MESMA_RAIZ_EMPRESARIAL_RECEITA",
        justificativa: `Unidade CNES compartilha a mesma raiz de CNPJ básico (${candidato.cnpjBasicoCnes}) com outros estabelecimentos oficiais`,
        empresaReceita: {
          cnpj: estReferencia.cnpjCompleto,
          cnpjBasico: estReferencia.cnpjBasico,
          identificadorMatrizFilial: estReferencia.identificadorMatrizFilial,
          razaoSocial,
          nomeFantasia: estReferencia.nomeFantasia || null,
          situacaoCadastral: estReferencia.situacaoCadastral || null,
          uf: estReferencia.uf || null,
          municipio: estReferencia.municipio || null,
        },
      };
    }
  }

  // Não localizado na base oficial
  return {
    instituicaoId: candidato.instituicaoId,
    cnes: candidato.cnes,
    cnpjCnes: candidato.cnpjCnes,
    cnpjBasicoCnes: candidato.cnpjBasicoCnes,
    empresaReceitaId: null,
    tipoResolucao: "NAO_RESOLVIDO",
    tipoDado: "FATO_OFICIAL",
    confianca: "BAIXA",
    statusRevisao: "APROVADA",
    metodo: "CNPJ_NAO_LOCALIZADO_NA_BASE_RECEITA",
    justificativa: `CNPJ ${candidato.cnpjCnes} não localizado entre os estabelecimentos da base oficial informada`,
    empresaReceita: null,
  };
}
