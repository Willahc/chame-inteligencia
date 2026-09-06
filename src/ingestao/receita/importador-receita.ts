import * as fs from "node:fs";
import * as readline from "node:readline";
import * as crypto from "node:crypto";
import {
  CandidatoCnesCNPJ,
  ContratoResolucaoCNPJ,
  RegistroEmpresaRFB,
  RegistroEstabelecimentoRFB,
} from "../../domain/receita/tipos";
import {
  validarLinhaEmpresa,
  validarLinhaEstabelecimento,
} from "./validador-leiaute";
import { resolverCnpjInstituicao } from "../../domain/receita/resolucao-cnpj";

export interface OpcoesImportacaoReceita {
  caminhoEstabelecimentos?: string;
  caminhoEmpresas?: string;
  candidatos: CandidatoCnesCNPJ[];
  competencia?: string;
  modoSimulacao?: boolean;
}

export interface RelatorioImportacaoReceita {
  sucesso: boolean;
  competencia: string;
  hashArquivoEstabelecimentos?: string;
  hashArquivoEmpresas?: string;
  linhasLidasEstabelecimentos: number;
  linhasFiltradasEstabelecimentos: number;
  linhasInvalidasEstabelecimentos: number;
  linhasLidasEmpresas: number;
  linhasFiltradasEmpresas: number;
  estabelecimentosCarregados: number;
  empresasCarregadas: number;
  resolucoesCalculadas: number;
  distribuicaoResolucoes: Record<string, number>;
  resolucoes: ContratoResolucaoCNPJ[];
  estabelecimentos: RegistroEstabelecimentoRFB[];
  empresas: RegistroEmpresaRFB[];
  tempoExecucaoMs: number;
}

export async function calcularSha256Arquivo(caminhoArquivo: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(caminhoArquivo);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", (err) => reject(err));
  });
}

export class ImportadorReceitaLocal {
  /**
   * Processa arquivos oficiais da Receita Federal em modo streaming/chunk,
   * aplicando filtro de candidatos em memória constante.
   */
  async processar(opcoes: OpcoesImportacaoReceita): Promise<RelatorioImportacaoReceita> {
    const inicio = Date.now();
    const competencia = opcoes.competencia || "2026-08";

    // Conjuntos de busca rápida para filtro em streaming
    const cnpjsCandidatosSet = new Set<string>();
    const cnpjsBasicosCandidatosSet = new Set<string>();

    for (const c of opcoes.candidatos) {
      if (c.cnpjCnes && c.possuiCnpjValido) {
        cnpjsCandidatosSet.add(c.cnpjCnes);
      }
      if (c.cnpjBasicoCnes) {
        cnpjsBasicosCandidatosSet.add(c.cnpjBasicoCnes);
      }
    }

    let hashEstabelecimentos: string | undefined;
    let hashEmpresas: string | undefined;

    const estabelecimentosFiltrados: RegistroEstabelecimentoRFB[] = [];
    const empresasFiltradas: RegistroEmpresaRFB[] = [];
    const razoesSociaisPorBasico = new Map<string, string>();

    let linhasLidasEstab = 0;
    let linhasFiltradasEstab = 0;
    let linhasInvalidasEstab = 0;

    let linhasLidasEmp = 0;
    let linhasFiltradasEmp = 0;

    // 1. Processa Empresas (se fornecido)
    if (opcoes.caminhoEmpresas && fs.existsSync(opcoes.caminhoEmpresas)) {
      hashEmpresas = await calcularSha256Arquivo(opcoes.caminhoEmpresas);
      const stream = fs.createReadStream(opcoes.caminhoEmpresas, { encoding: "latin1" });
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

      for await (const linha of rl) {
        linhasLidasEmp++;
        if (!linha || linha.trim().length === 0) continue;

        // Otimização streaming: extrai cnpjBasico rápido antes do parse completo
        const primeiroPontoVirgula = linha.indexOf(";");
        const cnpjBasicoCru = primeiroPontoVirgula !== -1 ? linha.slice(0, primeiroPontoVirgula).replace(/\D/g, "") : "";

        if (cnpjsBasicosCandidatosSet.has(cnpjBasicoCru)) {
          const res = validarLinhaEmpresa(linha);
          if (res.valido && res.registro) {
            linhasFiltradasEmp++;
            empresasFiltradas.push(res.registro);
            razoesSociaisPorBasico.set(res.registro.cnpjBasico, res.registro.razaoSocial);
          }
        }
      }
    }

    // 2. Processa Estabelecimentos (se fornecido)
    if (opcoes.caminhoEstabelecimentos && fs.existsSync(opcoes.caminhoEstabelecimentos)) {
      hashEstabelecimentos = await calcularSha256Arquivo(opcoes.caminhoEstabelecimentos);
      const stream = fs.createReadStream(opcoes.caminhoEstabelecimentos, { encoding: "latin1" });
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

      for await (const linha of rl) {
        linhasLidasEstab++;
        if (!linha || linha.trim().length === 0) continue;

        // Extrai cnpjBasico rápido
        const idx1 = linha.indexOf(";");
        const cnpjBasicoCru = idx1 !== -1 ? linha.slice(0, idx1).replace(/\D/g, "") : "";

        // Só faz validação e parse se o CNPJ básico estiver no universo dos candidatos
        if (cnpjsBasicosCandidatosSet.has(cnpjBasicoCru)) {
          const res = validarLinhaEstabelecimento(linha);
          if (res.valido && res.registro) {
            linhasFiltradasEstab++;
            estabelecimentosFiltrados.push(res.registro);
          } else {
            linhasInvalidasEstab++;
          }
        }
      }
    }

    // 3. Calcula Resoluções determinísticas para cada candidato
    const resolucoes: ContratoResolucaoCNPJ[] = [];
    const distribuicao: Record<string, number> = {
      EXATO_CNPJ: 0,
      MESMO_CNPJ_BASICO: 0,
      MATRIZ_FILIAL: 0,
      NAO_RESOLVIDO: 0,
      CONFLITO: 0,
    };

    for (const candidato of opcoes.candidatos) {
      const resolucao = resolverCnpjInstituicao(
        candidato,
        estabelecimentosFiltrados,
        razoesSociaisPorBasico
      );
      resolucoes.push(resolucao);
      distribuicao[resolucao.tipoResolucao] = (distribuicao[resolucao.tipoResolucao] || 0) + 1;
    }

    const fim = Date.now();

    return {
      sucesso: true,
      competencia,
      hashArquivoEstabelecimentos: hashEstabelecimentos,
      hashArquivoEmpresas: hashEmpresas,
      linhasLidasEstabelecimentos: linhasLidasEstab,
      linhasFiltradasEstabelecimentos: linhasFiltradasEstab,
      linhasInvalidasEstabelecimentos: linhasInvalidasEstab,
      linhasLidasEmpresas: linhasLidasEmp,
      linhasFiltradasEmpresas: linhasFiltradasEmp,
      estabelecimentosCarregados: estabelecimentosFiltrados.length,
      empresasCarregadas: empresasFiltradas.length,
      resolucoesCalculadas: resolucoes.length,
      distribuicaoResolucoes: distribuicao,
      resolucoes,
      estabelecimentos: estabelecimentosFiltrados,
      empresas: empresasFiltradas,
      tempoExecucaoMs: fim - inicio,
    };
  }
}
