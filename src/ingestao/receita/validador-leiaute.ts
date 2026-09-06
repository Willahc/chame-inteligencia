import {
  RegistroEmpresaRFB,
  RegistroEstabelecimentoRFB,
} from "../../domain/receita/tipos";
import {
  desformatarCNPJ,
  validarCNPJ,
} from "../../domain/receita/validacao-cnpj";

export interface ResultadoValidacaoLinha<T> {
  valido: boolean;
  erro?: string;
  registro?: T;
}

export function parsearLinhaCsv(linha: string): string[] {
  // Trata campos delimitados por ponto e vírgula e opcionalmente com aspas
  const campos: string[] = [];
  let atual = "";
  let dentroAspas = false;

  for (let i = 0; i < linha.length; i++) {
    const char = linha[i];
    if (char === '"') {
      if (dentroAspas && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else {
        dentroAspas = !dentroAspas;
      }
    } else if (char === ";" && !dentroAspas) {
      campos.push(atual.trim());
      atual = "";
    } else {
      atual += char;
    }
  }
  campos.push(atual.trim());

  return campos;
}

export function validarLinhaEstabelecimento(
  linha: string
): ResultadoValidacaoLinha<RegistroEstabelecimentoRFB> {
  if (!linha || linha.trim().length === 0) {
    return { valido: false, erro: "Linha vazia" };
  }

  const campos = parsearLinhaCsv(linha);

  // Layout oficial RFB tem exatamente 30 colunas
  if (campos.length < 30) {
    return {
      valido: false,
      erro: `Quantidade de colunas insuficiente: esperado 30, recebido ${campos.length}`,
    };
  }

  const cnpjBasico = desformatarCNPJ(campos[0]);
  const cnpjOrdem = desformatarCNPJ(campos[1]);
  const cnpjDv = desformatarCNPJ(campos[2]);
  const cnpjCompleto = `${cnpjBasico}${cnpjOrdem}${cnpjDv}`;

  if (cnpjCompleto.length !== 14 || !validarCNPJ(cnpjCompleto)) {
    return {
      valido: false,
      erro: `CNPJ inválido ou malformatado na linha: ${cnpjCompleto}`,
    };
  }

  const identificadorMatrizFilial = parseInt(campos[3], 10) || 1;
  const nomeFantasia = campos[4] || undefined;
  const situacaoCadastral = campos[5] || "02";

  let dataSituacaoCadastral: Date | undefined;
  if (campos[6] && campos[6].length === 8) {
    const y = parseInt(campos[6].slice(0, 4), 10);
    const m = parseInt(campos[6].slice(4, 6), 10) - 1;
    const d = parseInt(campos[6].slice(6, 8), 10);
    dataSituacaoCadastral = new Date(Date.UTC(y, m, d));
  }

  const motivoSituacaoCadastral = campos[7] || undefined;

  let dataInicioAtividade: Date | undefined;
  if (campos[10] && campos[10].length === 8) {
    const y = parseInt(campos[10].slice(0, 4), 10);
    const m = parseInt(campos[10].slice(4, 6), 10) - 1;
    const d = parseInt(campos[10].slice(6, 8), 10);
    dataInicioAtividade = new Date(Date.UTC(y, m, d));
  }

  const cnaeFiscalPrincipal = campos[11] || undefined;
  const cnaeFiscalSecundaria = campos[12] || undefined;
  const tipoLogradouro = campos[13] || undefined;
  const logradouro = campos[14] || undefined;
  const numero = campos[15] || undefined;
  const complemento = campos[16] || undefined;
  const bairro = campos[17] || undefined;
  const cep = desformatarCNPJ(campos[18]) || undefined;
  const uf = campos[19] || undefined;
  const municipio = campos[20] || undefined;

  return {
    valido: true,
    registro: {
      cnpjBasico,
      cnpjOrdem,
      cnpjDv,
      cnpjCompleto,
      identificadorMatrizFilial,
      nomeFantasia,
      situacaoCadastral,
      dataSituacaoCadastral,
      motivoSituacaoCadastral,
      dataInicioAtividade,
      cnaeFiscalPrincipal,
      cnaeFiscalSecundaria,
      tipoLogradouro,
      logradouro,
      numero,
      complemento,
      bairro,
      cep,
      uf,
      municipio,
    },
  };
}

export function validarLinhaEmpresa(
  linha: string
): ResultadoValidacaoLinha<RegistroEmpresaRFB> {
  if (!linha || linha.trim().length === 0) {
    return { valido: false, erro: "Linha vazia" };
  }

  const campos = parsearLinhaCsv(linha);

  // Layout oficial RFB tem 7 colunas
  if (campos.length < 7) {
    return {
      valido: false,
      erro: `Quantidade de colunas insuficiente: esperado 7, recebido ${campos.length}`,
    };
  }

  const cnpjBasico = desformatarCNPJ(campos[0]);
  if (cnpjBasico.length !== 8) {
    return {
      valido: false,
      erro: `CNPJ básico inválido: esperado 8 dígitos, recebido ${cnpjBasico}`,
    };
  }

  const razaoSocial = campos[1] || "";
  const naturezaJuridica = campos[2] || "";
  const qualificacaoResponsavel = campos[3] || "";
  const capitalSocial = parseFloat((campos[4] || "0").replace(",", ".")) || 0;
  const porteEmpresa = campos[5] || "05";
  const enteFederativoResponsavel = campos[6] || undefined;

  return {
    valido: true,
    registro: {
      cnpjBasico,
      razaoSocial,
      naturezaJuridica,
      qualificacaoResponsavel,
      capitalSocial,
      porteEmpresa,
      enteFederativoResponsavel,
    },
  };
}
