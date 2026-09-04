import { ehRazaoGenerica, normalizarRazaoSocial, VERSAO_NORMALIZADOR_RAZAO } from "./normalizacao";

export const VERSAO_REGRA_AGRUPAMENTO = "1.0.0";

export const REGRA_VINCULO_OFICIAL_CNPJ = "VINCULO_OFICIAL_CNPJ";
export const REGRA_VINCULO_OFICIAL_MANTENEDORA = "VINCULO_OFICIAL_CNPJ_MANTENEDORA";
export const REGRA_RAZAO_SOCIAL_NORMALIZADA = "RAZAO_SOCIAL_NORMALIZADA";
export const REGRA_SEM_VINCULO_DETECTADO = "SEM_VINCULO_DETECTADO";

export type TipoVinculoGrupo = "OFICIAL" | "PROVAVEL" | "ISOLADO" | "INCERTO";
export type NaturezaClasse = "PUBLICO" | "PRIVADO" | "INDETERMINADO";
export type TipoDadoGrupo = "FATO_OFICIAL" | "HIPOTESE";

export interface UnidadeAgrupamento {
  instituicaoId: string;
  razaoSocial: string;
  cnpj?: string | null;
  cnpjMantenedora?: string | null;
  naturezaJuridicaCode?: string | null;
}

export interface GrupoAgrupado {
  id: string;
  nome: string;
  nomeNormalizado: string | null;
  tipoDado: TipoDadoGrupo;
  tipoVinculo: TipoVinculoGrupo;
  nivelConfianca: "ALTA" | "MEDIA" | "BAIXA";
  tipoEvidencia: string;
  regraAgrupamento: string;
  versaoRegra: string;
  statusRevisao: "NAO_REVISADO" | "APROVADO" | "AJUSTE_NECESSARIO";
  dataCalculo: string;
  natureza: NaturezaClasse;
  observacao: string;
  precisaRevisao: boolean;
  instituicaoIds: string[];
}

export interface ResultadoAgrupamento {
  versaoRegra: string;
  versaoNormalizador: string;
  grupos: GrupoAgrupado[];
}

