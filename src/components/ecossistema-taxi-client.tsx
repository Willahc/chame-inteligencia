"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Car,
  CheckCircle2,
  ExternalLink,
  Hospital,
  Layers,
  MapPin,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import type {
  DadosAbertosMobilidadeSP,
  PoloCorporativo5km,
  PontoTaxiGeo,
  ResumoEcossistemaTaxiSP,
  TaxistaMapeado,
} from "@/lib/ecossistema-unificado";

type Props = {
  resumo: ResumoEcossistemaTaxiSP;
  taxistasIniciais: {
    itens: TaxistaMapeado[];
    total: number;
    pagina: number;
    tamanhoPagina: number;
    totalPaginas: number;
  };
  pontos: PontoTaxiGeo[];
  polos5km: PoloCorporativo5km[];
  dadosAbertos: DadosAbertosMobilidadeSP;
};

type AbaAtiva = "TAXISTAS" | "MAPA_PONTOS" | "POLOS_5KM" | "DADOS_ABERTOS";

export function EcossistemaTaxiClient({
  resumo,
  taxistasIniciais,
  pontos,
  polos5km,
  dadosAbertos,
}: Props) {
  const [aba, setAba] = useState<AbaAtiva>("TAXISTAS");

  // Estado da Aba 1: Taxistas (paginação server-side)
  const [buscaTaxista, setBuscaTaxista] = useState("");
  const [editalFiltro, setEditalFiltro] = useState("TODOS");
  const [statusFiltro, setStatusFiltro] = useState("TODOS");
  const [tierFiltro, setTierFiltro] = useState("TODOS");
  const [meiFiltro, setMeiFiltro] = useState("TODOS");
  const [paginaTaxista, setPaginaTaxista] = useState(1);
  const [dadosTaxistas, setDadosTaxistas] = useState(taxistasIniciais);
  const [carregandoTaxistas, setCarregandoTaxistas] = useState(false);
  const [taxistaSelecionado, setTaxistaSelecionado] = useState<TaxistaMapeado | null>(null);

  // Estado da Aba 2: Mapa GIS & Pontos
  const [buscaPonto, setBuscaPonto] = useState("");
  const [regiaoPonto, setRegiaoPonto] = useState("TODAS");
  const [mostrarCamadaPontos, setMostrarCamadaPontos] = useState(true);
  const [mostrarCamadaHospitais, setMostrarCamadaHospitais] = useState(true);
  const [mostrarCamadaEmpresas, setMostrarCamadaEmpresas] = useState(true);
  const [paginaPontos, setPaginaPontos] = useState(1);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<unknown>(null);

  // Estado da Aba 3: Polos 5km
  const [buscaPolo, setBuscaPolo] = useState("");
  const [categoriaPolo, setCategoriaPolo] = useState<"TODOS" | "HOSPITAL_SAUDE" | "EMPRESA_CORPORATIVA">("TODOS");
  const [poloSelecionado, setPoloSelecionado] = useState<PoloCorporativo5km | null>(null);

  useEffect(() => {
    let cancelado = false;
    const timer = setTimeout(async () => {
      setCarregandoTaxistas(true);
      try {
        const params = new URLSearchParams({
          busca: buscaTaxista,
          edital: editalFiltro,
          status: statusFiltro,
          tier: tierFiltro,
          mei: meiFiltro,
          pagina: String(paginaTaxista),
          tamanhoPagina: "50",
        });
        const res = await fetch(`/api/ecossistema-taxi?${params.toString()}`);
        if (res.ok && !cancelado) {
          const json = await res.json();
          setDadosTaxistas(json);
        }
      } finally {
        if (!cancelado) setCarregandoTaxistas(false);
      }
    }, 180);
    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [buscaTaxista, editalFiltro, statusFiltro, tierFiltro, meiFiltro, paginaTaxista]);

  const pontosFiltrados = useMemo(() => {
    const q = buscaPonto.trim().toUpperCase();
    return pontos.filter((p) => {
      if (regiaoPonto !== "TODAS" && p.regiao.toUpperCase() !== regiaoPonto) return false;
      if (q) {
        const alvo = `${p.id} ${p.endereco} ${p.subprefeitura} ${p.regiao}`.toUpperCase();
        if (!alvo.includes(q)) return false;
      }
      return true;
    });
  }, [pontos, buscaPonto, regiaoPonto]);

  const polosFiltrados = useMemo(() => {
    const q = buscaPolo.trim().toUpperCase();
    return polos5km.filter((p) => {
      if (categoriaPolo !== "TODOS" && p.categoria !== categoriaPolo) return false;
      if (q) {
        const alvo = `${p.nome} ${p.grupoOuRazao} ${p.bairro} ${p.tipoOuSetor} ${p.areaDecisora}`.toUpperCase();
        if (!alvo.includes(q)) return false;
      }
      return true;
    });
  }, [polos5km, buscaPolo, categoriaPolo]);

  // Inicialização do Mapa GIS Leaflet + Esri quando a aba MAPA_PONTOS está ativa
  useEffect(() => {
    if (aba !== "MAPA_PONTOS" || !mapContainerRef.current) return;

    const carregarLeaflet = async () => {
      if (!document.getElementById("leaflet-css-cdn")) {
        const link = document.createElement("link");
        link.id = "leaflet-css-cdn";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      interface LeafletLayer {
        bindPopup: (html: string) => LeafletLayer;
        addTo: (target: unknown) => LeafletLayer;
      }
      interface LeafletMapInstance {
        setView: (coords: [number, number], zoom: number) => LeafletMapInstance;
        remove: () => void;
      }
      interface LeafletGlobal {
        map: (el: HTMLElement) => LeafletMapInstance;
        tileLayer: (url: string, opts: Record<string, unknown>) => LeafletLayer;
        circleMarker: (coords: [number, number], opts: Record<string, unknown>) => LeafletLayer;
      }

      const w = window as unknown as { L?: LeafletGlobal };
      if (!w.L) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.getElementById("leaflet-js-cdn") as HTMLScriptElement | null;
          if (existing) {
            existing.addEventListener("load", () => resolve());
            return;
          }
          const script = document.createElement("script");
          script.id = "leaflet-js-cdn";
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Falha ao carregar Leaflet"));
          document.body.appendChild(script);
        });
      }

      const L = (window as unknown as { L?: LeafletGlobal }).L;
      if (!L || !mapContainerRef.current) return;

      if (leafletMapRef.current) {
        (leafletMapRef.current as { remove: () => void }).remove();
        leafletMapRef.current = null;
      }

      const map = L.map(mapContainerRef.current).setView([-23.565, -46.675], 12);
      leafletMapRef.current = map;

      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19,
          attribution: "Tiles &copy; Esri — WiNS Hub Táxi GIS",
        },
      ).addTo(map);

      if (mostrarCamadaPontos) {
        for (const pt of pontosFiltrados) {
          L.circleMarker([pt.latitude, pt.longitude], {
            radius: 5,
            fillColor: "#0ea5e9",
            color: "#0369a1",
            weight: 1.5,
            fillOpacity: 0.85,
          })
            .bindPopup(
              `<div style="font-size:12px;line-height:1.4">
                <strong>Ponto de Táxi #${pt.id}</strong><br/>
                ${pt.endereco}<br/>
                <span>Subprefeitura: <b>${pt.subprefeitura}</b> (${pt.regiao})</span><br/>
                <span>Capacidade: <b>${pt.capacidade} vagas</b> | Saldo: <b>${pt.saldo}</b></span><br/>
                <span>Camada: ${pt.camadaMatching}</span>
              </div>`,
            )
            .addTo(map);
        }
      }

      if (mostrarCamadaHospitais) {
        for (const h of polos5km.filter((x) => x.categoria === "HOSPITAL_SAUDE")) {
          L.circleMarker([h.latitude, h.longitude], {
            radius: 7,
            fillColor: "#e11d48",
            color: "#881337",
            weight: 2,
            fillOpacity: 0.9,
          })
            .bindPopup(
              `<div style="font-size:12px;line-height:1.4">
                <strong style="color:#be123c">[SAÚDE B2B] ${h.nome}</strong><br/>
                ${h.endereco} (${h.bairro})<br/>
                <span>Score: <b>${h.score} pts</b> | Distância: <b>${h.distanciaKm} km</b></span><br/>
                <span>Ponto próx.: ${h.pontoMaisProximo}</span>
              </div>`,
            )
            .addTo(map);
        }
      }

      if (mostrarCamadaEmpresas) {
        for (const emp of polos5km.filter((x) => x.categoria === "EMPRESA_CORPORATIVA")) {
          L.circleMarker([emp.latitude, emp.longitude], {
            radius: 7,
            fillColor: "#7c3aed",
            color: "#4c1d95",
            weight: 2,
            fillOpacity: 0.9,
          })
            .bindPopup(
              `<div style="font-size:12px;line-height:1.4">
                <strong style="color:#6d28d9">[CORPORATIVO] ${emp.nome}</strong><br/>
                ${emp.endereco} (${emp.bairro})<br/>
                <span>Setor: <b>${emp.tipoOuSetor}</b> (${emp.porteFaixa})</span><br/>
                <span>Score: <b>${emp.score} pts</b> | Distância: <b>${emp.distanciaKm} km</b></span>
              </div>`,
            )
            .addTo(map);
        }
      }
    };

    carregarLeaflet().catch(() => {});

    return () => {
      if (leafletMapRef.current) {
        (leafletMapRef.current as { remove: () => void }).remove();
        leafletMapRef.current = null;
      }
    };
  }, [aba, pontosFiltrados, polos5km, mostrarCamadaPontos, mostrarCamadaHospitais, mostrarCamadaEmpresas]);

  return (
    <div className="space-y-6">
      {/* KPIs Executivos Unificados */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="painel p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--texto-suave)]">
                Oferta — Taxistas Mapeados SP
              </p>
              <p className="mt-2 text-3xl font-bold text-[var(--azul-profundo)]">
                {resumo.taxistas.totalMapeados.toLocaleString("pt-BR")}
              </p>
              <p className="mt-1 text-xs text-[var(--texto-suave)]">
                {resumo.taxistas.contemplados2026.toLocaleString("pt-BR")} contemplados 2026 •{" "}
                {resumo.taxistas.meiValidado1Para1.toLocaleString("pt-BR")} MEIs 1:1
              </p>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ciano-claro)] text-[var(--azul)]">
              <Car size={20} />
            </span>
          </div>
        </article>

        <article className="painel p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--texto-suave)]">
                Infraestrutura — Pontos Georreferenciados
              </p>
              <p className="mt-2 text-3xl font-bold text-[var(--azul-profundo)]">
                {resumo.pontosTaxi.totalGeocodificados.toLocaleString("pt-BR")}
              </p>
              <p className="mt-1 text-xs text-[var(--texto-suave)]">
                {resumo.pontosTaxi.matchedOsmDtp} pareados DTP ↔ OSM + {resumo.pontosTaxi.fallbackGeocodificados} viários
              </p>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <MapPin size={20} />
            </span>
          </div>
        </article>

        <article className="painel p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--texto-suave)]">
                Demanda Tática — Polos B2B (Raio 5 km)
              </p>
              <p className="mt-2 text-3xl font-bold text-[var(--azul-profundo)]">
                {resumo.radar5kmButanta.totalProspectsRaio5km}
              </p>
              <p className="mt-1 text-xs text-[var(--texto-suave)]">
                {resumo.radar5kmButanta.polosSaudeHospitais} hospitais/polos de saúde +{" "}
                {resumo.radar5kmButanta.grandesEmpresasCorporativas} grandes empresas
              </p>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <Hospital size={20} />
            </span>
          </div>
        </article>

        <article className="painel p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--texto-suave)]">
                Governança LGPD & Entity Resolution
              </p>
              <p className="mt-2 text-3xl font-bold text-emerald-700">100% Auditado</p>
              <p className="mt-1 text-xs text-[var(--texto-suave)]">
                {resumo.taxistas.homonimosBloqueados} homônimos bloqueados • 0 CPFs vazados
              </p>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <ShieldCheck size={20} />
            </span>
          </div>
        </article>
      </div>

      {/* Barra de Navegação entre os 4 Módulos do Cockpit 360º */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--borda)] bg-white p-2 shadow-xs">
        <button
          type="button"
          onClick={() => setAba("TAXISTAS")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            aba === "TAXISTAS"
              ? "bg-[var(--azul-profundo)] text-white shadow-xs"
              : "text-[var(--texto-suave)] hover:bg-slate-100"
          }`}
        >
          <Users size={17} />
          1. Base Mestre de Taxistas ({resumo.taxistas.totalMapeados.toLocaleString("pt-BR")})
        </button>

        <button
          type="button"
          onClick={() => setAba("MAPA_PONTOS")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            aba === "MAPA_PONTOS"
              ? "bg-[var(--azul-profundo)] text-white shadow-xs"
              : "text-[var(--texto-suave)] hover:bg-slate-100"
          }`}
        >
          <MapPin size={17} />
          2. Mapa Tático GIS & Pontos ({resumo.pontosTaxi.totalGeocodificados})
        </button>

        <button
          type="button"
          onClick={() => setAba("POLOS_5KM")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            aba === "POLOS_5KM"
              ? "bg-[var(--azul-profundo)] text-white shadow-xs"
              : "text-[var(--texto-suave)] hover:bg-slate-100"
          }`}
        >
          <Building2 size={17} />
          3. Polos Corporativos & Hospitais 5 km ({resumo.radar5kmButanta.totalProspectsRaio5km})
        </button>

        <button
          type="button"
          onClick={() => setAba("DADOS_ABERTOS")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            aba === "DADOS_ABERTOS"
              ? "bg-[var(--azul-profundo)] text-white shadow-xs"
              : "text-[var(--texto-suave)] hover:bg-slate-100"
          }`}
        >
          <Layers size={17} />
          4. Dados Abertos (SGTP / Detran / Infosiga)
        </button>
      </div>

      {/* ABA 1: BASE MESTRE DE TAXISTAS */}
      {aba === "TAXISTAS" && (
        <section className="painel p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--azul-profundo)]">
                Base Mestre Unificada de Condutores e Novos Alvarás DTP 2026
              </h2>
              <p className="text-sm text-[var(--texto-suave)]">
                Camada pública minimizada (LGPD) com desambiguação determinística de homônimos e score de priorização.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <CheckCircle2 size={15} />
              Exibindo {dadosTaxistas.total.toLocaleString("pt-BR")} condutores filtrados
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="pointer-events-none absolute top-3 left-3 size-4 text-slate-400" />
              <input
                type="text"
                value={buscaTaxista}
                onChange={(e) => {
                  setBuscaTaxista(e.target.value);
                  setPaginaTaxista(1);
                }}
                placeholder="Nome, Condutax, CNPJ, SEI..."
                className="w-full rounded-xl border border-[var(--borda)] bg-white py-2 pr-3 pl-9 text-sm"
              />
            </div>

            <select
              value={editalFiltro}
              onChange={(e) => {
                setEditalFiltro(e.target.value);
                setPaginaTaxista(1);
              }}
              className="rounded-xl border border-[var(--borda)] bg-white px-3 py-2 text-sm"
            >
              <option value="TODOS">Todos os Editais (1 a 8)</option>
              <option value="1">Edital 1 — PcD Comum</option>
              <option value="2">Edital 2 — Sênior / Tempo Praça</option>
              <option value="3">Edital 3 — Mulheres Taxistas</option>
              <option value="4">Edital 4 — Híbridos & Elétricos</option>
              <option value="5">Edital 5 — Ampla Concorrência</option>
              <option value="6">Edital 6 — Acessível PcD</option>
              <option value="7">Edital 7 — Acessível Sênior</option>
              <option value="8">Edital 8 — Acessível Geral</option>
            </select>

            <select
              value={statusFiltro}
              onChange={(e) => {
                setStatusFiltro(e.target.value);
                setPaginaTaxista(1);
              }}
              className="rounded-xl border border-[var(--borda)] bg-white px-3 py-2 text-sm"
            >
              <option value="TODOS">Todos os Status no Sorteio</option>
              <option value="CONTEMPLADO">Contemplados (Titulares 2026)</option>
              <option value="ESPERA">Suplentes / Fila de Espera</option>
              <option value="INABILITADO">Inabilitados na Fase Documental</option>
            </select>

            <select
              value={tierFiltro}
              onChange={(e) => {
                setTierFiltro(e.target.value);
                setPaginaTaxista(1);
              }}
              className="rounded-xl border border-[var(--borda)] bg-white px-3 py-2 text-sm"
            >
              <option value="TODOS">Todos os Tiers de Prioridade</option>
              <option value="Tier 1">Tier 1 (Score &ge; 80)</option>
              <option value="Tier 2">Tier 2 (Score 65-79)</option>
              <option value="Tier 3">Tier 3 (Score 50-64)</option>
              <option value="Tier 4">Tier 4 (Score &lt; 50)</option>
            </select>

            <select
              value={meiFiltro}
              onChange={(e) => {
                setMeiFiltro(e.target.value);
                setPaginaTaxista(1);
              }}
              className="rounded-xl border border-[var(--borda)] bg-white px-3 py-2 text-sm"
            >
              <option value="TODOS">Todos os Status MEI/RFB</option>
              <option value="SIM">MEI Validado 1:1 (Sem Homônimo)</option>
              <option value="HOMONIMO">Homônimo Bloqueado (Desambiguar)</option>
              <option value="NAO">Sem MEI Localizado</option>
            </select>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--borda)] text-xs uppercase text-[var(--texto-suave)]">
                  <th className="py-3 pr-4">Condutor / Identificador</th>
                  <th className="px-3 py-3">Edital & Categoria</th>
                  <th className="px-3 py-3">Status DTP</th>
                  <th className="px-3 py-3">MEI / Receita Federal</th>
                  <th className="px-3 py-3">Ponto / Região</th>
                  <th className="px-3 py-3 text-center">Score</th>
                  <th className="py-3 pl-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--borda)]">
                {carregandoTaxistas ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-[var(--texto-suave)]">
                      Consultando base mestre...
                    </td>
                  </tr>
                ) : dadosTaxistas.itens.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-[var(--texto-suave)]">
                      Nenhum condutor encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  dadosTaxistas.itens.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80">
                      <td className="py-3 pr-4">
                        <p className="font-bold text-[var(--azul-profundo)]">{t.nome}</p>
                        <p className="text-xs text-[var(--texto-suave)]">{t.melhorIdentificador}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          Edital {t.editalNumero}
                        </span>
                        <p className="mt-1 text-xs text-[var(--texto-suave)]">{t.categoriaVeiculo}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            t.statusSorteio.includes("CONTEMPLADO")
                              ? "bg-emerald-100 text-emerald-800"
                              : t.statusSorteio === "ESPERA"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {t.statusSorteio}
                        </span>
                        <p className="mt-1 text-xs text-[var(--texto-suave)]">{t.classificacaoSuplencia}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
                            t.possuiMei.startsWith("Sim")
                              ? "bg-sky-100 text-sky-800"
                              : t.possuiMei.includes("Homônimo")
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {t.possuiMei}
                        </span>
                        {t.meiCnpj !== "—" && (
                          <p className="mt-1 font-mono text-xs text-[var(--texto-suave)]">{t.meiCnpj}</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <p className="font-medium text-[var(--texto)]">{t.vinculoPonto}</p>
                        <p className="text-[var(--texto-suave)]">
                          {t.regiaoMacro !== "Não aplicável" ? t.regiaoMacro : t.pontoSubprefeitura}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex size-9 items-center justify-center rounded-xl bg-[var(--azul-profundo)] text-sm font-bold text-white">
                          {t.score}
                        </span>
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <button
                          type="button"
                          onClick={() => setTaxistaSelecionado(t)}
                          className="rounded-lg border border-[var(--borda)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--azul-profundo)] hover:bg-slate-100"
                        >
                          Ficha 360º
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--borda)] pt-4 text-sm">
            <p className="text-xs text-[var(--texto-suave)]">
              Página <strong>{dadosTaxistas.pagina}</strong> de <strong>{dadosTaxistas.totalPaginas}</strong> (
              {dadosTaxistas.total.toLocaleString("pt-BR")} registros)
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={paginaTaxista <= 1}
                onClick={() => setPaginaTaxista((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-[var(--borda)] px-3 py-1.5 text-xs font-bold disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={paginaTaxista >= dadosTaxistas.totalPaginas}
                onClick={() => setPaginaTaxista((p) => Math.min(dadosTaxistas.totalPaginas, p + 1))}
                className="rounded-lg border border-[var(--borda)] px-3 py-1.5 text-xs font-bold disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ABA 2: MAPA TÁTICO GIS & 997 PONTOS DE TÁXI */}
      {aba === "MAPA_PONTOS" && (
        <div className="space-y-6">
          <section className="painel p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--azul-profundo)]">
                  Mapa Tático GIS — 997 Pontos de Táxi + 190 Polos Corporativos B2B
                </h2>
                <p className="text-sm text-[var(--texto-suave)]">
                  Camada Esri World Street Map com cruzamento espacial entre oferta de pontos DTP/OSM e demanda corporativa.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarCamadaPontos((v) => !v)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    mostrarCamadaPontos ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  ● Pontos de Táxi ({pontosFiltrados.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarCamadaHospitais((v) => !v)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    mostrarCamadaHospitais ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  ● Hospitais 5 km (94)
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarCamadaEmpresas((v) => !v)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    mostrarCamadaEmpresas ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  ● Empresas 5 km (96)
                </button>
              </div>
            </div>

            <div
              ref={mapContainerRef}
              className="mt-4 h-[480px] w-full overflow-hidden rounded-2xl border border-[var(--borda)] bg-slate-100"
            />
          </section>

          <section className="painel p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-bold text-[var(--azul-profundo)]">
                Catálogo Georreferenciado de Pontos de Táxi ({pontosFiltrados.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={buscaPonto}
                  onChange={(e) => {
                    setBuscaPonto(e.target.value);
                    setPaginaPontos(1);
                  }}
                  placeholder="Buscar ponto, rua ou subprefeitura..."
                  className="rounded-xl border border-[var(--borda)] bg-white px-3 py-1.5 text-sm"
                />
                <select
                  value={regiaoPonto}
                  onChange={(e) => {
                    setRegiaoPonto(e.target.value);
                    setPaginaPontos(1);
                  }}
                  className="rounded-xl border border-[var(--borda)] bg-white px-3 py-1.5 text-sm"
                >
                  <option value="TODAS">Todas as Regiões</option>
                  <option value="CENTRO">Centro</option>
                  <option value="OESTE">Zona Oeste</option>
                  <option value="SUL">Zona Sul</option>
                  <option value="LESTE">Zona Leste</option>
                  <option value="NORTE">Zona Norte</option>
                </select>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--borda)] text-xs uppercase text-[var(--texto-suave)]">
                    <th className="py-2.5 pr-3">Ponto DTP</th>
                    <th className="px-3 py-2.5">Endereço</th>
                    <th className="px-3 py-2.5">Subprefeitura / Região</th>
                    <th className="px-3 py-2.5 text-center">Capacidade</th>
                    <th className="px-3 py-2.5 text-center">Saldo Vagas</th>
                    <th className="px-3 py-2.5">Telefone</th>
                    <th className="py-2.5 pl-3">Camada Geoespacial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--borda)]">
                  {pontosFiltrados.slice((paginaPontos - 1) * 25, paginaPontos * 25).map((pt) => (
                    <tr key={pt.id} className="hover:bg-slate-50">
                      <td className="py-2.5 pr-3 font-bold text-[var(--azul-profundo)]">#{pt.id}</td>
                      <td className="px-3 py-2.5">{pt.endereco}</td>
                      <td className="px-3 py-2.5 text-xs">
                        {pt.subprefeitura} ({pt.regiao})
                      </td>
                      <td className="px-3 py-2.5 text-center font-semibold">{pt.capacidade}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                          {pt.saldo}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{pt.telefone}</td>
                      <td className="py-2.5 pl-3 text-xs text-[var(--texto-suave)]">{pt.camadaMatching}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ABA 3: POLOS CORPORATIVOS & HOSPITAIS 5 KM */}
      {aba === "POLOS_5KM" && (
        <section className="painel p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--azul-profundo)]">
                Radar Tático de Polos Hospitalares (94) & Grandes Empresas (96) — Raio 5 km
              </h2>
              <p className="text-sm text-[var(--texto-suave)]">
                Mapeamento de demanda intensiva de vouchers, trocas de plantão, transporte acessível e decisores B2B.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={buscaPolo}
                onChange={(e) => setBuscaPolo(e.target.value)}
                placeholder="Buscar hospital, empresa, bairro..."
                className="rounded-xl border border-[var(--borda)] bg-white px-3 py-2 text-sm"
              />
              <select
                value={categoriaPolo}
                onChange={(e) => setCategoriaPolo(e.target.value as typeof categoriaPolo)}
                className="rounded-xl border border-[var(--borda)] bg-white px-3 py-2 text-sm"
              >
                <option value="TODOS">Todos os Polos (190)</option>
                <option value="HOSPITAL_SAUDE">Polos de Saúde & Hospitais (94)</option>
                <option value="EMPRESA_CORPORATIVA">Grandes Empresas 100+ Colab. (96)</option>
              </select>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {polosFiltrados.map((p) => (
              <article
                key={p.id}
                className="flex flex-col justify-between rounded-2xl border border-[var(--borda)] bg-white p-5 transition hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`rounded-md px-2.5 py-0.5 text-xs font-bold ${
                        p.categoria === "HOSPITAL_SAUDE"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-violet-100 text-violet-800"
                      }`}
                    >
                      {p.categoria === "HOSPITAL_SAUDE" ? "Saúde / Hospital" : p.tipoOuSetor}
                    </span>
                    <span className="rounded-lg bg-[var(--azul-profundo)] px-2.5 py-1 text-xs font-bold text-white">
                      {p.score} pts
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-bold text-[var(--azul-profundo)]">{p.nome}</h3>
                  <p className="text-xs text-[var(--texto-suave)]">
                    {p.bairro} • {p.distanciaKm} km ({p.tempoMin} min)
                  </p>

                  <div className="mt-3 space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs">
                    <p>
                      <strong>Ponto mais próximo:</strong> {p.pontoMaisProximo}
                    </p>
                    <p>
                      <strong>Potencial estimado:</strong> {p.corridasEstimadasMes}
                    </p>
                    <p>
                      <strong>Área decisora:</strong> {p.areaDecisora}
                    </p>
                    {p.dominioEmail && (
                      <p>
                        <strong>Domínio corporativo:</strong> <span className="font-mono">{p.dominioEmail}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--borda)] pt-3">
                  <span className="text-xs font-semibold text-[var(--texto-suave)]">{p.tier}</span>
                  <button
                    type="button"
                    onClick={() => setPoloSelecionado(p)}
                    className="rounded-lg bg-[var(--azul-profundo)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--azul)]"
                  >
                    Ver Dossiê & Pitch B2B
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ABA 4: DADOS ABERTOS MUNICIPAIS & ESTADUAIS */}
      {aba === "DADOS_ABERTOS" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="painel p-5">
              <p className="text-xs font-bold uppercase text-[var(--texto-suave)]">Licenças Ativas SGTP (SMT/SP)</p>
              <p className="mt-2 text-3xl font-bold text-[var(--azul-profundo)]">
                {dadosAbertos.licencasSgtpTotal.toLocaleString("pt-BR")}
              </p>
              <p className="mt-1 text-xs text-[var(--texto-suave)]">Ref.: {dadosAbertos.licencasSgtpReferencia}</p>
            </article>

            <article className="painel p-5">
              <p className="text-xs font-bold uppercase text-[var(--texto-suave)]">Frota Ativa Capital (Detran-SP)</p>
              <p className="mt-2 text-3xl font-bold text-[var(--azul-profundo)]">
                {dadosAbertos.frotaAtivaCapital.toLocaleString("pt-BR")}
              </p>
              <p className="mt-1 text-xs text-[var(--texto-suave)]">
                Estado SP: {dadosAbertos.frotaAtivaEstado.toLocaleString("pt-BR")} ({dadosAbertos.frotaPeriodo})
              </p>
            </article>

            <article className="painel p-5">
              <p className="text-xs font-bold uppercase text-[var(--texto-suave)]">Empresas de Táxi PJ Ativas (RFB)</p>
              <p className="mt-2 text-3xl font-bold text-[var(--azul-profundo)]">
                {dadosAbertos.empresasTaxiPjAtivas.toLocaleString("pt-BR")}
              </p>
              <p className="mt-1 text-xs text-[var(--texto-suave)]">CNAE 4923-0/01 no Município de SP</p>
            </article>

            <article className="painel p-5">
              <p className="text-xs font-bold uppercase text-[var(--texto-suave)]">Sinistros & Vítimas Taxistas (Infosiga)</p>
              <p className="mt-2 text-3xl font-bold text-rose-700">
                {dadosAbertos.vitimasTaxistaInfosiga.toLocaleString("pt-BR")}
              </p>
              <p className="mt-1 text-xs text-[var(--texto-suave)]">
                {dadosAbertos.sinistrosTotaisSp.toLocaleString("pt-BR")} sinistros totais ({dadosAbertos.sinistrosPeriodo})
              </p>
            </article>
          </div>

          <section className="painel p-6">
            <h3 className="text-base font-bold text-[var(--azul-profundo)]">
              Top 10 Subprefeituras por Volume de Sinistros Viários (Infosiga SP)
            </h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--borda)] text-xs uppercase text-[var(--texto-suave)]">
                    <th className="py-2.5 pr-4">Subprefeitura</th>
                    <th className="px-3 py-2.5 text-right">Total de Sinistros</th>
                    <th className="px-3 py-2.5 text-right">Sinistros Fatais</th>
                    <th className="py-2.5 pl-3 text-right">Atropelamentos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--borda)]">
                  {dadosAbertos.topSubprefeiturasSinistros.map((s) => (
                    <tr key={s.subprefeitura} className="hover:bg-slate-50">
                      <td className="py-2.5 pr-4 font-semibold text-[var(--azul-profundo)]">{s.subprefeitura}</td>
                      <td className="px-3 py-2.5 text-right font-bold">{s.sinistros.toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-2.5 text-right text-rose-700">{s.fatais}</td>
                      <td className="py-2.5 pl-3 text-right">{s.atropelamentos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* MODAL / FICHA 360º DO TAXISTA */}
      {taxistaSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--borda)] pb-4">
              <div>
                <span className="rounded-md bg-[var(--ciano-claro)] px-2.5 py-1 text-xs font-bold text-[var(--azul)]">
                  {taxistaSelecionado.id} • Score {taxistaSelecionado.score}/100
                </span>
                <h3 className="mt-2 text-xl font-bold text-[var(--azul-profundo)]">{taxistaSelecionado.nome}</h3>
                <p className="text-xs text-[var(--texto-suave)]">{taxistaSelecionado.tier}</p>
              </div>
              <button
                type="button"
                onClick={() => setTaxistaSelecionado(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-[var(--texto-suave)]">Identificador Oficial</p>
                  <p className="font-bold">{taxistaSelecionado.melhorIdentificador}</p>
                  <p className="mt-1 text-xs">Condutax: {taxistaSelecionado.condutax} | Alvará: {taxistaSelecionado.alvara}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-[var(--texto-suave)]">Situação MEI / Receita Federal</p>
                  <p className="font-bold">{taxistaSelecionado.possuiMei}</p>
                  <p className="mt-1 text-xs">CNPJ: {taxistaSelecionado.meiCnpj} ({taxistaSelecionado.meiOrigem})</p>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--borda)] p-4">
                <p className="text-xs font-bold uppercase text-[var(--texto-suave)]">
                  Regras do Edital {taxistaSelecionado.editalNumero} ({taxistaSelecionado.categoriaVeiculo})
                </p>
                <p className="mt-1 text-xs leading-5">{taxistaSelecionado.exigenciaVeiculo}</p>
                <p className="mt-2 text-xs">
                  <strong>Modelos recomendados:</strong> {taxistaSelecionado.modelosRecomendados}
                </p>
              </div>

              <div className="rounded-xl bg-sky-50/70 p-4">
                <p className="text-xs font-bold uppercase text-sky-900">Justificativa do Score & Ação Recomendada</p>
                <p className="mt-1 text-xs text-sky-950">{taxistaSelecionado.justificativaScore}</p>
                <p className="mt-2 text-xs font-semibold text-sky-900">
                  Próximo passo: {taxistaSelecionado.acaoRecomendada}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {taxistaSelecionado.linkDoc && (
                  <a
                    href={taxistaSelecionado.linkDoc}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--azul-profundo)] px-4 py-2 text-xs font-bold text-white"
                  >
                    Consultar Diário Oficial SP <ExternalLink size={14} />
                  </a>
                )}
                {taxistaSelecionado.linkSei && (
                  <a
                    href={taxistaSelecionado.linkSei}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--borda)] px-4 py-2 text-xs font-bold text-[var(--azul-profundo)]"
                  >
                    Pesquisa SEI / PMSP <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL / DOSSIÊ DO POLO CORPORATIVO 5 KM */}
      {poloSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--borda)] pb-4">
              <div>
                <span className="rounded-md bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800">
                  {poloSelecionado.id} • Score {poloSelecionado.score} pts
                </span>
                <h3 className="mt-2 text-xl font-bold text-[var(--azul-profundo)]">{poloSelecionado.nome}</h3>
                <p className="text-xs text-[var(--texto-suave)]">
                  {poloSelecionado.grupoOuRazao} • {poloSelecionado.endereco} ({poloSelecionado.bairro})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPoloSelecionado(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3 text-xs">
                  <p className="font-bold text-[var(--azul-profundo)]">Inteligência de Demanda</p>
                  <p className="mt-1">Corridas/mês: <strong>{poloSelecionado.corridasEstimadasMes}</strong></p>
                  <p>Ponto próximo: <strong>{poloSelecionado.pontoMaisProximo}</strong></p>
                  <p>Fornecedor atual provável: {poloSelecionado.fornecedorAtual}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-xs">
                  <p className="font-bold text-[var(--azul-profundo)]">Mapeamento de Decisores B2B</p>
                  <p className="mt-1">Área: <strong>{poloSelecionado.areaDecisora}</strong></p>
                  <p>Cargos-alvo: {poloSelecionado.cargosDecisores}</p>
                  <p>Lideranças públicas: {poloSelecionado.liderancasMapeadas}</p>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--borda)] p-4 text-xs">
                <p className="font-bold uppercase text-[var(--texto-suave)]">Gargalo Atual & Estratégia de Abordagem</p>
                <p className="mt-1"><strong>Dor identificada:</strong> {poloSelecionado.gargaloAtual}</p>
                <p className="mt-1"><strong>Estratégia WiNS Hub Táxi:</strong> {poloSelecionado.estrategiaAbordagem}</p>
              </div>

              <div className="rounded-xl bg-emerald-50/80 p-4 text-xs">
                <p className="font-bold uppercase text-emerald-900">Script / Pitch Comercial B2B Recomendado</p>
                <p className="mt-1 leading-5 text-emerald-950">{poloSelecionado.pitchComercial}</p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {poloSelecionado.linkLinkedin && (
                  <a
                    href={poloSelecionado.linkLinkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--azul-profundo)] px-4 py-2 text-xs font-bold text-white"
                  >
                    Buscar Decisores no LinkedIn <ExternalLink size={14} />
                  </a>
                )}
                {poloSelecionado.linkGoogle && (
                  <a
                    href={poloSelecionado.linkGoogle}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--borda)] px-4 py-2 text-xs font-bold text-[var(--azul-profundo)]"
                  >
                    Pesquisa Institucional Google <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
