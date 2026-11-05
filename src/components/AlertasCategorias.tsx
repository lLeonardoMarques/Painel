import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Download,
  Copy,
  Check,
  Building2,
  FileSpreadsheet,
  ArrowUpDown,
  CheckCircle2,
  AlertOctagon,
  Info,
  Clock,
  Layers,
  Boxes,
  Database,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Percent,
} from "lucide-react";
import * as XLSX from "xlsx";

export interface AlertaCategoriasProps {
  theme?: "light" | "dark";
  showNotification?: (msg: string) => void;
  user?: any;
  onPageChange?: (page: string) => void;
  onThemeToggle?: () => void;
  onLogout?: () => void;
}

// Estrutura do item retornado pela API http://10.210.2.131:3333/api/alertas
export interface RawAlertaApiItem {
  PLU?: string | number;
  plu?: string | number;
  Descrição?: string;
  Descricao?: string;
  descricao?: string;
  plt?: number | string;
  "Soma de plt"?: number | string;
  "Categoria Ruas"?: string;
  categoriaRuas?: string;
  "Categoria Item"?: string;
  categoriaItem?: string;
  Altura?: number | string;
  altura?: number | string;
  Rua?: string;
  rua?: string;
  Alertas?: string;
  alerta?: string;
  alertas?: string;
}

export interface AlertaRowNormalized {
  id: string;
  plu: string;
  descricao: string;
  somaPlt: number;
  categoriaRuas: string;
  categoriaItem: string;
  altura: number | string;
  rua: string;
  alertas: string;
  isRuaErrada: boolean;
}

// Chaves de persistência para otimização de sessão (Carrega 1 única vez por login)
const SESSION_CACHE_KEY = "gpa_alertas_session_data_v1";
const SESSION_TIMESTAMP_KEY = "gpa_alertas_session_time_v1";

// Contingência / Fallback inicial com dados idênticos aos especificados pelo usuário
const FALLBACK_ALERTAS: RawAlertaApiItem[] = [
  {
    PLU: "106498",
    Descrição: "CAFE TM BRASILEIRO",
    plt: 33,
    "Categoria Ruas": "Mercearia Complementar",
    "Categoria Item": "MERCEARIA BASICA",
    Altura: 140,
    Rua: "R39",
    Alertas: "⚠️ RUA ERRADA",
  },
  {
    PLU: "106498",
    Descrição: "CAFE TM BRASILEIRO",
    plt: 7,
    "Categoria Ruas": "Mercearia Complementar",
    "Categoria Item": "MERCEARIA BASICA",
    Altura: 141,
    Rua: "R39",
    Alertas: "⚠️ RUA ERRADA",
  },
  {
    PLU: "106498",
    Descrição: "CAFE TM BRASILEIRO",
    plt: 11,
    "Categoria Ruas": "Mercearia Complementar",
    "Categoria Item": "MERCEARIA BASICA",
    Altura: 141,
    Rua: "R40",
    Alertas: "⚠️ RUA ERRADA",
  },
  {
    PLU: "1345332",
    Descrição: "HEINEKEN LTA 269ML",
    plt: 442,
    "Categoria Ruas": "Blocado",
    "Categoria Item": "LIQUIDA",
    Altura: 999,
    Rua: "R93",
    Alertas: "OK",
  },
  {
    PLU: "189201",
    Descrição: "ARROZ TIO JOAO TP1 5KG",
    plt: 54,
    "Categoria Ruas": "Mercearia Básica",
    "Categoria Item": "MERCEARIA BASICA",
    Altura: 120,
    Rua: "R12",
    Alertas: "OK",
  },
  {
    PLU: "249102",
    Descrição: "FEIJAO CARIOCA CAMIL 1KG",
    plt: 28,
    "Categoria Ruas": "Mercearia Complementar",
    "Categoria Item": "MERCEARIA BASICA",
    Altura: 135,
    Rua: "R18",
    Alertas: "⚠️ RUA ERRADA",
  },
  {
    PLU: "341908",
    Descrição: "CERVEJA AMSTEL LATA 350ML",
    plt: 120,
    "Categoria Ruas": "Blocado",
    "Categoria Item": "LIQUIDA",
    Altura: 999,
    Rua: "R91",
    Alertas: "OK",
  },
  {
    PLU: "492011",
    Descrição: "SABAO PO OMO LAVAGEM PERF 1.6KG",
    plt: 65,
    "Categoria Ruas": "Limpeza & Higiene",
    "Categoria Item": "LIMPEZA",
    Altura: 150,
    Rua: "R52",
    Alertas: "OK",
  },
  {
    PLU: "512930",
    Descrição: "DESINFETANTE PINHO SOL 1L",
    plt: 19,
    "Categoria Ruas": "Mercearia Básica",
    "Categoria Item": "LIMPEZA",
    Altura: 140,
    Rua: "R14",
    Alertas: "⚠️ RUA ERRADA",
  },
  {
    PLU: "681920",
    Descrição: "AGUA MINERAL BONAFONT 1.5L",
    plt: 88,
    "Categoria Ruas": "Blocado",
    "Categoria Item": "LIQUIDA",
    Altura: 999,
    Rua: "R88",
    Alertas: "OK",
  },
  {
    PLU: "729104",
    Descrição: "OLEO DE SOJA LIZA 900ML",
    plt: 42,
    "Categoria Ruas": "Mercearia Básica",
    "Categoria Item": "MERCEARIA BASICA",
    Altura: 130,
    Rua: "R11",
    Alertas: "OK",
  },
  {
    PLU: "891023",
    Descrição: "LEITE CONDENSADO MOCA 395G",
    plt: 35,
    "Categoria Ruas": "Mercearia Básica",
    "Categoria Item": "DOCES & SOBREMESAS",
    Altura: 145,
    Rua: "R22",
    Alertas: "⚠️ RUA ERRADA",
  },
];