function hashFnv1a(texto: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

class UniaoDisjunta {
  private pai = new Map<string, string>();

  raiz(no: string): string {
    let atual = no;
    while (this.pai.get(atual) !== atual) {
      const avo = this.pai.get(this.pai.get(atual) ?? atual);
      if (avo) this.pai.set(atual, avo);
      atual = this.pai.get(atual) ?? atual;
    }
    return atual;
  }

  registrar(no: string): void {
    if (!this.pai.has(no)) this.pai.set(no, no);
  }

  unir(a: string, b: string): void {
    this.registrar(a);
    this.registrar(b);
    const ra = this.raiz(a);
    const rb = this.raiz(b);
    if (ra !== rb) this.pai.set(ra, rb);
  }

  componentes(): Map<string, string[]> {
    const grupos = new Map<string, string[]>();
    for (const no of this.pai.keys()) {
      const raiz = this.raiz(no);
      const membros = grupos.get(raiz) ?? [];
      membros.push(no);
      grupos.set(raiz, membros);
    }
    for (const membros of grupos.values()) membros.sort();
    return grupos;
  }
}

export function classificarNatureza(
  naturezaJuridicaCode: string | null | undefined,
): NaturezaClasse {
  if (!naturezaJuridicaCode || !/^\d+$/.test(naturezaJuridicaCode)) return "INDETERMINADO";
  if (naturezaJuridicaCode.startsWith("10") || naturezaJuridicaCode.startsWith("11")) {
    return "PUBLICO";
  }
  return "PRIVADO";
}

function cnpjValido(cnpj: string | null | undefined): boolean {
  if (!cnpj) return false;
  if (!/^\d{14}$/.test(cnpj)) return false;
  if (/^0+$/.test(cnpj)) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  return true;
}

function coletarPorChave(
  unidades: UnidadeAgrupamento[],
  chaveDe: (u: UnidadeAgrupamento) => string | null | undefined,
): Map<string, string[]> {
  const mapa = new Map<string, string[]>();
  for (const u of unidades) {
    const chave = chaveDe(u);
    if (!chave) continue;
    const lista = mapa.get(chave) ?? [];
    lista.push(u.instituicaoId);
    mapa.set(chave, lista);
  }
  for (const lista of mapa.values()) lista.sort();
  return mapa;
}

function valorMaisFrequente(
  membros: string[],
  valorDe: (membro: string) => string | null,
): string | null {
  const contagens = new Map<string, number>();
  for (const membro of membros) {
    const valor = valorDe(membro);
    if (!valor) continue;
    contagens.set(valor, (contagens.get(valor) ?? 0) + 1);
  }
  let melhor = "";
  let maior = 0;
  for (const [valor, qtd] of contagens) {
    if (qtd > maior || (qtd === maior && melhor.localeCompare(valor) > 0)) {
      melhor = valor;
      maior = qtd;
    }
  }
  return maior > 0 ? melhor : null;
}

export function agruparInstituicoes(unidades: UnidadeAgrupamento[]): ResultadoAgrupamento {
  const porCnpj = coletarPorChave(unidades, (u) => (cnpjValido(u.cnpj) ? u.cnpj : null));
  const porMantenedora = coletarPorChave(unidades, (u) =>
    cnpjValido(u.cnpjMantenedora) ? u.cnpjMantenedora : null,
  );

  const razaoPorId = new Map<string, string>();
  const porRazao = new Map<string, string[]>();
  for (const u of unidades) {
    const normalizada = normalizarRazaoSocial(u.razaoSocial);
    if (!normalizada) continue;
    razaoPorId.set(u.instituicaoId, normalizada);
    if (ehRazaoGenerica(normalizada, u.razaoSocial)) continue;
    const lista = porRazao.get(normalizada) ?? [];
    lista.push(u.instituicaoId);
    porRazao.set(normalizada, lista);
  }
  for (const lista of porRazao.values()) lista.sort();

  const unionFind = new UniaoDisjunta();
  for (const u of unidades) unionFind.registrar(u.instituicaoId);

  const cnpjPorComponente = new Map<string, string>();
  const mantenedoraPorComponente = new Map<string, string>();

  for (const [cnpj, ids] of porCnpj) {
    if (ids.length < 2) continue;
    for (let i = 1; i < ids.length; i += 1) unionFind.unir(ids[0], ids[i]);
    cnpjPorComponente.set(cnpj, ids[0]);
  }
  for (const [cnpj, ids] of porMantenedora) {
    if (ids.length < 2) continue;
    for (let i = 1; i < ids.length; i += 1) unionFind.unir(ids[0], ids[i]);
    mantenedoraPorComponente.set(cnpj, ids[0]);
  }

  for (const [, ids] of porRazao) {
    if (ids.length < 2) continue;
    for (let i = 1; i < ids.length; i += 1) unionFind.unir(ids[0], ids[i]);
  }

  const dadosPorId = new Map(
    unidades.map((u) => [
      u.instituicaoId,
      { natureza: classificarNatureza(u.naturezaJuridicaCode), razao: u.razaoSocial, razaoNormalizada: razaoPorId.get(u.instituicaoId) ?? null },
    ]),
  );

  const grupos: GrupoAgrupado[] = [];
  for (const membros of unionFind.componentes().values()) {
    const naturezaPorMembro = membros.map((id) => dadosPorId.get(id)?.natureza ?? "INDETERMINADO");
    const temPublico = naturezaPorMembro.includes("PUBLICO");
    const temPrivado = naturezaPorMembro.includes("PRIVADO");
    const misturaNatureza = temPublico && temPrivado;

    const natureza = temPublico && !temPrivado ? "PUBLICO" : temPrivado && !temPublico ? "PRIVADO" : "INDETERMINADO";

    let usaCnpjOficial = "";
    let usaMantenedoraOficial = "";
    if (membros.length > 1) {
      for (const [cnpj, idRef] of cnpjPorComponente) {
        if (unionFind.raiz(idRef) === unionFind.raiz(membros[0])) {
          usaCnpjOficial = cnpj;
          break;
        }
      }
      for (const [cnpj, idRef] of mantenedoraPorComponente) {
        if (unionFind.raiz(idRef) === unionFind.raiz(membros[0])) {
          usaMantenedoraOficial = cnpj;
          break;
        }
      }
    }

    const razaoNormalizadaMaisFrequente = valorMaisFrequente(
      membros,
      (id) => dadosPorId.get(id)?.razaoNormalizada ?? null,
    );
    const nome = valorMaisFrequente(membros, (id) => dadosPorId.get(id)?.razao ?? null);

    let tipoDado: TipoDadoGrupo;
    let tipoVinculo: TipoVinculoGrupo;
    let nivelConfianca: "ALTA" | "MEDIA" | "BAIXA";
    let tipoEvidencia: string;
    let regraAgrupamento: string;
    let observacao: string;
    let statusRevisao: "NAO_REVISADO" | "APROVADO" | "AJUSTE_NECESSARIO";
    let precisaRevisao: boolean;

    if (membros.length === 1) {
      tipoDado = "FATO_OFICIAL";
      tipoVinculo = "ISOLADO";
      nivelConfianca = "MEDIA";
      tipoEvidencia = "Sem outra unidade no CNES com razão social normalizada idêntica ou vínculo oficial declarado.";
      regraAgrupamento = REGRA_SEM_VINCULO_DETECTADO;
      observacao =
        "Agrupamento isolado: nenhuma outra unidade no CNES compartilha razão social normalizada ou vínculo oficial. Vínculo por mantenedora não é ingerido nesta etapa.";
      statusRevisao = "NAO_REVISADO";
      precisaRevisao = false;
    } else if (misturaNatureza) {
      tipoDado = "HIPOTESE";
      tipoVinculo = "INCERTO";
      nivelConfianca = "BAIXA";
      tipoEvidencia =
        "Razão social normalizada idêntica com natureza jurídica divergente (pública e privada) entre unidades — requer revisão manual.";
      regraAgrupamento = REGRA_RAZAO_SOCIAL_NORMALIZADA;
      observacao = "Agrupamento hipotético: naturezas jurídicas divergentes indicam possível coincidência de denominação.";
      statusRevisao = "AJUSTE_NECESSARIO";
      precisaRevisao = true;
    } else if (usaCnpjOficial || usaMantenedoraOficial) {
      tipoDado = "FATO_OFICIAL";
      tipoVinculo = "OFICIAL";
      nivelConfianca = "ALTA";
      tipoEvidencia = usaCnpjOficial
        ? `CNPJ idêntico declarado no CNES (${usaCnpjOficial}).`
        : `CNPJ mantenedora idêntico declarado no CNES (${usaMantenedoraOficial}).`;
      regraAgrupamento = usaCnpjOficial ? REGRA_VINCULO_OFICIAL_CNPJ : REGRA_VINCULO_OFICIAL_MANTENEDORA;
      observacao = usaCnpjOficial
        ? "Unidades vinculadas por CNPJ declarado no CNES (vinculo oficial inequívoco)."
        : "Unidades vinculadas por CNPJ mantenedora declarado no CNES (vinculo oficial inequívoco).";
      statusRevisao = "NAO_REVISADO";
      precisaRevisao = false;
    } else {
      tipoDado = "HIPOTESE";
      tipoVinculo = "PROVAVEL";
      nivelConfianca = "MEDIA";
      tipoEvidencia = `Razão social normalizada idêntica entre unidades (normalizador v${VERSAO_NORMALIZADOR_RAZAO}).`;
      regraAgrupamento = REGRA_RAZAO_SOCIAL_NORMALIZADA;
      observacao =
        "Agrupamento hipotético inferido por normalização de razão social; ainda não representa vínculo econômico confirmado.";
      statusRevisao = "NAO_REVISADO";
      precisaRevisao = true;
    }

    grupos.push({
      id: membros.length === 1 ? `org-isol-${membros[0]}` : `org-${hashFnv1a(membros.join("|"))}`,
      nome: nome ?? "Sem razão social",
      nomeNormalizado: razaoNormalizadaMaisFrequente,
      tipoDado,
      tipoVinculo,
      nivelConfianca,
      tipoEvidencia,
      regraAgrupamento,
      versaoRegra: VERSAO_REGRA_AGRUPAMENTO,
      statusRevisao,
      dataCalculo: new Date().toISOString(),
      natureza,
      observacao,
      precisaRevisao,
      instituicaoIds: membros,
    });
  }

  grupos.sort((a, b) => a.id.localeCompare(b.id));

  return {
    versaoRegra: VERSAO_REGRA_AGRUPAMENTO,
    versaoNormalizador: VERSAO_NORMALIZADOR_RAZAO,
    grupos,
  };
}