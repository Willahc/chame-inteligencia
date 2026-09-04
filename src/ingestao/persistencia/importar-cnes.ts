import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { CNES_ARQUIVO, CNES_FONTE_URL, CNES_RECURSO_ID, CNES_RECURSO_URL, CNES_VERSAO_IMPORTADOR, parseCsv } from "../origem/cnes";
import { normalizarLinhaCNES, validarRegistro } from "../normalizacao/cnes";
import { StatusLote, StatusRegistroIngestao, TipoDado, NivelConfianca, StatusRevisao } from "@prisma/client";

export type ResultadoImportacao = { loteId: string; lida: number; filtrada: number; aceita: number; rejeitada: number; revisao: number; atualizada: number; publicada: number; duplicidades: number };

const slug = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const id = (prefix: string, value: string) => `${prefix}-${value}`.slice(0, 190);

export async function importarCNES(caminho: string, dataReferencia = new Date()): Promise<ResultadoImportacao> {
  const buffer = await readFile(caminho); const hash = createHash("sha256").update(buffer).digest("hex");
  const texto = buffer.toString("utf8"); const linhas = parseCsv(texto);
  const fonte = await prisma.fonte.upsert({ where: { id: "fonte-cnes-estabelecimentos" }, update: { nome: "CNES - Cadastro Nacional de Estabelecimentos de Saúde", url: CNES_FONTE_URL, identificador: CNES_RECURSO_ID, tipoDado: TipoDado.FATO_OFICIAL }, create: { id: "fonte-cnes-estabelecimentos", nome: "CNES - Cadastro Nacional de Estabelecimentos de Saúde", url: CNES_FONTE_URL, identificador: CNES_RECURSO_ID, tipoDado: TipoDado.FATO_OFICIAL } });
  const loteId = `lote-cnes-${Date.now()}`;
  await prisma.loteIngestao.create({ data: { id: loteId, fonteId: fonte.id, arquivoNome: CNES_ARQUIVO, fonteUrl: CNES_RECURSO_URL, dataReferencia, inicio: new Date(), status: StatusLote.EM_PROCESSAMENTO, versaoImportador: CNES_VERSAO_IMPORTADOR, hashArquivo: hash } });
  const seen = new Set<string>(); let filtrada = 0, aceita = 0, rejeitada = 0, revisao = 0, atualizada = 0, publicada = 0, duplicidades = 0; const erros: unknown[] = [];
  for (const raw of linhas) {
    const r = normalizarLinhaCNES(raw); const v = validarRegistro(r); if (!r.ibge.startsWith("355030")) continue; filtrada += 1;
    if (r.cnes && seen.has(r.cnes)) { duplicidades += 1; v.erros.push("CNES duplicado no lote"); }
    if (r.cnes) seen.add(r.cnes);
    const status = v.erros.some((e) => e.includes("ausente") || e.includes("divergente") || e.includes("aderência") || e.includes("duplicado")) ? StatusRegistroIngestao.REJEITADO : (v.revisao ? StatusRegistroIngestao.REVISAO_NECESSARIA : StatusRegistroIngestao.ACEITO);
    if (status === StatusRegistroIngestao.REJEITADO) rejeitada += 1; else if (status === StatusRegistroIngestao.REVISAO_NECESSARIA) revisao += 1; else aceita += 1;
    await prisma.registroBrutoCNES.create({ data: { id: id(`bruto-${loteId}`, String(r.linha)), loteId, linha: r.linha, cnes: r.cnes || null, payloadJson: JSON.stringify(raw), status, errosJson: v.erros.length ? JSON.stringify(v.erros) : null } });
    if (status !== StatusRegistroIngestao.ACEITO || !r.cnes || !v.tipo) { if (v.erros.length) erros.push({ linha: r.linha, erros: v.erros }); continue; }
    const tipoId = `tipo-${slug(v.tipo)}`; await prisma.tipoEstabelecimento.upsert({ where: { id: tipoId }, update: {}, create: { id: tipoId, nome: v.tipo } });
    const existing = await prisma.instituicao.findUnique({ where: { cnes: r.cnes }, select: { id: true } }); if (existing) atualizada += 1;
    const instId = existing?.id ?? `inst-cnes-${r.cnes}`;
    await prisma.instituicao.upsert({ where: { cnes: r.cnes }, update: { nome: r.nomeOriginal, nomeOriginal: r.nomeOriginal, descricao: `Registro oficial CNES ${r.cnes}.`, tipoDado: TipoDado.FATO_OFICIAL, tipoEstabelecimentoId: tipoId, naturezaGestao: r.naturezaGestao || null, situacaoCadastral: r.situacao || null, coberturaDados: [r.cnes, r.nomeOriginal, r.municipio, r.uf, v.tipo, r.logradouro && r.numero && r.bairro && r.cep, r.naturezaGestao].filter(Boolean).length * 14 }, create: { id: instId, slug: `cnes-${r.cnes}`, nome: r.nomeOriginal, descricao: `Registro oficial CNES ${r.cnes}.`, porte: "Não informado", perfilCorporativo: false, tipoDado: TipoDado.FATO_OFICIAL, cnes: r.cnes, nomeOriginal: r.nomeOriginal, naturezaGestao: r.naturezaGestao || null, situacaoCadastral: r.situacao || null, coberturaDados: [r.cnes, r.nomeOriginal, r.municipio, r.uf, v.tipo, r.logradouro && r.numero && r.bairro && r.cep, r.naturezaGestao].filter(Boolean).length * 14, coberturaJustificativa: "Cobertura calculada apenas com campos presentes no CNES; sem enriquecimento externo.", tipoEstabelecimentoId: tipoId } });
    const unidadeId = `unidade-cnes-${r.cnes}`; await prisma.unidade.upsert({ where: { cnes: r.cnes }, update: { nome: r.nomeOriginal, nomeOriginal: r.nomeOriginal, tipoDado: TipoDado.FATO_OFICIAL, instituicaoId: instId, loteOrigemId: loteId }, create: { id: unidadeId, nome: r.nomeOriginal, tipoDado: TipoDado.FATO_OFICIAL, cnes: r.cnes, nomeOriginal: r.nomeOriginal, instituicaoId: instId, loteOrigemId: loteId } });
    await prisma.endereco.upsert({ where: { unidadeId }, update: { logradouro: r.logradouro || "Não informado", numero: r.numero || "Não informado", bairro: r.bairro || "Não informado", municipio: "São Paulo", uf: "SP", tipoDado: TipoDado.FATO_OFICIAL }, create: { id: `endereco-cnes-${r.cnes}`, unidadeId, logradouro: r.logradouro || "Não informado", numero: r.numero || "Não informado", bairro: r.bairro || "Não informado", municipio: "São Paulo", uf: "SP", tipoDado: TipoDado.FATO_OFICIAL } });
    await prisma.evidencia.upsert({ where: { id: `evidencia-cnes-${r.cnes}-${dataReferencia.toISOString().slice(0, 10)}` }, update: { loteId, dataColeta: new Date(), descricao: `Dados oficiais do estabelecimento CNES ${r.cnes}.`, statusRevisao: StatusRevisao.APROVADA }, create: { id: `evidencia-cnes-${r.cnes}-${dataReferencia.toISOString().slice(0, 10)}`, titulo: "Cadastro oficial CNES", descricao: `Dados oficiais do estabelecimento CNES ${r.cnes}.`, observacao: "Sem inferências; campos transcritos e normalizados do arquivo oficial.", dataColeta: new Date(), dataReferencia, tipo: TipoDado.FATO_OFICIAL, confianca: NivelConfianca.ALTA, statusRevisao: StatusRevisao.APROVADA, instituicaoId: instId, fonteId: fonte.id, loteId, origemCampo: "CO_UNIDADE, NO_FANTASIA, TP_UNIDADE, CO_IBGE, CO_UF, NO_LOGRADOURO" } }); publicada += 1;
  }
  const finalStatus = rejeitada || revisao ? StatusLote.CONCLUIDO_COM_ALERTAS : StatusLote.CONCLUIDO;
  await prisma.loteIngestao.update({ where: { id: loteId }, data: { fim: new Date(), status: finalStatus, quantidadeLida: linhas.length, quantidadeAceita: aceita, quantidadeRejeitada: rejeitada, quantidadeRevisao: revisao, quantidadeAtualizada: atualizada, quantidadePublicada: publicada, errosJson: erros.length ? JSON.stringify(erros.slice(0, 100)) : null } });
  return { loteId, lida: linhas.length, filtrada, aceita, rejeitada, revisao, atualizada, publicada, duplicidades };
}