// Função de normalização resiliente dos registros
function normalizeAlertaItem(raw: RawAlertaApiItem, index: number): AlertaRowNormalized {
  const plu = String(raw.PLU ?? raw.plu ?? "").trim();
  const descricao = String(raw.Descrição ?? raw.Descricao ?? raw.descricao ?? "").trim();
  const rawPlt = raw["Soma de plt"] ?? raw.plt ?? 0;
  const somaPlt = typeof rawPlt === "number" ? rawPlt : parseFloat(String(rawPlt).replace(",", ".")) || 0;
  const categoriaRuas = String(raw["Categoria Ruas"] ?? raw.categoriaRuas ?? "Não Definido").trim();
  const categoriaItem = String(raw["Categoria Item"] ?? raw.categoriaItem ?? "Não Definido").trim();
  const altura = raw.Altura ?? raw.altura ?? "-";
  const rua = String(raw.Rua ?? raw.rua ?? "-").trim();
  const alertas = String(raw.Alertas ?? raw.alerta ?? raw.alertas ?? "OK").trim();

  const isRuaErrada =
    alertas.toUpperCase().includes("ERRADA") ||
    alertas.toUpperCase().includes("ERRO") ||
    alertas.toUpperCase().includes("DIVERG") ||
    alertas.includes("⚠️");

  return {
    id: `${plu}-${rua}-${index}`,
    plu,
    descricao,
    somaPlt,
    categoriaRuas,
    categoriaItem,
    altura,
    rua,
    alertas,
    isRuaErrada,
  };
}

