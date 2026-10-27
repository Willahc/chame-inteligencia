import fs from "node:fs";
import path from "node:path";

export type ResumoEcossistemaTaxiSP = {
  disponivel: boolean;
  diretorioOrigem: string;
  taxistas: {
    totalMapeados: number;
    contemplados2026: number;
    meiValidado1Para1: number;
    homonimosBloqueados: number;
    tier1PrioridadeMaxima: number;
    tier2PrioridadeAlta: number;
  };
  pontosTaxi: {
    totalGeocodificados: number;
    matchedOsmDtp: number;
    fallbackGeocodificados: number;
  };
  radar5kmButanta: {
    polosSaudeHospitais: number;
    grandesEmpresasCorporativas: number;
    totalProspectsRaio5km: number;
  };
  conformidadeLgpd: {
    arquivoPublicoPresente: boolean;
    colunasPiiRemovidas: boolean;
  };
};

export type TaxistaMapeado = {
  id: string;
  nome: string;
  melhorIdentificador: string;
  condutax: string;
  protocolo: string;
  processoSei: string;
  alvara: string;
  possuiMei: string;
  meiOrigem: string;
  meiCnpj: string;
  meiRazao: string;
  meiSituacao: string;
  regiaoMacro: string;
  distanciaKm: string;
  statusSorteio: string;
  editalNumero: string;
  editalDescricao: string;
  categoriaVeiculo: string;
  exigenciaVeiculo: string;
  modelosRecomendados: string;
  classificacaoSuplencia: string;
  tempoServicoAnos: string;
  score: number;
  tier: string;
  justificativaScore: string;
  acaoRecomendada: string;
  vinculoPonto: string;
  pontoNumero: string;
  pontoEndereco: string;
  pontoSubprefeitura: string;
  linkDoc: string;
  linkSei: string;
  basesPresentes: string;
  qtdFontes: number;
};

export type PontoTaxiGeo = {
  id: string;
  endereco: string;
  subprefeitura: string;
  regiao: string;
  capacidade: number;
  ocupadas: number;
  saldo: number;
  telefone: string;
  latitude: number;
  longitude: number;
  camadaMatching: string;
  confianca: string;
};

export type PoloCorporativo5km = {
  id: string;
  categoria: "HOSPITAL_SAUDE" | "EMPRESA_CORPORATIVA";
  nome: string;
  grupoOuRazao: string;
  tipoOuSetor: string;
  porteFaixa: string;
  tier: string;
  score: number;
  distanciaKm: number;
  tempoMin: number;
  endereco: string;
  bairro: string;
  telefone: string;
  pontoMaisProximo: string;
  corridasEstimadasMes: string;
  demandaVouchers: string;
  demandaEsg: string;
  fornecedorAtual: string;
  gargaloAtual: string;
  estrategiaAbordagem: string;
  areaDecisora: string;
  cargosDecisores: string;
  liderancasMapeadas: string;
  canalRecomendado: string;
  dominioEmail: string;
  emailCompras: string;
  linkLinkedin: string;
  linkGoogle: string;
  pitchComercial: string;
  latitude: number;
  longitude: number;
};

export type DadosAbertosMobilidadeSP = {
  licencasSgtpTotal: number;
  licencasSgtpReferencia: string;
  frotaAtivaEstado: number;
  frotaAtivaCapital: number;
  frotaPeriodo: string;
  empresasTaxiPjAtivas: number;
  vitimasTaxistaInfosiga: number;
  vitimasFataisInfosiga: number;
  sinistrosTotaisSp: number;
  sinistrosPeriodo: string;
  topSubprefeiturasSinistros: Array<{
    subprefeitura: string;
    sinistros: number;
    fatais: number;
    atropelamentos: number;
  }>;
};

export type FiltrosTaxistas = {
  busca?: string;
  edital?: string;
  status?: string;
  tier?: string;
  mei?: string;
  pagina?: number;
  tamanhoPagina?: number;
};

