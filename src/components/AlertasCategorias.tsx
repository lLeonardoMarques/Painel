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

  // ============================================================
  // ESTILOS (mesmo padrão visual da tela Capacidades)
  // ============================================================
  const ui = {
    card: "rounded-2xl bg-white/70 dark:bg-slate-900/60 shadow-xs backdrop-blur-md transition-colors",
    select: "w-full rounded-xl bg-slate-500/5 dark:bg-slate-500/10 hover:bg-slate-500/10 dark:hover:bg-slate-500/15 px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 transition-colors cursor-pointer border-0",
    label: "mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300",
    labelIcon: "h-3.5 w-3.5 text-slate-400 dark:text-slate-500",
    ghostBtn: "inline-flex h-9 items-center gap-2 rounded-xl bg-slate-500/10 hover:bg-slate-500/15 text-slate-700 dark:text-slate-200 px-3.5 text-xs font-semibold disabled:opacity-50 cursor-pointer transition-colors",
    th: "px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 select-none whitespace-nowrap",
    td: "px-4 py-3 text-sm text-slate-700 dark:text-slate-200",
    chip: "whitespace-nowrap px-2 py-0.5 rounded-md text-xs font-medium bg-slate-500/10 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300",
  };
  const optionClass = isDark ? "bg-slate-900 text-slate-100" : "";
  const hasActiveFilters =
    filtroAlerta !== "TODOS" || filtroCategoriaRuas !== "TODAS" || filtroCategoriaItem !== "TODAS" || !!buscaPlu;

  const SortTh = ({ field, label, align = "left", first, last }: { field: string; label: string; align?: "left" | "right" | "center"; first?: boolean; last?: boolean }) => (
    <th className={`${ui.th} ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"} ${first ? "rounded-l-xl" : ""} ${last ? "rounded-r-xl" : ""}`}>
      <button
        type="button"
        onClick={() => handleSort(field as any)}
        className={`inline-flex items-center gap-1 uppercase tracking-[0.12em] hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer transition-colors ${
          align === "right" ? "flex-row-reverse" : ""
        }`}
      >
        <span>{label}</span>
        <ArrowUpDown className="w-3 h-3 opacity-60" />
      </button>
    </th>
  );

  const kpiCards = [
    {
      label: "Total de paletes",
      icon: Boxes,
      value: stats.totalPlt.toLocaleString("pt-BR"),
      hint: `${stats.totalItens.toLocaleString("pt-BR")} registros no filtro`,
      tone: "text-slate-900 dark:text-slate-100",
    },
    {
      label: "Categorias corretas",
      icon: ShieldCheck,
      value: stats.totalPltCorreto.toLocaleString("pt-BR"),
      hint: `${stats.pctPltCorreto}% · ${stats.totalRuasOk.toLocaleString("pt-BR")} itens com rua OK`,
      tone: "text-emerald-700 dark:text-emerald-400",
    },
    {
      label: "Paletes em categoria errada",
      icon: ShieldAlert,
      value: stats.totalPltErrado.toLocaleString("pt-BR"),
      hint: `${stats.pctPltErrado}% · ${stats.totalRuasErradas.toLocaleString("pt-BR")} itens divergentes`,
      tone: "text-rose-700 dark:text-rose-400",
    },
    {
      label: "% paletes errados",
      icon: Percent,
      value: `${stats.pctPltErrado}%`,
      hint: "divergência de volume",
      tone: Number(stats.pctPltErrado) > 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400",
      bar: Math.min(100, Math.max(0, Number(stats.pctPltErrado))),
    },
  ];

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-5 text-slate-900 dark:text-slate-100">
      <div className="max-w-[1760px] mx-auto w-full space-y-6">
        {/* CABEÇALHO */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Análise e monitoramento
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Alertas de categorias
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Auditoria da alocação de itens por rua e validação de categorias.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={handleCopySummary} className={ui.ghostBtn} title="Copiar resumo das ruas com divergência">
              {copiedSummary ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedSummary ? "Copiado" : "Copiar resumo"}</span>
            </button>
            <button type="button" onClick={handleExportExcel} className={ui.ghostBtn} title="Exportar tabela para Excel (.xlsx)">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Exportar Excel</span>
            </button>
            <button
              type="button"
              onClick={() => fetchAlertas(true)}
              disabled={isRefreshing}
              className={ui.ghostBtn}
              title="Recarregar base completa da API"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Atualizando..." : "Atualizar dados"}</span>
            </button>
          </div>
        </header>

        {/* FILTROS */}
        <section className={`${ui.card} p-4 sm:p-5`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block">
              <span className={ui.label}><Search className={ui.labelIcon} /> Buscar</span>
              <div className="relative">
                <input
                  type="text"
                  placeholder="PLU (ex: 106498) ou descrição..."
                  value={buscaPlu}
                  onChange={(e) => setBuscaPlu(e.target.value)}
                  className={`${ui.select} cursor-text placeholder:text-slate-400 dark:placeholder:text-slate-500 pr-8`}
                />
                {buscaPlu && (
                  <button
                    type="button"
                    onClick={() => setBuscaPlu("")}
                    aria-label="Limpar busca"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 text-sm cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>
            </label>
            <label className="block">
              <span className={ui.label}><Building2 className={ui.labelIcon} /> Categoria da rua</span>
              <select value={filtroCategoriaRuas} onChange={(e) => setFiltroCategoriaRuas(e.target.value)} className={ui.select}>
                <option value="TODAS" className={optionClass}>Todas as categorias de rua</option>
                {listaCategoriasRuas.map((cat) => (
                  <option key={cat} value={cat} className={optionClass}>{cat}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={ui.label}><Layers className={ui.labelIcon} /> Categoria do item</span>
              <select value={filtroCategoriaItem} onChange={(e) => setFiltroCategoriaItem(e.target.value)} className={ui.select}>
                <option value="TODAS" className={optionClass}>Todas as categorias de item</option>
                {listaCategoriasItem.map((cat) => (
                  <option key={cat} value={cat} className={optionClass}>{cat}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {/* CONTAINER PRINCIPAL */}
        <section className={`${ui.card} p-5 sm:p-6 space-y-6`}>
          {/* SEGMENTED CONTROL + STATUS */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex p-1 rounded-xl bg-slate-500/10 dark:bg-slate-500/15" role="tablist" aria-label="Filtro de alerta">
              {([
                ["TODOS", "Todos", alertCounts.todos, null],
                ["ERRADA", "Rua errada", alertCounts.erradas, "bg-rose-500"],
                ["OK", "Rua OK", alertCounts.ok, "bg-emerald-500"],
              ] as const).map(([key, label, count, dot]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={filtroAlerta === key}
                  onClick={() => setFiltroAlerta(key)}
                  className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    filtroAlerta === key
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
                  <span>{label}</span>
                  <span className="font-mono text-[10px] opacity-70">{count}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setFiltroAlerta("TODOS");
                    setFiltroCategoriaRuas("TODAS");
                    setFiltroCategoriaItem("TODAS");
                    setBuscaPlu("");
                  }}
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Limpar filtros
                </button>
              )}
              <span className="font-mono">
                {sortedData.length.toLocaleString("pt-BR")} registros · atualizado {lastFetchTime}
              </span>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {kpiCards.map((k) => (
              <div
                key={k.label}
                className="p-4 rounded-xl bg-slate-500/[0.04] dark:bg-slate-500/[0.08] hover:bg-slate-500/[0.07] dark:hover:bg-slate-500/[0.12] transition-colors"
              >
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <k.icon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                  <span>{k.label}</span>
                </div>
                <div className={`mt-2 font-mono text-xl sm:text-2xl font-bold tracking-tight tabular-nums ${k.tone}`}>{k.value}</div>
                {"bar" in k && k.bar !== undefined ? (
                  <div className="mt-2 h-1.5 w-full rounded-full bg-slate-500/15 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${Number(stats.pctPltErrado) > 0 ? "bg-rose-500" : "bg-emerald-500"}`}
                      style={{ width: `${k.bar}%` }}
                    />
                  </div>
                ) : (
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">{k.hint}</div>
                )}
              </div>
            ))}
          </div>

          {/* TABELA */}
          <div className="max-h-[620px] overflow-auto">
            <table className="w-full min-w-[1080px] text-left border-separate border-spacing-y-1">
              <thead className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
                <tr>
                  <SortTh field="plu" label="PLU" first />
                  <SortTh field="descricao" label="Descrição" />
                  <SortTh field="somaPlt" label="Paletes" align="right" />
                  <SortTh field="categoriaRuas" label="Categoria rua" />
                  <SortTh field="categoriaItem" label="Categoria item" />
                  <SortTh field="altura" label="Altura" align="center" />
                  <SortTh field="rua" label="Rua" align="center" />
                  <SortTh field="isRuaErrada" label="Alerta" align="center" last />
                </tr>
              </thead>
              <tbody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((row) => (
                    <tr
                      key={row.id}
                      className={`transition-colors ${
                        row.isRuaErrada
                          ? "bg-rose-500/[0.05] hover:bg-rose-500/[0.09]"
                          : "bg-slate-500/[0.03] dark:bg-slate-500/[0.06] hover:bg-slate-500/[0.07] dark:hover:bg-slate-500/[0.11]"
                      }`}
                    >
                      <td className={`${ui.td} font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100 rounded-l-xl`}>{row.plu}</td>
                      <td className={`${ui.td} font-medium max-w-xs truncate`} title={row.descricao}>{row.descricao}</td>
                      <td className={`${ui.td} text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100`}>
                        {row.somaPlt.toLocaleString("pt-BR")}
                      </td>
                      <td className={ui.td}><span className={ui.chip}>{row.categoriaRuas}</span></td>
                      <td className={ui.td}><span className={ui.chip}>{row.categoriaItem}</span></td>
                      <td className={`${ui.td} text-center font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400`}>{row.altura}</td>
                      <td className={`${ui.td} text-center`}>
                        <span className="px-2 py-0.5 rounded-md font-mono text-xs bg-slate-500/10 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 font-medium">
                          {row.rua}
                        </span>
                      </td>
                      <td className={`${ui.td} text-center rounded-r-xl`}>
                        {row.isRuaErrada ? (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:text-rose-400">
                            <AlertTriangle className="h-3 w-3" />
                            Rua errada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-20 text-center text-sm text-slate-500 dark:text-slate-400">
                      {isLoading ? "Carregando alertas..." : "Nenhum registro encontrado para os filtros selecionados."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* RODAPÉ / PAGINAÇÃO */}
          <footer className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-3">
              <span>
                Exibindo{" "}
                <strong className="font-semibold text-slate-700 dark:text-slate-200">
                  {sortedData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, sortedData.length)}
                </strong>{" "}
                de <strong className="font-semibold text-slate-700 dark:text-slate-200">{sortedData.length}</strong> itens
              </span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-lg bg-slate-500/10 hover:bg-slate-500/15 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 border-0 cursor-pointer focus:outline-none"
              >
                {[25, 50, 100, 250].map((n) => (
                  <option key={n} value={n} className={optionClass}>{n} por página</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-slate-500/10 hover:bg-slate-500/15 px-2.5 font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Anterior
              </button>
              <span className="px-2 font-mono text-slate-700 dark:text-slate-300">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-slate-500/10 hover:bg-slate-500/15 px-2.5 font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                Próxima
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}