export default function AlertaCategorias({
  theme = "light",
  showNotification,
}: AlertaCategoriasProps) {
  const isDark = theme === "dark";

  // Estados principais da fonte de dados
  const [rawItems, setRawItems] = useState<RawAlertaApiItem[]>(() => {
    // 1. Tenta recuperar do cache de sessão (otimização para carregar 1x por login)
    try {
      const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return FALLBACK_ALERTAS;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [apiSource, setApiSource] = useState<"LIVE" | "CACHE_SESSAO">(() => {
    try {
      return sessionStorage.getItem(SESSION_CACHE_KEY) ? "CACHE_SESSAO" : "LIVE";
    } catch {
      return "LIVE";
    }
  });

  const [lastFetchTime, setLastFetchTime] = useState<string>(() => {
    try {
      const savedTime = sessionStorage.getItem(SESSION_TIMESTAMP_KEY);
      if (savedTime) return savedTime;
    } catch {}
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(now.getHours())}h${pad(now.getMinutes())}`;
  });

  const [copiedSummary, setCopiedSummary] = useState(false);

  // Estados de Filtros solicitados:
  // 1. Alerta Rua: "TODOS", "OK", "ERRADA"
  const [filtroAlerta, setFiltroAlerta] = useState<"TODOS" | "OK" | "ERRADA">("TODOS");
  // 2. Filtro Categoria Ruas
  const [filtroCategoriaRuas, setFiltroCategoriaRuas] = useState<string>("TODAS");
  // 3. Filtro Categoria Item
  const [filtroCategoriaItem, setFiltroCategoriaItem] = useState<string>("TODAS");
  // 4. Busca por PLU e Descrição
  const [buscaPlu, setBuscaPlu] = useState<string>("");

  // Paginação e Ordenação
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [sortField, setSortField] = useState<keyof AlertaRowNormalized>("isRuaErrada");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Normalização de todos os registros
  const normalizedData = useMemo(() => {
    return rawItems.map((item, index) => normalizeAlertaItem(item, index));
  }, [rawItems]);

  // Lista dinâmica e única de Categorias de Ruas
  const listaCategoriasRuas = useMemo(() => {
    const set = new Set<string>();
    normalizedData.forEach((item) => {
      if (item.categoriaRuas) set.add(item.categoriaRuas);
    });
    return Array.from(set).sort();
  }, [normalizedData]);

  // Lista dinâmica e única de Categorias de Item
  const listaCategoriasItem = useMemo(() => {
    const set = new Set<string>();
    normalizedData.forEach((item) => {
      if (item.categoriaItem) set.add(item.categoriaItem);
    });
    return Array.from(set).sort();
  }, [normalizedData]);

  // Função para buscar dados da API "http://10.210.2.131:3333/api/alertas"
  const fetchAlertas = useCallback(
    async (forceRefresh: boolean = false) => {
      // Se já temos dados na sessão e não foi solicitado refresh manual, não re-executa a requisição pesada
      if (!forceRefresh) {
        try {
          const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setRawItems(parsed);
              setApiSource("CACHE_SESSAO");
              return;
            }
          }
        } catch {}
      }

      setIsRefreshing(true);
      let success = false;

      // 1. Tenta carregar via proxy backend /api/alertas (resolve timeout e CORS corporativo)
      try {
        const response = await fetch("/api/alertas", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            setRawItems(data);
            success = true;
            const xSource = response.headers.get("X-Source");
            setApiSource(xSource === "LIVE_API" ? "LIVE" : "CACHE_SESSAO");

            // Salva na sessionStorage para otimização de login
            try {
              sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(data));
              const now = new Date();
              const pad = (n: number) => String(n).padStart(2, "0");
              const timeStr = `${pad(now.getHours())}h${pad(now.getMinutes())}`;
              sessionStorage.setItem(SESSION_TIMESTAMP_KEY, timeStr);
              setLastFetchTime(timeStr);
            } catch {}
          }
        }
      } catch (err) {
        console.warn("Proxy /api/alertas indisponível:", err);
      }

      // 2. Fallback direto se estiver em protocolo HTTP na intranet corporativa
      if (!success && typeof window !== "undefined" && window.location.protocol === "http:") {
        try {
          const directRes = await fetch("http://10.210.2.131:3333/api/alertas", {
            headers: { Accept: "application/json" },
            cache: "no-store",
          });

          if (directRes.ok) {
            const data = await directRes.json();
            if (Array.isArray(data) && data.length > 0) {
              setRawItems(data);
              setApiSource("LIVE");
              success = true;

              try {
                sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(data));
                const now = new Date();
                const pad = (n: number) => String(n).padStart(2, "0");
                const timeStr = `${pad(now.getHours())}h${pad(now.getMinutes())}`;
                sessionStorage.setItem(SESSION_TIMESTAMP_KEY, timeStr);
                setLastFetchTime(timeStr);
              } catch {}
            }
          }
        } catch (e) {
          console.warn("Chamada direta http://10.210.2.131:3333/api/alertas indisponível:", e);
        }
      }

      setIsRefreshing(false);

      if (success && showNotification && forceRefresh) {
        showNotification("✅ Base de alertas atualizada com sucesso de http://10.210.2.131:3333/api/alertas");
      }
    },
    [showNotification]
  );

  // Executa uma única vez por login / montagem
  useEffect(() => {
    fetchAlertas(false);
  }, [fetchAlertas]);

  // Filtragem dos registros
  const filteredData = useMemo(() => {
    return normalizedData.filter((item) => {
      // 1. Filtro Alerta Rua (OK ou Rua Errada)
      if (filtroAlerta === "OK" && item.isRuaErrada) return false;
      if (filtroAlerta === "ERRADA" && !item.isRuaErrada) return false;

      // 2. Filtro Categoria Ruas
      if (filtroCategoriaRuas !== "TODAS" && item.categoriaRuas !== filtroCategoriaRuas) {
        return false;
      }

      // 3. Filtro Categoria Item
      if (filtroCategoriaItem !== "TODAS" && item.categoriaItem !== filtroCategoriaItem) {
        return false;
      }

      // 4. Busca por PLU ou Descrição
      if (buscaPlu.trim()) {
        const query = buscaPlu.toLowerCase().trim();
        const matchPlu = item.plu.toLowerCase().includes(query);
        const matchDesc = item.descricao.toLowerCase().includes(query);
        const matchRua = item.rua.toLowerCase().includes(query);
        if (!matchPlu && !matchDesc && !matchRua) return false;
      }

      return true;
    });
  }, [normalizedData, filtroAlerta, filtroCategoriaRuas, filtroCategoriaItem, buscaPlu]);

  // Ordenação dos registros filtrados
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (sortOrder === "asc") {
        return valA > valB ? 1 : -1;
      }
      return valA < valB ? 1 : -1;
    });
  }, [filteredData, sortField, sortOrder]);

  // Paginação dos registros
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Reset de página ao alterar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [filtroAlerta, filtroCategoriaRuas, filtroCategoriaItem, buscaPlu, pageSize]);

  // Contagens para os botões do filtro de alerta (respeitando filtros de categoria e busca)
  const alertCounts = useMemo(() => {
    const base = normalizedData.filter((item) => {
      if (filtroCategoriaRuas !== "TODAS" && item.categoriaRuas !== filtroCategoriaRuas) return false;
      if (filtroCategoriaItem !== "TODAS" && item.categoriaItem !== filtroCategoriaItem) return false;
      if (buscaPlu.trim()) {
        const query = buscaPlu.toLowerCase().trim();
        const matchPlu = item.plu.toLowerCase().includes(query);
        const matchDesc = item.descricao.toLowerCase().includes(query);
        const matchRua = item.rua.toLowerCase().includes(query);
        if (!matchPlu && !matchDesc && !matchRua) return false;
      }
      return true;
    });

    const erradas = base.filter((i) => i.isRuaErrada).length;
    const ok = base.length - erradas;
    return {
      todos: base.length,
      erradas,
      ok,
    };
  }, [normalizedData, filtroCategoriaRuas, filtroCategoriaItem, buscaPlu]);

  // KPIs agregados que respeitam estritamente todos os filtros ativos (alerta, categoria ruas, categoria item, busca)
  const stats = useMemo(() => {
    const totalItens = filteredData.length;
    const totalRuasErradas = filteredData.filter((i) => i.isRuaErrada).length;
    const totalRuasOk = filteredData.filter((i) => !i.isRuaErrada).length;

    const totalPlt = filteredData.reduce((acc, curr) => acc + curr.somaPlt, 0);
    const totalPltCorreto = filteredData
      .filter((i) => !i.isRuaErrada)
      .reduce((acc, curr) => acc + curr.somaPlt, 0);
    const totalPltErrado = filteredData
      .filter((i) => i.isRuaErrada)
      .reduce((acc, curr) => acc + curr.somaPlt, 0);

    const pctPltErrado =
      totalPlt > 0 ? ((totalPltErrado / totalPlt) * 100).toFixed(1) : "0.0";
    const pctPltCorreto =
      totalPlt > 0 ? ((totalPltCorreto / totalPlt) * 100).toFixed(1) : "0.0";

    return {
      totalItens,
      totalRuasErradas,
      totalRuasOk,
      totalPlt,
      totalPltCorreto,
      totalPltErrado,
      pctPltErrado,
      pctPltCorreto,
      pctErro: pctPltErrado,
    };
  }, [filteredData]);

  // Alternador de ordenação
  const handleSort = (field: keyof AlertaRowNormalized) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Exportação para Excel (.xlsx) com todas as colunas solicitadas
  const handleExportExcel = () => {
    if (sortedData.length === 0) {
      if (showNotification) showNotification("⚠️ Não há dados filtrados para exportar.");
      return;
    }

    const exportRows = sortedData.map((item) => ({
      PLU: item.plu,
      Descrição: item.descricao,
      "Soma de plt": item.somaPlt,
      "Categoria Ruas": item.categoriaRuas,
      "Categoria Item": item.categoriaItem,
      Altura: item.altura,
      Rua: item.rua,
      Alertas: item.alertas,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Alerta_Categorias");
    XLSX.writeFile(workbook, `Alerta_Categorias_Ruas_${new Date().toISOString().slice(0, 10)}.xlsx`);

    if (showNotification) showNotification(`📥 Planilha com ${exportRows.length} registros exportada com sucesso!`);
  };

  // Copiar resumo das ruas erradas para envio rápido
  const handleCopySummary = () => {
    const erradas = sortedData.filter((i) => i.isRuaErrada);
    const summaryLines = erradas.slice(0, 15).map(
      (item) => `• PLU ${item.plu} - ${item.descricao} | Rua ${item.rua} (${item.categoriaRuas} vs ${item.categoriaItem}) - ${item.somaPlt} plt`
    );

    const text = `🚨 *RELATÓRIO DE ALERTAS DE RUAS E CATEGORIAS*
🕒 Sincronizado às ${lastFetchTime} | API 10.210.2.131:3333
Total de Ruas com Alerta de Divergência: ${erradas.length} de ${sortedData.length} registros

${summaryLines.join("\n")}
${erradas.length > 15 ? `\n...e mais ${erradas.length - 15} divergências.` : ""}

_Portal Logística GPA 2026_`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 3000);

    if (showNotification) showNotification("📋 Resumo copiado para área de transferência!");
  };

  return (
    <div
      className={`min-h-full w-full flex flex-col p-4 md:p-6 transition-colors duration-200 ${
        isDark ? "bg-[#070b14] text-slate-100" : "bg-[#f8fafc] text-slate-950"
      }`}
    >
      {/* ============================================================
          CABEÇALHO PRINCIPAL
          ============================================================ */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-300 dark:border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-950 dark:text-white tracking-tight">
                  Alerta Categorias
                </h1>
                {/* <span className="px-2.5 py-0.5 text-[10px] font-black font-mono uppercase rounded-full bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30">
                  {stats.totalRuasErradas} Ruas com Alerta
                </span> */}
              </div>
              {/* <p className="text-xs text-slate-700 dark:text-slate-400 font-semibold">
                Auditoria de alocação de itens por ruas e validação de categorias (API http://10.210.2.131:3333/api/alertas)
              </p> */}
            </div>
          </div>
        </div>

        {/* Informações de Carga & Botões de Ação */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Badge Otimização de Sessão (1x por login) */}
          <div
            
          >
            
            
            
           
          </div>

          {/* Copiar Resumo */}
          
          {/* Exportar Excel */}
          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white transition-all shadow-xs cursor-pointer border border-emerald-600"
            title="Exportar tabela atualizada para Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Exportar Excel</span>
          </button>

          {/* Forçar Atualização Manual */}
          <button
            onClick={() => fetchAlertas(true)}
            disabled={isRefreshing}
            className={`px-3 py-1.5 rounded-lg border text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              isDark
                ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                : "bg-white hover:bg-slate-100 text-slate-900 border-slate-300 shadow-xs"
            }`}
            title="Recarregar base completa da API externa"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-600" : "text-slate-800 dark:text-slate-300"}`} />
            <span>{isRefreshing ? "Buscando..." : "Atualizar"}</span>
          </button>
        </div>
      </div>

      {/* ============================================================
          CARDS DE KPI SOLICITADOS:
          1. Total de Paletes
          2. Paletes em Categorias Corretas
          3. PLTs em Categorias Erradas
          4. Percentual de Paletes Errados
          (Todos respeitando os filtros de alerta, categoria ruas, categoria item e busca)
          ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 py-4">
        {/* CARD 1: Total de Paletes */}
        <div
          className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
            isDark ? "bg-[#0e1424] border-slate-800" : "bg-white border-slate-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-400">
              Total de Paletes
            </span>
            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-200 dark:border-transparent">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-950 dark:text-white tracking-tight">
              {stats.totalPlt.toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-400">
              paletes totais
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-700 dark:text-slate-400 truncate font-semibold">
            <strong className="text-slate-950 dark:text-slate-200 font-black">{stats.totalItens.toLocaleString("pt-BR")}</strong> registros no filtro ativo
          </div>
        </div>

        {/* CARD 2: Quantos Paletes Estão nas Categorias Corretas */}
        <div
          className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
            isDark ? "bg-[#0e1424] border-slate-800" : "bg-white border-slate-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-400">
              Categorias Corretas
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-transparent">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-800 dark:text-emerald-400 tracking-tight">
              {stats.totalPltCorreto.toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/30">
              {stats.pctPltCorreto}%
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-700 dark:text-slate-400 truncate font-semibold">
            <strong className="text-emerald-800 dark:text-emerald-300 font-black">{stats.totalRuasOk.toLocaleString("pt-BR")}</strong> itens conformados (Rua OK)
          </div>
        </div>

        {/* CARD 3: PLTs em Categorias Erradas */}
        <div
          className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
            isDark ? "bg-[#0e1424] border-slate-800" : "bg-white border-slate-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-400">
              PLTs em Categorias Erradas
            </span>
            <div className="p-1.5 rounded-lg bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-400 border border-rose-200 dark:border-transparent">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-800 dark:text-rose-400 tracking-tight">
              {stats.totalPltErrado.toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] font-black text-rose-800 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800/30">
              {stats.pctPltErrado}%
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-700 dark:text-slate-400 truncate font-semibold">
            <strong className="text-rose-800 dark:text-rose-300 font-black">{stats.totalRuasErradas.toLocaleString("pt-BR")}</strong> itens em ruas divergentes
          </div>
        </div>

        {/* CARD 4: Percentual de Paletes Errados */}
        <div
          className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
            isDark ? "bg-[#0e1424] border-slate-800" : "bg-white border-slate-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-400">
              % Paletes Errados
            </span>
            <div className={`p-1.5 rounded-lg border ${
              Number(stats.pctPltErrado) > 0
                ? "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-transparent"
                : "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-transparent"
            }`}>
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-black tracking-tight ${
              Number(stats.pctPltErrado) > 0
                ? "text-rose-800 dark:text-rose-400"
                : "text-emerald-800 dark:text-emerald-400"
            }`}>
              {stats.pctPltErrado}%
            </span>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-400">
              divergência de volume
            </span>
          </div>
          {/* Barra de progresso visual */}
          <div className="mt-2 w-full">
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  Number(stats.pctPltErrado) > 0
                    ? "bg-rose-600"
                    : "bg-emerald-600"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, Number(stats.pctPltErrado)))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          BARRA DE FILTROS SOLICITADOS:
          - Alerta Rua OK ou Rua Errada
          - Categoria Ruas
          - Categoria Item
          - Busca por PLU / Descrição
          ============================================================ */}
      <div
        className={`p-3.5 rounded-xl border mb-4 flex flex-col gap-3 ${
          isDark ? "bg-[#0c1220] border-slate-800" : "bg-white border-slate-300 shadow-xs"
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          {/* 1. Busca por PLU / Descrição */}
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por PLU (ex: 106498) ou Descrição..."
              value={buscaPlu}
              onChange={(e) => setBuscaPlu(e.target.value)}
              className={`w-full pl-8.5 pr-3 py-1.5 text-xs font-semibold rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                isDark
                  ? "bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500"
                  : "bg-white border-slate-300 text-slate-950 placeholder-slate-500 shadow-xs"
              }`}
            />
            {buscaPlu && (
              <button
                onClick={() => setBuscaPlu("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-950 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>

          {/* 2. Filtro Alerta Rua: Todos | Rua OK | Rua Errada */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black text-slate-900 dark:text-slate-300 uppercase">Alerta:</span>
            <div
              className={`flex items-center p-0.5 rounded-lg border ${
                isDark ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-300"
              }`}
            >
              <button
                onClick={() => setFiltroAlerta("TODOS")}
                className={`px-2.5 py-1 text-[11px] font-black rounded-md transition-colors cursor-pointer ${
                  filtroAlerta === "TODOS"
                    ? "bg-blue-700 text-white shadow-xs"
                    : "text-slate-800 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
                }`}
              >
                Todos ({alertCounts.todos})
              </button>
              <button
                onClick={() => setFiltroAlerta("ERRADA")}
                className={`px-2.5 py-1 text-[11px] font-black rounded-md transition-colors cursor-pointer ${
                  filtroAlerta === "ERRADA"
                    ? "bg-rose-700 text-white shadow-xs"
                    : "text-rose-800 dark:text-rose-400 hover:text-rose-950 dark:hover:text-rose-300"
                }`}
              >
                ⚠️ Rua Errada ({alertCounts.erradas})
              </button>
              <button
                onClick={() => setFiltroAlerta("OK")}
                className={`px-2.5 py-1 text-[11px] font-black rounded-md transition-colors cursor-pointer ${
                  filtroAlerta === "OK"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "text-emerald-800 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-300"
                }`}
              >
                ✓ Rua OK ({alertCounts.ok})
              </button>
            </div>
          </div>

          {/* 3. Filtro Categoria Ruas */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black text-slate-900 dark:text-slate-300 uppercase">Cat. Ruas:</span>
            <select
              value={filtroCategoriaRuas}
              onChange={(e) => setFiltroCategoriaRuas(e.target.value)}
              className={`px-2.5 py-1.5 text-xs font-black rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                isDark ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-300 text-slate-950 shadow-xs"
              }`}
            >
              <option value="TODAS">Todas as Categorias de Ruas</option>
              {listaCategoriasRuas.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Filtro Categoria Item */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black text-slate-900 dark:text-slate-300 uppercase">Cat. Item:</span>
            <select
              value={filtroCategoriaItem}
              onChange={(e) => setFiltroCategoriaItem(e.target.value)}
              className={`px-2.5 py-1.5 text-xs font-black rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                isDark ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-300 text-slate-950 shadow-xs"
              }`}
            >
              <option value="TODAS">Todas as Categorias de Item</option>
              {listaCategoriasItem.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Botão Limpar Filtros */}
          {(filtroAlerta !== "TODOS" ||
            filtroCategoriaRuas !== "TODAS" ||
            filtroCategoriaItem !== "TODAS" ||
            buscaPlu) && (
            <button
              onClick={() => {
                setFiltroAlerta("TODOS");
                setFiltroCategoriaRuas("TODAS");
                setFiltroCategoriaItem("TODAS");
                setBuscaPlu("");
              }}
              className="text-xs text-blue-700 dark:text-blue-400 hover:underline font-black cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* ============================================================
          TABELA PRINCIPAL:
          Colunas: PLU | Descrição | Soma de plt | Categoria Ruas | Categoria Item | Altura | Rua | Alertas
          ============================================================ */}
      <div
        className={`rounded-xl border overflow-hidden flex flex-col flex-1 ${
          isDark ? "bg-[#0c1220] border-slate-800" : "bg-white border-slate-300 shadow-xs"
        }`}
      >
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                className={`border-b text-[11px] font-black uppercase tracking-wider ${
                  isDark
                    ? "bg-slate-900/90 border-slate-800 text-slate-300"
                    : "bg-slate-100 border-slate-300 text-slate-950"
                }`}
              >
                {/* 1. PLU */}
                <th className="py-3 px-3.5">
                  <button
                    onClick={() => handleSort("plu")}
                    className="flex items-center gap-1 font-black text-slate-950 dark:text-white cursor-pointer hover:underline"
                  >
                    <span>PLU</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                  </button>
                </th>

                {/* 2. Descrição */}
                <th className="py-3 px-3.5">
                  <button
                    onClick={() => handleSort("descricao")}
                    className="flex items-center gap-1 font-black text-slate-950 dark:text-white cursor-pointer hover:underline"
                  >
                    <span>Descrição</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                  </button>
                </th>

                {/* 3. Soma de plt */}
                <th className="py-3 px-3.5 text-right">
                  <button
                    onClick={() => handleSort("somaPlt")}
                    className="inline-flex items-center gap-1 font-black text-slate-950 dark:text-white cursor-pointer hover:underline"
                  >
                    <span>Soma de plt</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                  </button>
                </th>

                {/* 4. Categoria Ruas */}
                <th className="py-3 px-3.5">
                  <button
                    onClick={() => handleSort("categoriaRuas")}
                    className="flex items-center gap-1 font-black text-slate-950 dark:text-white cursor-pointer hover:underline"
                  >
                    <span>Categoria Ruas</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                  </button>
                </th>

                {/* 5. Categoria Item */}
                <th className="py-3 px-3.5">
                  <button
                    onClick={() => handleSort("categoriaItem")}
                    className="flex items-center gap-1 font-black text-slate-950 dark:text-white cursor-pointer hover:underline"
                  >
                    <span>Categoria Item</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                  </button>
                </th>

                {/* 6. Altura */}
                <th className="py-3 px-3.5 text-center">
                  <button
                    onClick={() => handleSort("altura")}
                    className="inline-flex items-center gap-1 font-black text-slate-950 dark:text-white cursor-pointer hover:underline"
                  >
                    <span>Altura</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                  </button>
                </th>

                {/* 7. Rua */}
                <th className="py-3 px-3.5 text-center">
                  <button
                    onClick={() => handleSort("rua")}
                    className="inline-flex items-center gap-1 font-black text-slate-950 dark:text-white cursor-pointer hover:underline"
                  >
                    <span>Rua</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                  </button>
                </th>

                {/* 8. Alertas */}
                <th className="py-3 px-3.5 text-center">
                  <button
                    onClick={() => handleSort("isRuaErrada")}
                    className="inline-flex items-center gap-1 font-black text-slate-950 dark:text-white cursor-pointer hover:underline"
                  >
                    <span>Alertas</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 text-xs">
              {paginatedData.length > 0 ? (
                paginatedData.map((row) => (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      row.isRuaErrada
                        ? isDark
                          ? "bg-rose-950/15 hover:bg-rose-950/25"
                          : "bg-rose-50/70 hover:bg-rose-100/80"
                        : "hover:bg-slate-100/80 dark:hover:bg-slate-900/50"
                    }`}
                  >
                    {/* PLU */}
                    <td className="py-2.5 px-3.5 font-mono font-black text-sm text-blue-800 dark:text-blue-400">
                      {row.plu}
                    </td>

                    {/* Descrição */}
                    <td className="py-2.5 px-3.5 font-black text-slate-950 dark:text-slate-100 max-w-xs truncate">
                      {row.descricao}
                    </td>

                    {/* Soma de plt */}
                    <td className="py-2.5 px-3.5 font-mono font-black text-sm text-right text-slate-950 dark:text-white">
                      {row.somaPlt.toLocaleString("pt-BR")}
                    </td>

                    {/* Categoria Ruas */}
                    <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-slate-200">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-950 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                        {row.categoriaRuas}
                      </span>
                    </td>

                    {/* Categoria Item */}
                    <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-slate-200">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-950 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                        {row.categoriaItem}
                      </span>
                    </td>

                    {/* Altura */}
                    <td className="py-2.5 px-3.5 font-mono text-center text-slate-950 dark:text-slate-300 font-black">
                      {row.altura}
                    </td>

                    {/* Rua */}
                    <td className="py-2.5 px-3.5 font-mono text-center font-black text-xs text-slate-950 dark:text-white">
                      <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-black text-slate-950 dark:text-white border border-slate-300 dark:border-transparent">
                        {row.rua}
                      </span>
                    </td>

                    {/* Alertas */}
                    <td className="py-2.5 px-3.5 text-center">
                      {row.isRuaErrada ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black font-mono uppercase bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30">
                          {row.alertas}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black font-mono uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800 dark:text-emerald-400" />
                          {row.alertas}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-700 dark:text-slate-400 font-bold">
                    Nenhum item encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da Tabela: Paginação */}
        <div
          className={`p-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
            isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-300 bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-400 font-semibold">
            <span>
              Exibindo{" "}
              <strong className="text-slate-950 dark:text-slate-200 font-black">
                {sortedData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
              </strong>{" "}
              a{" "}
              <strong className="text-slate-950 dark:text-slate-200 font-black">
                {Math.min(currentPage * pageSize, sortedData.length)}
              </strong>{" "}
              de <strong className="text-slate-950 dark:text-slate-200 font-black">{sortedData.length}</strong> itens
            </span>

            <span className="text-slate-400">·</span>

            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className={`px-2 py-0.5 rounded border text-xs cursor-pointer font-black ${
                isDark ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-300 text-slate-950"
              }`}
            >
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
              <option value={100}>100 por página</option>
              <option value={250}>250 por página</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`p-1.5 rounded-lg border text-xs font-black flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${
                isDark
                  ? "bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300"
                  : "bg-white border-slate-300 hover:bg-slate-100 text-slate-950 shadow-xs"
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </button>

            <span className="px-2 font-mono font-black text-slate-950 dark:text-slate-300">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`p-1.5 rounded-lg border text-xs font-black flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${
                isDark
                  ? "bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300"
                  : "bg-white border-slate-300 hover:bg-slate-100 text-slate-950 shadow-xs"
              }`}
            >
              <span>Próxima</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================
          RODAPÉ INFORMATIVO
          ============================================================ */}
      <div className="mt-4 pt-3 border-t border-slate-300 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-700 dark:text-slate-400 font-semibold gap-2">
        <div className="flex items-center gap-2">
          GPA PPCP · Gestão de Alertas de Ruas 2026

        </div>
        <div className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-400">
          
        </div>
      </div>
    </div>
  );
}