function resolverDiretorioMapeamento(): string {
  const candidatos = [
    path.resolve(process.cwd(), "../mapeamento_2026-09-29"),
    path.resolve(process.cwd(), "mapeamento_2026-09-29"),
  ];
  for (const dir of candidatos) {
    if (fs.existsSync(dir)) return dir;
  }
  return candidatos[0];
}

function contarLinhasCsv(caminho: string): number {
  if (!fs.existsSync(caminho)) return 0;
  const conteudo = fs.readFileSync(caminho, "utf8");
  const linhas = conteudo.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return Math.max(0, linhas.length - 1);
}

function sanitizarMarcaTexto(texto: string): string {
  return (texto ?? "")
    .replace(/Cooper Chame Táxi/gi, "WiNS Hub Táxi")
    .replace(/Chame Táxi/gi, "WiNS Hub Táxi")
    .replace(/Chame Taxi/gi, "WiNS Hub Táxi");
}

function dividirLinhaCsvPontoVirgula(linha: string): string[] {
  const resultado: string[] = [];
  let atual = "";
  let emAspas = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (ch === '"') {
      if (emAspas && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else {
        emAspas = !emAspas;
      }
    } else if (ch === ";" && !emAspas) {
      resultado.push(atual);
      atual = "";
    } else {
      atual += ch;
    }
  }
  resultado.push(atual);
  return resultado;
}

function lerCsvSimples(caminho: string): Array<Record<string, string>> {
  if (!fs.existsSync(caminho)) return [];
  const conteudo = fs.readFileSync(caminho, "utf8");
  const linhas = conteudo.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (linhas.length <= 1) return [];
  const cabecalho = dividirLinhaCsvPontoVirgula((linhas[0] ?? "").replace(/^\uFEFF/, ""));
  const registros: Array<Record<string, string>> = [];
  for (let i = 1; i < linhas.length; i++) {
    const cols = dividirLinhaCsvPontoVirgula(linhas[i]);
    const obj: Record<string, string> = {};
    for (let j = 0; j < cabecalho.length; j++) {
      obj[cabecalho[j]] = (cols[j] ?? "").trim();
    }
    registros.push(obj);
  }
  return registros;
}

export function carregarResumoEcossistemaTaxiSP(): ResumoEcossistemaTaxiSP {
  const dir = resolverDiretorioMapeamento();
  const caminhoPublico = path.join(dir, "planilha_mestre_taxistas_sp_2026_publico.csv");
  const caminhoPontosOsm = path.join(dir, "data", "processed", "pontos_taxi_sp_consolidado.csv");
  const caminhoPontosFallback = path.join(dir, "data", "processed", "dtp_pontos_sem_osm_geo.csv");
  const caminhoHosp5km = path.join(dir, "clientes_corporativos_hospitais_5km.csv");
  const caminhoEmp5km = path.join(dir, "clientes_corporativos_empresas_5km.csv");

  if (!fs.existsSync(caminhoPublico)) {
    return {
      disponivel: false,
      diretorioOrigem: dir,
      taxistas: {
        totalMapeados: 0,
        contemplados2026: 0,
        meiValidado1Para1: 0,
        homonimosBloqueados: 0,
        tier1PrioridadeMaxima: 0,
        tier2PrioridadeAlta: 0,
      },
      pontosTaxi: {
        totalGeocodificados: 0,
        matchedOsmDtp: 0,
        fallbackGeocodificados: 0,
      },
      radar5kmButanta: {
        polosSaudeHospitais: 0,
        grandesEmpresasCorporativas: 0,
        totalProspectsRaio5km: 0,
      },
      conformidadeLgpd: {
        arquivoPublicoPresente: false,
        colunasPiiRemovidas: false,
      },
    };
  }

  const conteudoPublico = fs.readFileSync(caminhoPublico, "utf8");
  const linhas = conteudoPublico.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const cabecalho = (linhas[0] ?? "").replace(/^\uFEFF/, "").split(";");
  const idxStatus =
    cabecalho.indexOf("Status_Sorteio_2026") !== -1
      ? cabecalho.indexOf("Status_Sorteio_2026")
      : cabecalho.indexOf("Status_Resultado_Sorteio");
  const idxMei = cabecalho.indexOf("Possui_MEI_Ativo");
  const idxTier =
    cabecalho.indexOf("Tier_Prioridade_Chame_Taxi") !== -1
      ? cabecalho.indexOf("Tier_Prioridade_Chame_Taxi")
      : cabecalho.indexOf("Tier_Prioridade_Comercial");

  const colunasProibidas = [
    "CPF_Identificado",
    "Telefone_1",
    "Telefone_2",
    "Email_Principal",
    "MEI_Logradouro",
    "MEI_Numero",
    "MEI_Bairro",
    "MEI_CEP",
  ];
  const colunasPiiRemovidas = colunasProibidas.every((c) => !cabecalho.includes(c));

  let contemplados2026 = 0;
  let meiValidado1Para1 = 0;
  let homonimosBloqueados = 0;
  let tier1PrioridadeMaxima = 0;
  let tier2PrioridadeAlta = 0;

  for (let i = 1; i < linhas.length; i++) {
    const cols = linhas[i].split(";");
    const st = cols[idxStatus] ?? "";
    const mei = cols[idxMei] ?? "";
    const tier = cols[idxTier] ?? "";
    if (st.includes("CONTEMPLADO")) contemplados2026++;
    if (mei.startsWith("Sim")) meiValidado1Para1++;
    if (mei.includes("Homônimo")) homonimosBloqueados++;
    if (tier.startsWith("Tier 1")) tier1PrioridadeMaxima++;
    if (tier.startsWith("Tier 2")) tier2PrioridadeAlta++;
  }

  const matchedOsmDtp = contarLinhasCsv(caminhoPontosOsm);
  let fallbackGeocodificados = 0;
  if (fs.existsSync(caminhoPontosFallback)) {
    const linhasFb = fs.readFileSync(caminhoPontosFallback, "utf8").split(/\r?\n/);
    const cabFb = (linhasFb[0] ?? "").split(";");
    const idxLat = cabFb.indexOf("latitude");
    const idxLon = cabFb.indexOf("longitude");
    for (let i = 1; i < linhasFb.length; i++) {
      if (!linhasFb[i].trim()) continue;
      const c = linhasFb[i].split(";");
      if ((c[idxLat] ?? "").trim() && (c[idxLon] ?? "").trim()) {
        fallbackGeocodificados++;
      }
    }
  }

  const polosSaudeHospitais = contarLinhasCsv(caminhoHosp5km);
  const grandesEmpresasCorporativas = contarLinhasCsv(caminhoEmp5km);

  return {
    disponivel: true,
    diretorioOrigem: dir,
    taxistas: {
      totalMapeados: linhas.length - 1,
      contemplados2026,
      meiValidado1Para1,
      homonimosBloqueados,
      tier1PrioridadeMaxima,
      tier2PrioridadeAlta,
    },
    pontosTaxi: {
      totalGeocodificados: matchedOsmDtp + fallbackGeocodificados,
      matchedOsmDtp,
      fallbackGeocodificados,
    },
    radar5kmButanta: {
      polosSaudeHospitais,
      grandesEmpresasCorporativas,
      totalProspectsRaio5km: polosSaudeHospitais + grandesEmpresasCorporativas,
    },
    conformidadeLgpd: {
      arquivoPublicoPresente: true,
      colunasPiiRemovidas,
    },
  };
}

let cacheTaxistas: TaxistaMapeado[] | null = null;

export function carregarTodosTaxistasPublicos(): TaxistaMapeado[] {
  if (cacheTaxistas) return cacheTaxistas;
  const dir = resolverDiretorioMapeamento();
  const caminhoPublico = path.join(dir, "planilha_mestre_taxistas_sp_2026_publico.csv");
  const brutos = lerCsvSimples(caminhoPublico);

  const lista: TaxistaMapeado[] = brutos.map((r) => {
    const scoreBruto = Number(r.Score_Chame_Taxi || "0");
    return {
      id: r.ID_Master || "",
      nome: r.Nome_Completo || "",
      melhorIdentificador: r.Melhor_Identificador_Busca || "",
      condutax: r.Cadastro_DTP_Condutax || "—",
      protocolo: r.Numero_Protocolo_Inscricao || "—",
      processoSei: r.Processo_SEI_DTP || "—",
      alvara: r.Numero_Alvara_DTP || r.DOC_Alvara_Numero || "—",
      possuiMei: r.Possui_MEI_Ativo || "Não",
      meiOrigem: r.MEI_Origem_Match || "Não localizado",
      meiCnpj: r.MEI_CNPJ || "—",
      meiRazao: r.MEI_Razao_Social || "—",
      meiSituacao: r.MEI_Situacao_Cadastral || "—",
      regiaoMacro: r.MEI_Regiao_Macro || "Não aplicável",
      distanciaKm: r.MEI_Distancia_Sede_Butanta_km || r.MEI_Distancia_Sede_Chame_Taxi_km || "—",
      statusSorteio: r.Status_Sorteio_2026 || "—",
      editalNumero: r.Edital_Numero || "—",
      editalDescricao: r.Edital_Descricao || "—",
      categoriaVeiculo: r.Categoria_Veiculo || "—",
      exigenciaVeiculo: r.Exigencia_Veiculo_DTP || "—",
      modelosRecomendados: r.Modelos_Homologados_Recomendados || "—",
      classificacaoSuplencia: r.Classificacao_Suplencia_Fila || "—",
      tempoServicoAnos: r.Tempo_Servico_Anos || "0",
      score: Number.isFinite(scoreBruto) ? scoreBruto : 0,
      tier: r.Tier_Prioridade_Chame_Taxi || r.Tier_Prioridade_Comercial || "Tier 4",
      justificativaScore: sanitizarMarcaTexto(r.Justificativa_Score_Comercial || r.Justificativa_Score || ""),
      acaoRecomendada: sanitizarMarcaTexto(r.Acao_Comercial_Recomendada || ""),
      vinculoPonto: r.Vinculo_Ponto_Privativo || "—",
      pontoNumero: r.Ponto_Numero || "—",
      pontoEndereco: r.Ponto_Endereco || "—",
      pontoSubprefeitura: r.Ponto_Subprefeitura || "—",
      linkDoc: r.Link_Pesquisa_DOC_SP || "",
      linkSei: r.Link_Pesquisa_SEI_PMSP || "",
      basesPresentes: sanitizarMarcaTexto(r.Bases_Presentes || r.Bases_Identificadas || ""),
      qtdFontes: Number(r.Qtd_Fontes_Cruzadas || "1") || 1,
    };
  });

  lista.sort((a, b) => b.score - a.score);
  cacheTaxistas = lista;
  return lista;
}

export function consultarTaxistasMapeados(filtros: FiltrosTaxistas = {}) {
  const todos = carregarTodosTaxistasPublicos();
  const busca = (filtros.busca ?? "").trim().toUpperCase();
  const edital = (filtros.edital ?? "").trim();
  const status = (filtros.status ?? "").trim().toUpperCase();
  const tier = (filtros.tier ?? "").trim();
  const mei = (filtros.mei ?? "").trim();
  const pagina = Math.max(1, filtros.pagina ?? 1);
  const tamanhoPagina = Math.min(200, Math.max(10, filtros.tamanhoPagina ?? 50));

  const filtrados = todos.filter((t) => {
    if (edital && edital !== "TODOS" && t.editalNumero !== edital) return false;
    if (status && status !== "TODOS") {
      if (status === "CONTEMPLADO" && !t.statusSorteio.toUpperCase().includes("CONTEMPLADO")) return false;
      if (status === "ESPERA" && t.statusSorteio.toUpperCase() !== "ESPERA") return false;
      if (status === "INABILITADO" && !t.statusSorteio.toUpperCase().startsWith("INABILITADO")) return false;
    }
    if (tier && tier !== "TODOS" && !t.tier.startsWith(tier)) return false;
    if (mei && mei !== "TODOS") {
      if (mei === "SIM" && !t.possuiMei.startsWith("Sim")) return false;
      if (mei === "HOMONIMO" && !t.possuiMei.includes("Homônimo")) return false;
      if (mei === "NAO" && t.possuiMei !== "Não") return false;
    }
    if (busca) {
      const alvo = `${t.nome} ${t.condutax} ${t.meiCnpj} ${t.protocolo} ${t.processoSei} ${t.regiaoMacro} ${t.pontoNumero}`.toUpperCase();
      if (!alvo.includes(busca)) return false;
    }
    return true;
  });

  const total = filtrados.length;
  const totalPaginas = Math.max(1, Math.ceil(total / tamanhoPagina));
  const inicio = (pagina - 1) * tamanhoPagina;
  const itens = filtrados.slice(inicio, inicio + tamanhoPagina);

  return {
    itens,
    total,
    pagina,
    tamanhoPagina,
    totalPaginas,
  };
}

export function carregarPontosTaxiGeorreferenciados(): PontoTaxiGeo[] {
  const dir = resolverDiretorioMapeamento();
  const caminhoOsm = path.join(dir, "data", "processed", "pontos_taxi_sp_consolidado.csv");
  const caminhoFb = path.join(dir, "data", "processed", "dtp_pontos_sem_osm_geo.csv");
  const vistos = new Set<string>();
  const pontos: PontoTaxiGeo[] = [];

  for (const r of lerCsvSimples(caminhoOsm)) {
    const id = (r.dtp_ponto_id || "").trim();
    if (!r.latitude?.trim() || !r.longitude?.trim()) continue;
    const lat = Number(r.latitude);
    const lon = Number(r.longitude);
    if (!id || vistos.has(id) || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    vistos.add(id);
    pontos.push({
      id,
      endereco: r.osm_addr_street ? `${r.osm_addr_street}, ${r.osm_addr_housenumber || "S/N"}` : r.dtp_endereco || "",
      subprefeitura: r.geosampa_subprefeitura || r.dtp_subprefeitura_codigo || "SP",
      regiao: r.dtp_regiao || "SP",
      capacidade: Number(r.dtp_vagas_capacidade || "0") || 0,
      ocupadas: Number(r.dtp_vagas_ocupadas || "0") || 0,
      saldo: Number(r.dtp_vagas_saldo || "0") || 0,
      telefone: r.osm_phone || "—",
      latitude: lat,
      longitude: lon,
      camadaMatching: r.matching_layer === "LAYER_1_EXACT_ID" ? "DTP ↔ OSM (ID Exato)" : "DTP ↔ OSM (Endereço)",
      confianca: r.matching_confidence || "ALTA",
    });
  }

  for (const r of lerCsvSimples(caminhoFb)) {
    const id = (r.ponto || "").trim();
    if (!r.latitude?.trim() || !r.longitude?.trim()) continue;
    const lat = Number(r.latitude);
    const lon = Number(r.longitude);
    if (!id || vistos.has(id) || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    vistos.add(id);
    pontos.push({
      id,
      endereco: r.endereco || "",
      subprefeitura: r.sub || "SP",
      regiao: r.regiao || "SP",
      capacidade: Number(r.cap || "0") || 0,
      ocupadas: Number(r.ocup || "0") || 0,
      saldo: Number(r.saldo || "0") || 0,
      telefone: "—",
      latitude: lat,
      longitude: lon,
      camadaMatching: "Geocodificação Viária (DTP)",
      confianca: "MEDIA",
    });
  }

  return pontos;
}

export function carregarPolosCorporativos5km(): PoloCorporativo5km[] {
  const dir = resolverDiretorioMapeamento();
  const caminhoHosp = path.join(dir, "clientes_corporativos_hospitais_5km.csv");
  const caminhoEmp = path.join(dir, "clientes_corporativos_empresas_5km.csv");
  const polos: PoloCorporativo5km[] = [];

  for (const r of lerCsvSimples(caminhoHosp)) {
    const lat = Number(r.Latitude);
    const lon = Number(r.Longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const rawId = (r.ID_Prospect_B2B || "").trim();
    polos.push({
      id: rawId.startsWith("CORP-") ? rawId.replace(/^CORP-/, "HOSP-") : rawId,
      categoria: "HOSPITAL_SAUDE",
      nome: r.Nome_Instituicao || "",
      grupoOuRazao: r.Grupo_Mantenedor || "",
      tipoOuSetor: r.Tipo_Estabelecimento || "Hospital / Saúde",
      porteFaixa: "Alta Complexidade / Turnos 24h",
      tier: r.Tier_Potencial_Comercial || "Tier 1",
      score: Number(r.Score_Afinidade_Chame_Taxi || "85") || 85,
      distanciaKm: Number(r.Distancia_Sede_Chame_Taxi_km || "0") || 0,
      tempoMin: Number(r.Tempo_Estimado_Deslocamento_min || "5") || 5,
      endereco: r.Endereco_Completo || "",
      bairro: r.Bairro || "",
      telefone: r.Telefone_Central || "—",
      pontoMaisProximo: r.Ponto_Taxi_Mais_Proximo || "—",
      corridasEstimadasMes: r.Estimativa_Potencial_Corridas_Mes || "—",
      demandaVouchers: r.Demanda_Vouchers_Plantoes || "Alta",
      demandaEsg: r.Demanda_Frota_ESG_Eletrica || "Alta",
      fornecedorAtual: r.Fornecedor_Atual_Provavel || "—",
      gargaloAtual: r.Gargalo_Dor_Atual || "—",
      estrategiaAbordagem: sanitizarMarcaTexto(r.Estrategia_Ataque_Chame_Taxi || ""),
      areaDecisora: r.Area_Decisora_Principal || "Facilities / Suprimentos",
      cargosDecisores: r.Cargos_Alvo_Decisores || "",
      liderancasMapeadas: r.Nomes_Liderancas_Mapeadas || "—",
      canalRecomendado: r.Canal_Contato_Recomendado || "",
      dominioEmail: r.Dominio_Email_Corporativo || "",
      emailCompras: r.Email_Canal_Compras_Institucional || "",
      linkLinkedin: r.Link_Busca_LinkedIn_Decisores || "",
      linkGoogle: r.Link_Busca_Google_Decisores || "",
      pitchComercial: sanitizarMarcaTexto(r.Proposta_Valor_Pitch_Chame_Taxi || ""),
      latitude: lat,
      longitude: lon,
    });
  }

  for (const r of lerCsvSimples(caminhoEmp)) {
    const lat = Number(r.Latitude);
    const lon = Number(r.Longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    polos.push({
      id: r.ID_Prospect_B2B || "",
      categoria: "EMPRESA_CORPORATIVA",
      nome: r.Nome_Empresa || "",
      grupoOuRazao: r.Razao_Social_Holding || "",
      tipoOuSetor: r.Setor_Economico || "Corporativo",
      porteFaixa: r.Faixa_Colaboradores || `${r.Qtd_Colaboradores_Presenciais_Est || "100+"} colab.`,
      tier: r.Tier_Potencial_Comercial || "Tier 1",
      score: Number(r.Score_Afinidade_Chame_Taxi || "85") || 85,
      distanciaKm: Number(r.Distancia_Sede_Chame_Taxi_km || "0") || 0,
      tempoMin: Number(r.Tempo_Estimado_Deslocamento_min || "5") || 5,
      endereco: r.Endereco_Completo || "",
      bairro: r.Bairro || "",
      telefone: r.Telefone_Central || "—",
      pontoMaisProximo: r.Ponto_Taxi_Mais_Proximo || "—",
      corridasEstimadasMes: r.Estimativa_Potencial_Corridas_Mes || "—",
      demandaVouchers: r.Demanda_Vouchers_Horas_Extras_Noturno || "Alta",
      demandaEsg: r.Demanda_Frota_ESG_Eletrica || "Alta",
      fornecedorAtual: r.Fornecedor_Atual_Provavel || "—",
      gargaloAtual: r.Gargalo_Dor_Atual || "—",
      estrategiaAbordagem: sanitizarMarcaTexto(r.Estrategia_Ataque_Chame_Taxi || ""),
      areaDecisora: r.Area_Decisora_Principal || "Procurement / RH / Facilities",
      cargosDecisores: r.Cargos_Alvo_Decisores || "",
      liderancasMapeadas: r.Nomes_Liderancas_Mapeadas || "—",
      canalRecomendado: r.Canal_Contato_Recomendado || "",
      dominioEmail: r.Dominio_Email_Corporativo || "",
      emailCompras: r.Email_Canal_Compras_Institucional || "",
      linkLinkedin: r.Link_Busca_LinkedIn_Decisores || "",
      linkGoogle: r.Link_Busca_Google_Decisores || "",
      pitchComercial: sanitizarMarcaTexto(r.Script_Pitch_Comercial_Chame_Taxi || ""),
      latitude: lat,
      longitude: lon,
    });
  }

  polos.sort((a, b) => b.score - a.score || a.distanciaKm - b.distanciaKm);

  // Consolidação estrita: manter apenas 1 registro, 1 contato e 1 domínio/CNPJ principal por Grupo Econômico / Holding
  const porGrupo = new Map<string, { principal: PoloCorporativo5km; qtdUnidades: number; nomesUnidades: string[] }>();
  for (const p of polos) {
    const chaveGrupo = (p.grupoOuRazao || p.nome)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const existente = porGrupo.get(chaveGrupo);
    if (!existente) {
      porGrupo.set(chaveGrupo, { principal: { ...p }, qtdUnidades: 1, nomesUnidades: [p.nome] });
    } else {
      existente.qtdUnidades += 1;
      if (!existente.nomesUnidades.includes(p.nome)) {
        existente.nomesUnidades.push(p.nome);
      }
      if (p.distanciaKm < existente.principal.distanciaKm) {
        existente.principal.distanciaKm = p.distanciaKm;
        existente.principal.tempoMin = p.tempoMin;
        existente.principal.pontoMaisProximo = p.pontoMaisProximo;
      }
      if ((!existente.principal.emailCompras || existente.principal.emailCompras === "—") && p.emailCompras && p.emailCompras !== "—") {
        existente.principal.emailCompras = p.emailCompras;
      }
      if ((!existente.principal.telefone || existente.principal.telefone === "—") && p.telefone && p.telefone !== "—") {
        existente.principal.telefone = p.telefone;
      }
    }
  }

  return Array.from(porGrupo.values()).map(({ principal, qtdUnidades, nomesUnidades }) => {
    if (qtdUnidades > 1) {
      return {
        ...principal,
        nome: `${principal.grupoOuRazao || principal.nome} (${qtdUnidades} unidades consolidadas)`,
        endereco: `${principal.endereco} (+ ${qtdUnidades - 1} unid.: ${nomesUnidades.slice(0, 3).join(", ")})`,
      };
    }
    return principal;
  });
}

export function carregarDadosAbertosMobilidadeSP(): DadosAbertosMobilidadeSP {
  const dir = resolverDiretorioMapeamento();
  const proc = path.join(dir, "data", "processed");

  const sgtpRows = lerCsvSimples(path.join(proc, "sgtp_licencas_taxi_mensal.csv"));
  let licencasSgtpTotal = 0;
  let licencasSgtpReferencia = "2026";
  if (sgtpRows.length > 0) {
    const cols = Object.keys(sgtpRows[0]).filter((c) => /^[a-z]{3}_\d{4}$/.test(c));
    const ultCol = cols[cols.length - 1];
    if (ultCol) {
      licencasSgtpReferencia = ultCol.replace("_", "/");
      for (const r of sgtpRows) {
        if (r.categoria === "(subtotal)") {
          licencasSgtpTotal += Number(r[ultCol] || "0") || 0;
        }
      }
    }
  }

  const frotaRows = lerCsvSimples(path.join(proc, "frota_ativa_sp_por_municipio_2026-08.csv"));
  let frotaAtivaEstado = 0;
  let frotaAtivaCapital = 0;
  let frotaPeriodo = "2026-08";
  for (const r of frotaRows) {
    const val = Number(r.frota_total || "0") || 0;
    frotaAtivaEstado += val;
    if (r.e_capital === "sim") frotaAtivaCapital += val;
    if (r.periodo) frotaPeriodo = r.periodo;
  }

  const empresasTaxiPjAtivas = contarLinhasCsv(path.join(proc, "empresas_taxi_pj_ativas_sp.csv"));

  const sinTaxRows = lerCsvSimples(path.join(proc, "sinistros_vitimas_taxistas_infosiga_mensal.csv"));
  let vitimasTaxistaInfosiga = 0;
  let vitimasFataisInfosiga = 0;
  for (const r of sinTaxRows) {
    if (r.municipio === "SAO PAULO") {
      vitimasTaxistaInfosiga += Number(r.vitimas_taxista || "0") || 0;
      vitimasFataisInfosiga += Number(r.fatais || "0") || 0;
    }
  }

  let sinistrosTotaisSp = 0;
  let sinistrosPeriodo = "2026";
  const topSubprefeiturasSinistros: DadosAbertosMobilidadeSP["topSubprefeiturasSinistros"] = [];

  if (fs.existsSync(proc)) {
    const arquivosSub = fs
      .readdirSync(proc)
      .filter((f) => f.startsWith("acidentes_sp_por_subprefeitura_") && f.endsWith(".csv"))
      .sort()
      .reverse();
    if (arquivosSub.length > 0) {
      const subRows = lerCsvSimples(path.join(proc, arquivosSub[0]));
      for (const r of subRows) {
        const sin = Number(r.sinistros || "0") || 0;
        sinistrosTotaisSp += sin;
        if (r.periodo) sinistrosPeriodo = r.periodo;
        if (
          r.subprefeitura &&
          r.subprefeitura !== "Sem coordenada" &&
          r.subprefeitura !== "Fora dos poligonos" &&
          topSubprefeiturasSinistros.length < 10
        ) {
          topSubprefeiturasSinistros.push({
            subprefeitura: r.subprefeitura,
            sinistros: sin,
            fatais: Number(r.sinistros_fatais || "0") || 0,
            atropelamentos: Number(r.atropelamentos || "0") || 0,
          });
        }
      }
    }
  }

  return {
    licencasSgtpTotal,
    licencasSgtpReferencia,
    frotaAtivaEstado,
    frotaAtivaCapital,
    frotaPeriodo,
    empresasTaxiPjAtivas,
    vitimasTaxistaInfosiga,
    vitimasFataisInfosiga,
    sinistrosTotaisSp,
    sinistrosPeriodo,
    topSubprefeiturasSinistros,
  };
}
