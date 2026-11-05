import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toBlob, toPng } from "html-to-image";
import {
  RefreshCw,
  Maximize2,
  Minimize2,
  Camera,
  Copy,
  Download,
  Mail,
  MessageSquare,
  Send,
  X,
  Check,
  Building,
  Globe,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Pencil,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Sliders,
} from "lucide-react";
import { PAINEL_GERENCIAL_INITIAL_DATA } from "../data/painelGerencialMock";
import { PAINEL_REGIONAIS_INITIAL_DATA } from "../data/painelRegionaisMock";
import {
  PainelGerencialData,
  StatusCdGerencial,
  ApiResumoItem,
} from "../types";

interface PainelGerencialProps {
  theme?: "light" | "dark";
  showNotification?: (msg: string) => void;
  user?: any;
  onPageChange?: (page: string) => void;
  onThemeToggle?: () => void;
  onLogout?: () => void;
  variant?: "sp" | "regionais";
}

// Chaves de persistência local para UI
const TOOLBAR_KEY = "painel_gerencial_show_toolbar";

// ============================================================
// DADOS DE CONTINGÊNCIA / FALLBACK DA API http://10.210.1.242:8080/api/resumo
// ============================================================
const INITIAL_API_RESUMO_DATA: ApiResumoItem[] = [
  {
    cd: 409,
    dataOcupacao: "2026-10-14",
    status: "NORMAL",
    qtdCapacidade: 34529,
    qtdOcupada: 15748,
    qtdLivre: 8337,
    qtdBloqueada: 10444,
    percentualOcupacao: 65.4,
    subCategoriasAcimaLimite: [
      {
        categoria: "Mercearia",
        subCategoria: "Par",
        percentualOcupacao: 96.8,
        qtdLivre: 18,
      },
      {
        categoria: "Perecivel",
        subCategoria: "Congelado",
        percentualOcupacao: 83.8,
        qtdLivre: 268,
      },
    ],
  },
  {
    cd: 930,
    dataOcupacao: "2026-10-14",
    status: "NORMAL",
    qtdCapacidade: 12995,
    qtdOcupada: 4523,
    qtdLivre: 6953,
    qtdBloqueada: 1519,
    percentualOcupacao: 39.4,
    subCategoriasAcimaLimite: [],
  },
  {
    cd: 1942,
    dataOcupacao: "2026-10-14",
    status: "ATENCAO",
    qtdCapacidade: 11331,
    qtdOcupada: 6696,
    qtdLivre: 1420,
    qtdBloqueada: 3215,
    percentualOcupacao: 82.5,
    subCategoriasAcimaLimite: [
      {
        categoria: "Perecivel",
        subCategoria: "Congelado",
        percentualOcupacao: 94.5,
        qtdLivre: 225,
      },
    ],
  },
  {
    cd: 1953,
    dataOcupacao: "2026-10-14",
    status: "NORMAL",
    qtdCapacidade: 13580,
    qtdOcupada: 8020,
    qtdLivre: 5025,
    qtdBloqueada: 535,
    percentualOcupacao: 61.5,
    subCategoriasAcimaLimite: [
      {
        categoria: "Mercearia",
        subCategoria: "Mercearia Básica",
        percentualOcupacao: 85.8,
        qtdLivre: 255,
      },
    ],
  },
  {
    cd: 1965,
    dataOcupacao: "2026-10-14",
    status: "NORMAL",
    qtdCapacidade: 49732,
    qtdOcupada: 38259,
    qtdLivre: 10690,
    qtdBloqueada: 783,
    percentualOcupacao: 78.2,
    subCategoriasAcimaLimite: [
      {
        categoria: "Mercearia",
        subCategoria: "Mercearia Complementar",
        percentualOcupacao: 98.9,
        qtdLivre: 126,
      },
      {
        categoria: "Mercearia",
        subCategoria: "Mercearia Básica",
        percentualOcupacao: 98.8,
        qtdLivre: 33,
      },
      {
        categoria: "Mercearia",
        subCategoria: "Líquida",
        percentualOcupacao: 94.3,
        qtdLivre: 307,
      },
    ],
  },
  {
    cd: 1974,
    dataOcupacao: "2026-10-14",
    status: "NORMAL",
    qtdCapacidade: 5079,
    qtdOcupada: 3080,
    qtdLivre: 1713,
    qtdBloqueada: 286,
    percentualOcupacao: 64.3,
    subCategoriasAcimaLimite: [
      {
        categoria: "Mercearia",
        subCategoria: "Mercearia Básica",
        percentualOcupacao: 84.9,
        qtdLivre: 8,
      },
    ],
  },
  {
    cd: 1979,
    dataOcupacao: "2026-10-14",
    status: "NORMAL",
    qtdCapacidade: 3556,
    qtdOcupada: 1615,
    qtdLivre: 1718,
    qtdBloqueada: 223,
    percentualOcupacao: 48.5,
    subCategoriasAcimaLimite: [],
  },
  {
    cd: 1984,
    dataOcupacao: "2026-10-14",
    status: "NORMAL",
    qtdCapacidade: 3968,
    qtdOcupada: 1213,
    qtdLivre: 2571,
    qtdBloqueada: 184,
    percentualOcupacao: 32.1,
    subCategoriasAcimaLimite: [],
  },
  {
    cd: 7801,
    dataOcupacao: "2026-10-14",
    status: "NORMAL",
    qtdCapacidade: 10284,
    qtdOcupada: 5578,
    qtdLivre: 3386,
    qtdBloqueada: 1320,
    percentualOcupacao: 62.2,
    subCategoriasAcimaLimite: [],
  },
];

// Metadados de identificação geográfica dos CDs
const CD_INFO_MAP: Record<number, { nome: string; regiao: string }> = {
  409: { nome: "CD 409", regiao: "Brasília / DF" },
  930: { nome: "CD 930", regiao: "Cabo / PE" },
  1942: { nome: "CD 1942", regiao: "Gravataí / RS" },
  1953: { nome: "CD 1953", regiao: "Caxias / RJ" },
  1965: { nome: "CD 1965", regiao: "Osasco / SP" },
  1974: { nome: "CD 1974", regiao: "Fortaleza / CE" },
  1979: { nome: "CD 1979", regiao: "Jaboatão / PE" },
  1984: { nome: "CD 1984", regiao: "Curitiba / PR" },
  7801: { nome: "CD 7801", regiao: "São Paulo / SP" },
};

// CDs Matriz / São Paulo na ordem solicitada: 1965, 1942, 930, 7801
const SP_CDS = [1965, 1942, 930, 7801];

// CDs Regionais (fora de São Paulo) na ordem solicitada: 409, 1974, 1979, 1984, 1953
const REGIONAIS_CDS = [409, 1974, 1979, 1984, 1953];

// CDs explicitamente excluídos (8034 nunca deve ser mostrado)
const EXCLUDED_CDS = [8034];

// Helper para converter data YYYY-MM-DD para DD/MM/YYYY
function formatDateBR(dateStr?: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Helper data/hora atual
function getFormattedDateTime(apiDateStr?: string) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dStr = apiDateStr ? formatDateBR(apiDateStr) : `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  const tStr = `${pad(now.getHours())}h${pad(now.getMinutes())}`;
  return { date: dStr, time: tStr, full: `${dStr} · ${tStr}` };
}

// Função de transformação dos dados brutos da API para o formato do Painel
function transformApiToPainelData(
  apiItems: ApiResumoItem[],
  isRegionais: boolean
): PainelGerencialData {
  const targetCdsOrder = isRegionais ? REGIONAIS_CDS : SP_CDS;

  // Filtra itens excluídos (como 8034)
  const validApiItems = (apiItems || []).filter((item) => !EXCLUDED_CDS.includes(Number(item.cd)));

  // Garante que cada CD da ordem esperada esteja presente (com dados da API viva ou da contingência oficial da API)
  const effectiveItems = targetCdsOrder
    .map((targetCd) => {
      const liveFound = validApiItems.find((item) => Number(item.cd) === Number(targetCd));
      if (liveFound) return liveFound;
      const fallbackFound = INITIAL_API_RESUMO_DATA.find((item) => Number(item.cd) === Number(targetCd));
      return fallbackFound!;
    })
    .filter(Boolean);

  const baseSource = isRegionais ? PAINEL_REGIONAIS_INITIAL_DATA.cds : PAINEL_GERENCIAL_INITIAL_DATA.cds;
  const firstItemDate = effectiveItems[0]?.dataOcupacao;
  const dateFormatted = firstItemDate ? formatDateBR(firstItemDate) : "30/09/2026";

  const mappedCds: StatusCdGerencial[] = effectiveItems.map((item) => {
    const cdMeta = CD_INFO_MAP[item.cd] || { nome: `CD ${item.cd}`, regiao: "Operação CD" };
    const rawStatus = (item.status || "").toUpperCase().trim();

    // Valores numéricos do primeiro quadrante (Ocupação CD)
    const capTotal = Number(item.qtdCapacidade) || 0;
    const ocupadaTotal = Number(item.qtdOcupada) || 0;
    const livreTotal = Number(item.qtdLivre) || 0;
    const bloqueadaTotal = Number(item.qtdBloqueada) || 0;

    let pctVal = 0;
    if (item.percentualOcupacao !== undefined && item.percentualOcupacao !== null) {
      pctVal = typeof item.percentualOcupacao === "string"
        ? parseFloat(String(item.percentualOcupacao).replace(",", "."))
        : Number(item.percentualOcupacao);
    }
    if (isNaN(pctVal) || pctVal <= 0) {
      pctVal = capTotal > 0 ? (ocupadaTotal / capTotal) * 100 : 0;
    }

    const statusGeral: "NORMAL" | "ATENÇÃO" | "CRÍTICO" = rawStatus.includes("CRIT")
      ? "CRÍTICO"
      : rawStatus.includes("ATEN")
      ? "ATENÇÃO"
      : rawStatus.includes("NORM")
      ? "NORMAL"
      : pctVal >= 90
      ? "CRÍTICO"
      : pctVal >= 75
      ? "ATENÇÃO"
      : "NORMAL";

    const rawSubCats = (item.subCategoriasAcimaLimite || (item as any).subcategoriasAcimaLimite || (item as any).subCategorias || []);
    const alertaCategorias = rawSubCats.map((sub: any) => {
      const catName = sub.categoria || "";
      const subName = sub.subCategoria || sub.subcategoria || sub.nome || "";
      const fullName = catName && subName ? `${catName} - ${subName}` : subName || catName || "Subcategoria";
      const rawSubPct = sub.percentualOcupacao ?? sub.percentual ?? sub.percent ?? 0;
      const subPct = typeof rawSubPct === "string"
        ? parseFloat(String(rawSubPct).replace(",", "."))
        : Number(rawSubPct) || 0;
      const livres = sub.qtdLivre !== undefined
        ? Number(sub.qtdLivre)
        : sub.livre !== undefined
        ? Number(sub.livre)
        : sub.livres !== undefined
        ? Number(sub.livres)
        : undefined;
      return {
        nome: fullName,
        percentual: subPct,
        livres,
      };
    });

    // Localiza base operacional pré-existente para complementar Agendas e Backlog caso a API não envie
    const baseCd = baseSource.find((b) => b.cd === item.cd);

    return {
      cd: item.cd,
      nome: cdMeta.nome,
      regiao: cdMeta.regiao,
      statusGeral,
      ocupacao: {
        percentual: pctVal,
        total: capTotal,
        ocupada: ocupadaTotal,
        livre: livreTotal,
        bloqueada: bloqueadaTotal,
        alertaCategorias,
      },
      agendas: item.agendas || baseCd?.agendas || {
        percentual: 88,
        previstas: 120,
        capacidade: 140,
        alertaCategorias: [],
      },
      backlogRecebimento: item.backlogRecebimento || baseCd?.backlogRecebimento || {
        senhasAtraso: 45,
        diffDiaAnterior: -5,
        topFornecedores: [],
      },
      backlogFaturamento: item.backlogFaturamento || baseCd?.backlogFaturamento || {
        percentual: 70,
        capacidade: 1200,
        backlogPrevisto14h: 840,
      },
    };
  });

  return {
    dataReferencia: `${dateFormatted} · 07h00`,
    distribuicao: isRegionais ? "Supply Chain / Regionais Fora de SP" : "Supply Chain / Operações CD",
    cds: mappedCds,
  };
}

// ============================================================
// COMPONENTE AUXILIAR: CAMPO DE INPUT PARA O EDITOR MANUAL
// ============================================================
// Formatação de percentual com 2 casas decimais no padrão brasileiro (ex: 80,55)
export const formatPercent = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === "" || isNaN(Number(val))) return "0,00";
  return Number(val).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

interface FieldProps {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: "text" | "number";
  step?: string;
  min?: number;
  max?: number;
  suffix?: string;
  className?: string;
  isDark?: boolean;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  step,
  min,
  max,
  suffix,
  className = "",
  isDark = false,
}: FieldProps) {
  return (
    <label className={`flex flex-col gap-0.5 ${className}`}>
      <span
        className={`text-[10px] font-bold uppercase tracking-wide ${
          isDark ? "text-slate-400" : "text-slate-500"
        }`}
      >
        {label}
      </span>
      <div className="flex items-center gap-1">
        <input
          type={type}
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-2 py-1 text-xs font-mono border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
            isDark
              ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-400"
              : "bg-white border-slate-300 text-slate-900 focus:border-blue-500"
          }`}
        />
        {suffix && (
          <span
            className={`text-[10px] font-bold ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function PainelGerencial({
  theme = "light",
  showNotification,
  variant = "sp",
}: PainelGerencialProps) {
  // Controle interno de visualização: Matriz (SP) ou Regionais (Fora de SP)
  const [activeView, setActiveView] = useState<"sp" | "regionais">(() => {
    try {
      const saved = localStorage.getItem("painel_gerencial_active_view");
      if (saved === "sp" || saved === "regionais") return saved;
    } catch {}
    return variant || "sp";
  });

  useEffect(() => {
    if (variant) {
      setActiveView(variant);
    }
  }, [variant]);

  const handleViewChange = (newView: "sp" | "regionais") => {
    setActiveView(newView);
    try {
      localStorage.setItem("painel_gerencial_active_view", newView);
    } catch {}
    if (showNotification) {
      showNotification(
        newView === "sp"
          ? "🏢 Exibindo Centrais Matriz (São Paulo - 4 CDs)"
          : "🌐 Exibindo Centrais Regionais Fora de SP (5 CDs)"
      );
    }
  };

  const isRegionais = activeView === "regionais";
  const isDark = theme === "dark";

  // --- CONTROLE DE VISIBILIDADE DA TOOLBAR ---
  const [showToolbar, setShowToolbar] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(TOOLBAR_KEY);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const toggleToolbar = () => {
    setShowToolbar((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(TOOLBAR_KEY, JSON.stringify(next));
      } catch {}
      if (showNotification) {
        showNotification(
          next
            ? "🔽 Barra superior exibida"
            : "🔼 Barra superior minimizada (mais espaço para a tabela)"
        );
      }
      return next;
    });
  };

  // --- DADOS DA API E OVERRIDES ---
  const [apiRawItems, setApiRawItems] = useState<ApiResumoItem[]>(INITIAL_API_RESUMO_DATA);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [apiStatusSource, setApiStatusSource] = useState<"LIVE" | "CACHE">("LIVE");

  // Estado do Modal de Edição Manual
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editorTab, setEditorTab] = useState<number>(0);

  // Estado do menu de seleção rápida de status no cabeçalho
  const [openStatusMenuCd, setOpenStatusMenuCd] = useState<number | null>(null);

  // Overrides manuais persistidos no navegador
  const [customOverrides, setCustomOverrides] = useState<Record<number, StatusCdGerencial>>(() => {
    try {
      const saved = localStorage.getItem("painel_gerencial_custom_overrides_v2");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const [globalOverrides, setGlobalOverrides] = useState<{ distribuicao?: string; dataReferencia?: string }>(() => {
    try {
      const saved = localStorage.getItem("painel_gerencial_global_overrides_v2");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  // Dados consolidados do Painel com merge dos dados manuais
  const data = useMemo(() => {
    const base = transformApiToPainelData(apiRawItems, isRegionais);
    const mergedCds = base.cds.map((cd) => {
      const override = customOverrides[cd.cd];
      if (override) {
        // 🔥 CRÍTICO: O Primeiro Quadrante de Informações (Ocupação CD: total, ocupada, livre, bloqueada, percentual, subcategorias)
        // é sincronizado pela API externa (http://10.210.1.242:8080/api/resumo).
        // As edições manuais são aplicadas aos quadrantes operacionais e ao Status Geral (conforme solicitado pelo usuário).
        return {
          ...cd,
          ...override,
          ocupacao: cd.ocupacao, // 1º Quadrante 100% fiel à API externa
          statusGeral: override.statusGeral || cd.statusGeral, // Permite alterar o status manualmente
        };
      }
      return cd;
    });
    return {
      ...base,
      ...(globalOverrides.distribuicao ? { distribuicao: globalOverrides.distribuicao } : {}),
      ...(globalOverrides.dataReferencia ? { dataReferencia: globalOverrides.dataReferencia } : {}),
      cds: mergedCds,
    };
  }, [apiRawItems, isRegionais, customOverrides, globalOverrides]);

  const updateCd = (cdIndex: number, updater: (cd: StatusCdGerencial) => StatusCdGerencial) => {
    const targetCd = data.cds[cdIndex];
    if (!targetCd) return;
    const updated = updater({ ...targetCd });
    setCustomOverrides((prev) => {
      const next = { ...prev, [targetCd.cd]: updated };
      try {
        localStorage.setItem("painel_gerencial_custom_overrides_v2", JSON.stringify(next));
      } catch (err) {
        console.warn("Erro ao salvar override:", err);
      }
      return next;
    });
  };

  const handleUpdateStatusGeral = (cdIndex: number, newStatus: "NORMAL" | "ATENÇÃO" | "CRÍTICO") => {
    updateCd(cdIndex, (cd) => ({
      ...cd,
      statusGeral: newStatus,
    }));
    if (showNotification) {
      const cdName = data.cds[cdIndex]?.nome || "CD";
      showNotification(`✅ Status do ${cdName} alterado para ${newStatus}`);
    }
  };

  const updateGlobalData = (updater: (prev: { distribuicao?: string; dataReferencia?: string }) => { distribuicao?: string; dataReferencia?: string }) => {
    setGlobalOverrides((prev) => {
      const next = updater({
        distribuicao: prev.distribuicao || data.distribuicao,
        dataReferencia: prev.dataReferencia || data.dataReferencia,
      });
      try {
        localStorage.setItem("painel_gerencial_global_overrides_v2", JSON.stringify(next));
      } catch (err) {
        console.warn("Erro ao salvar override global:", err);
      }
      return next;
    });
  };

  const handleResetData = () => {
    setCustomOverrides({});
    setGlobalOverrides({});
    try {
      localStorage.removeItem("painel_gerencial_custom_overrides_v2");
      localStorage.removeItem("painel_gerencial_global_overrides_v2");
    } catch {}
    if (showNotification) showNotification("🔄 Dados manuais resetados para os valores padrão da API/mock!");
  };

  // Data/hora atualizada
  const [currentDate, setCurrentDate] = useState<string>(() => {
    const firstDate = INITIAL_API_RESUMO_DATA[0]?.dataOcupacao;
    return getFormattedDateTime(firstDate).date;
  });
  const [currentTime, setCurrentTime] = useState<string>(() => getFormattedDateTime().time);
  const [lastUpdated, setLastUpdated] = useState<string>(() => getFormattedDateTime().full);

  // Função para buscar dados da API http://10.210.1.242:8080/api/resumo
  const fetchResumoData = useCallback(async (notifyOnSuccess: boolean = false) => {
    setIsRefreshing(true);
    let success = false;
    let source: "LIVE" | "CACHE" = "CACHE";

    // 1. Tenta via proxy backend /api/resumo (resolve CORS e conectividade segura)
    try {
      const response = await fetch("/api/resumo", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (response.ok) {
        const json = await response.json();
        if (Array.isArray(json) && json.length > 0) {
          setApiRawItems(json);
          const xSource = response.headers.get("X-Source");
          source = xSource === "LIVE_API" ? "LIVE" : "CACHE";
          setApiStatusSource(source);
          success = true;

          const firstDate = json[0]?.dataOcupacao;
          const { date, time, full } = getFormattedDateTime(firstDate);
          setCurrentDate(date);
          setCurrentTime(time);
          setLastUpdated(full);
        }
      }
    } catch (err) {
      console.warn("Proxy /api/resumo falhou ou timeout:", err);
    }

    // 2. Fallback direto no backend gestao-ppcp (porta 8080), caso o proxy /api/resumo falhe
    if (!success && typeof window !== "undefined") {
      try {
        const directRes = await fetch("http://10.210.1.242:8080/api/resumo", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (directRes.ok) {
          const json = await directRes.json();
          if (Array.isArray(json) && json.length > 0) {
            setApiRawItems(json);
            setApiStatusSource("LIVE");
            success = true;

            const firstDate = json[0]?.dataOcupacao;
            const { date, time, full } = getFormattedDateTime(firstDate);
            setCurrentDate(date);
            setCurrentTime(time);
            setLastUpdated(full);
          }
        }
      } catch (directErr) {
        // Intranet direta indisponível no ambiente de rede atual
      }
    }

    setIsRefreshing(false);

    if (success) {
      if (notifyOnSuccess && showNotification) {
        showNotification("✅ 1º Quadrante (Ocupação CD) sincronizado via API externa http://10.210.1.242:8080/api/resumo!");
      }
    } else {
      const { date, time, full } = getFormattedDateTime("2026-10-14");
      setCurrentDate(date);
      setCurrentTime(time);
      setLastUpdated(full);
      if (notifyOnSuccess && showNotification) {
        showNotification("ℹ️ 1º Quadrante atualizado com a base de contingência da API 10.210.1.242:8080");
      }
    }
  }, [showNotification]);

  // Carrega na montagem e ao trocar de variante
  useEffect(() => {
    fetchResumoData(false);
  }, [fetchResumoData, variant]);

  // Estados de Captura / Compartilhamento
  const captureRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [copySummaryStatus, setCopySummaryStatus] = useState<string | null>(null);
  const [quickCopied, setQuickCopied] = useState(false);

  // Resumo Operacional em texto
  const generateOperationalSummary = () => {
    const cdLines = data.cds
      .map((cd) => {
        const statusEmoji =
          cd.statusGeral === "CRÍTICO" ? "🔴" : cd.statusGeral === "ATENÇÃO" ? "🟡" : "🟢";
        return `🏢 *${cd.nome} (${cd.regiao})* — ${statusEmoji} ${cd.statusGeral}
• Ocupação: ${formatPercent(cd.ocupacao.percentual)}% (${cd.ocupacao.ocupada.toLocaleString(
          "pt-BR"
        )}/${cd.ocupacao.total.toLocaleString("pt-BR")} pos.)
• Agendas: ${formatPercent(cd.agendas.percentual)}% (${cd.agendas.previstas} prev. / ${
          cd.agendas.capacidade
        } cap.)
• Backlog Recebimento: ${cd.backlogRecebimento.senhasAtraso} senhas (${
          cd.backlogRecebimento.diffDiaAnterior > 0
            ? `+${cd.backlogRecebimento.diffDiaAnterior}`
            : cd.backlogRecebimento.diffDiaAnterior
        } vs. ontem)
• Backlog Faturamento: ${formatPercent(cd.backlogFaturamento.percentual)}% (${cd.backlogFaturamento.backlogPrevisto14h.toLocaleString(
          "pt-BR"
        )} / ${cd.backlogFaturamento.capacidade.toLocaleString("pt-BR")})`;
      })
      .join("\n\n");

    return isRegionais
      ? `📊 *STATUS DIÁRIO DA OPERAÇÃO — REGIONAIS FORA DE SP (CDs 409, 1974, 1979, 1984, 1953)*
🕒 ${currentDate} às ${currentTime} | Supply Chain / Regionais Fora de SP
Fonte: API Corporativa http://10.210.1.242:8080/api/resumo

${cdLines}

📎 _Acompanha imagem do Painel Gerencial para colar no e-mail._`
      : `📊 *STATUS DIÁRIO DA OPERAÇÃO — SÃO PAULO (CDs 1965, 1942, 930, 7801)*
🕒 ${currentDate} às ${currentTime} | ${data.distribuicao}
Fonte: API Corporativa http://10.210.1.242:8080/api/resumo

${cdLines}

📎 _Acompanha imagem do Painel Gerencial para colar no e-mail._`;
  };

  // Motor de Captura
  const generateCapture = async (): Promise<{ blob: Blob | null; dataUrl: string | null }> => {
    const target = captureRef.current;
    if (!target) return { blob: null, dataUrl: null };

    const scrollWidth = target.scrollWidth || 0;
    const scrollHeight = target.scrollHeight || 0;
    const rect = target.getBoundingClientRect();

    const width = Math.max(scrollWidth, Math.ceil(rect.width), 1200);
    const height = Math.max(scrollHeight, Math.ceil(rect.height), 600);

    const options = {
      quality: 1,
      pixelRatio: 2,
      backgroundColor: isDark ? "#0f172a" : "#ffffff",
      width,
      height,
      style: { transform: "none", margin: "0" },
      filter: (node: any) => {
        if (node?.classList?.contains && node.classList.contains("hide-on-capture")) {
          return false;
        }
        return true;
      },
    };

    const [blob, dataUrl] = await Promise.all([toBlob(target, options), toPng(target, options)]);
    return { blob, dataUrl };
  };

  const handleQuickCopyScreenshot = async () => {
    setIsCapturing(true);
    try {
      const { blob, dataUrl } = await generateCapture();
      if (!blob) throw new Error("Falha ao gerar captura de tela");

      let copied = false;
      if (navigator.clipboard && navigator.clipboard.write) {
        try {
          if (window.focus) window.focus();
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          copied = true;
        } catch (clipErr) {
          console.warn("Clipboard write restrito:", clipErr);
        }
      }

      if (copied) {
        setQuickCopied(true);
        setTimeout(() => setQuickCopied(false), 3500);
        if (showNotification) {
          showNotification("📸 Imagem copiada! Vá ao Outlook/Gmail e pressione Ctrl+V.");
        }
      } else {
        const a = document.createElement("a");
        a.href = dataUrl || URL.createObjectURL(blob);
        a.download = `Status_Operacao_CDs_${currentDate.replace(/\//g, "-")}.png`;
        a.click();
        setShowCaptureModal(true);
        setCapturedBlob(blob);
        setCapturedImageUrl(dataUrl);
        if (showNotification) showNotification("📸 Imagem baixada em alta resolução!");
      }
    } catch (err) {
      console.error("Erro ao capturar tela:", err);
      if (showNotification) showNotification("❌ Erro ao capturar imagem do painel.");
    } finally {
      setIsCapturing(false);
    }
  };

  const copyImageToClipboard = async () => {
    if (!capturedBlob) return;
    try {
      if (navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": capturedBlob })]);
        setCopyStatus("✅ Imagem copiada! Cole com Ctrl+V.");
        if (showNotification) showNotification("Imagem copiada para a área de transferência!");
      } else {
        downloadImage();
      }
    } catch {
      downloadImage();
    }
    setTimeout(() => setCopyStatus(null), 4000);
  };

  const downloadImage = () => {
    if (!capturedImageUrl && !capturedBlob) return;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fileName = `Status_Operacao_CDs_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
      now.getDate()
    )}_${pad(now.getHours())}${pad(now.getMinutes())}.png`;

    const a = document.createElement("a");
    a.href = capturedImageUrl || URL.createObjectURL(capturedBlob!);
    a.download = fileName;
    a.click();
    if (showNotification) showNotification("Arquivo PNG baixado!");
  };

  const shareToWhatsApp = async () => {
    if (capturedBlob && navigator.clipboard && navigator.clipboard.write) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": capturedBlob })]);
      } catch (e) {
        console.warn(e);
      }
    }
    const summary = generateOperationalSummary();
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(summary)}`, "_blank");
    if (showNotification) showNotification("WhatsApp aberto! Cole com Ctrl+V.");
  };

  const shareToTeams = async () => {
    if (capturedBlob && navigator.clipboard && navigator.clipboard.write) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": capturedBlob })]);
      } catch (e) {
        console.warn(e);
      }
    }
    window.open("https://teams.microsoft.com", "_blank");
    if (showNotification) showNotification("Teams aberto! Cole com Ctrl+V.");
  };

  const shareByEmail = () => {
    const subject = encodeURIComponent(
      isRegionais
        ? `Status Diário da Operação Regionais Fora de SP — ${lastUpdated}`
        : `Status Diário da Operação CDs — ${lastUpdated}`
    );
    const body = encodeURIComponent(generateOperationalSummary());
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const copySummaryText = async () => {
    try {
      await navigator.clipboard.writeText(generateOperationalSummary());
      setCopySummaryStatus("✅ Texto copiado!");
      if (showNotification) showNotification("Resumo copiado!");
    } catch {
      setCopySummaryStatus("❌ Falha ao copiar");
    }
    setTimeout(() => setCopySummaryStatus(null), 3000);
  };

  const handleRefresh = () => {
    fetchResumoData(true);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className={`painel-wrapper ${isDark ? "dark" : "light"}`}>
      <style>{`
        :root, .painel-wrapper.light {
          --ink: #1c2430; --ink-soft: #5b6675; --line: #d8dde3;
          --panel: #ffffff; --bg: #eef1f4;
          --toolbar-bg: #ffffff; --btn-bg: #ffffff; --btn-hover: #f6f7f9;
          --cd-head-bg: #ffffff; --cd-corner-bg: #f6f7f9; --row-label-bg: #f6f7f9;
          --cell-bg: #ffffff; --cell-hover: #fafbfc; --kpi-bg: #f6f7f9;
          --bar-track: #e5e8ec; --alert-neutral-bg: #f6f7f9;
          --dashed-line: rgba(0, 0, 0, 0.08);
          --ok: #1f8a5c; --ok-bg: #e6f4ec;
          --warn: #b9770e; --warn-bg: #fbf0dd;
          --bad: #b3302a; --bad-bg: #faeae9;
          --navy: #1c2b3f;
        }
        .painel-wrapper.dark {
          --ink: #f1f5f9; --ink-soft: #94a3b8; --line: #26334a;
          --panel: #0f172a; --bg: #070b14;
          --toolbar-bg: #0c1424; --btn-bg: #162035; --btn-hover: #1f2d4a;
          --cd-head-bg: #111a2f; --cd-corner-bg: #0d1527; --row-label-bg: #0d1527;
          --cell-bg: #0f172a; --cell-hover: #15223c; --kpi-bg: #141f36;
          --bar-track: #1e2a3e; --alert-neutral-bg: #141f36;
          --dashed-line: rgba(255, 255, 255, 0.1);
          --ok: #34d399; --ok-bg: rgba(16, 185, 129, 0.18);
          --warn: #fbbf24; --warn-bg: rgba(245, 158, 11, 0.18);
          --bad: #f87171; --bad-bg: rgba(239, 68, 68, 0.18);
          --navy: #0b1326;
        }
        .painel-wrapper {
          width: 100%; height: 100%; display: flex; flex-direction: column;
          background: var(--bg); overflow: hidden;
          font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: var(--ink); -webkit-font-smoothing: antialiased;
          transition: background-color 0.2s ease, color 0.2s ease;
        }
        .exec-toolbar {
          height: 38px; background: var(--toolbar-bg); border-bottom: 1px solid var(--line);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 16px; flex-shrink: 0; z-index: 10;
          color: var(--ink);
          transition: background-color 0.2s ease, border-color 0.2s ease;
        }
        .exec-toolbar .left-info {
          display: flex; align-items: center; gap: 8px;
          font-size: 11px; font-weight: 600; color: var(--ink);
        }
        .exec-toolbar .pill-indicator {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 2px 7px; border-radius: 9999px;
          background: var(--ok-bg); color: var(--ok);
          font-size: 10px; font-weight: 700; letter-spacing: 0.2px;
        }
        .exec-toolbar .actions-group {
          display: flex; align-items: center; gap: 6px;
        }
        .exec-btn {
          display: inline-flex; align-items: center; gap: 5px;
          height: 26px; padding: 0 9px; border-radius: 4px;
          font-size: 11px; font-weight: 600;
          border: 1px solid var(--line); background: var(--btn-bg);
          color: var(--ink); cursor: pointer;
          transition: all 0.15s ease; white-space: nowrap;
        }
        .exec-btn:hover { background: var(--btn-hover); border-color: #3b82f6; }
        .exec-btn.primary {
          background: #1d4ed8; border-color: #1d4ed8; color: #ffffff;
        }
        .exec-btn.primary:hover { background: #1e40af; }
        .exec-btn.edit {
          background: #0284c7;
          border-color: #0284c7;
          color: #ffffff;
          font-weight: 700;
        }
        .painel-wrapper.dark .exec-btn.edit {
          background: #0284c7;
          border-color: #0284c7;
          color: #ffffff;
        }
        .exec-btn.edit:hover {
          background: #0369a1;
          border-color: #0369a1;
          color: #ffffff;
        }

        /* Seletor SP vs Regionais ao lado de Atualizar */
        .view-selector-container {
          display: inline-flex;
          align-items: center;
          height: 26px;
          background: var(--btn-bg);
          border: 1px solid var(--line);
          border-radius: 4px;
          padding: 2px;
          gap: 2px;
        }
        .view-selector-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          height: 20px;
          padding: 0 8px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 600;
          border: none;
          background: transparent;
          color: var(--ink-soft);
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .view-selector-btn:hover {
          color: var(--ink);
          background: var(--btn-hover);
        }
        .view-selector-btn.active {
          background: #1d4ed8;
          color: #ffffff;
          font-weight: 700;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
        }

        /* Botão flutuante que aparece quando a toolbar está oculta */
        .toolbar-restore-btn {
          position: fixed;
          top: 8px;
          right: 12px;
          z-index: 50;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          height: 28px;
          padding: 0 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          background: #1d4ed8;
          border: 1px solid #1d4ed8;
          color: #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(29, 78, 216, 0.25);
          transition: all 0.15s ease;
        }
        .toolbar-restore-btn:hover {
          background: #1e40af;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(29, 78, 216, 0.35);
        }

        .painel-content-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: clamp(3px, 0.6vh, 8px) clamp(6px, 0.8vw, 14px);
          min-height: 0;
          width: 100%;
          overflow: hidden;
          background: var(--bg);
          box-sizing: border-box;
        }
        .page {
          width: 100%;
          max-width: 1660px;
          height: 100%;
          max-height: 100%;
          margin: 0 auto;
          background: var(--panel);
          border: 1px solid var(--line);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          flex-shrink: 0;
          min-height: 0;
          overflow: hidden;
          transition: background-color 0.2s ease, border-color 0.2s ease;
        }
        .masthead {
          background: var(--navy);
          color: #fff;
          padding: clamp(5px, 0.7vh, 10px) clamp(12px, 1.2vw, 20px);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-shrink: 0;
          gap: 12px;
        }
        .masthead h1 {
          margin: 0;
          font-size: clamp(13px, 1.05vw, 17px);
          font-weight: 600;
          letter-spacing: .2px;
          line-height: 1.2;
          white-space: nowrap;
        }
        .masthead .sub {
          font-size: clamp(8.5px, 0.68vw, 11px);
          color: #aab6c6;
          margin-top: 1px;
          white-space: nowrap;
        }
        .masthead .meta {
          text-align: right;
          font-size: clamp(8.5px, 0.68vw, 11px);
          color: #cfd8e3;
          line-height: 1.35;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .masthead .meta strong {
          color: #fff;
          font-size: clamp(9.5px, 0.75vw, 12px);
        }

        .matrix {
          display: grid;
          grid-template-columns: minmax(110px, 135px) repeat(var(--cd-count, 4), minmax(0, 1fr));
          grid-template-rows: auto repeat(var(--row-count, 4), minmax(min-content, 1fr));
          flex: 1;
          min-height: 0;
          width: 100%;
        }

        .cd-head {
          padding: clamp(4px, 0.5vh, 7px) clamp(6px, 0.7vw, 10px);
          border-bottom: 2px solid var(--navy);
          border-right: 1px solid var(--line);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--cd-head-bg);
          color: var(--ink);
          min-width: 0;
          flex-shrink: 0;
        }
        .cd-head.corner {
          border-right: 1px solid var(--line);
          background: var(--cd-corner-bg);
        }
        .cd-head h3 {
          margin: 0;
          font-size: clamp(11px, 0.85vw, 13px);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .3px;
          white-space: nowrap;
          color: var(--ink);
        }
        .matrix > .cd-head:last-child {
          border-right: none;
        }

        .status-pill {
          font-size: clamp(7.5px, 0.6vw, 9px);
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 3px;
          text-transform: uppercase;
          letter-spacing: .3px;
          white-space: nowrap;
          flex-shrink: 0;
          border: none;
          font-family: inherit;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 2.5px;
          user-select: none;
          transition: filter 0.15s ease, transform 0.1s ease;
        }
        .status-pill:hover { filter: brightness(0.92); }
        .pill-ok { background: var(--ok-bg); color: var(--ok); }
        .pill-warn { background: var(--warn-bg); color: var(--warn); }
        .pill-bad { background: var(--bad-bg); color: var(--bad); }

        .row-label {
          padding: clamp(5px, 0.7vh, 8px) clamp(6px, 0.65vw, 10px);
          border-right: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
          background: var(--row-label-bg);
          display: flex;
          align-items: flex-start;
          min-width: 0;
          color: var(--ink);
        }
        .row-label h2 {
          margin: 0;
          font-size: clamp(9px, 0.72vw, 11px);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .2px;
          line-height: 1.3;
          color: var(--ink);
        }

        .cell {
          padding: clamp(4px, 0.55vh, 7px) clamp(6px, 0.7vw, 10px);
          border-right: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
          background: var(--cell-bg);
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          gap: clamp(1.5px, 0.25vh, 3px);
          min-width: 0;
          box-sizing: border-box;
          transition: background-color 0.15s ease;
        }
        .cell:hover { background-color: var(--cell-hover); }
        .matrix > .cell:nth-child(5n) { border-right: none; }

        .gauge-top {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 1px;
          gap: 4px;
          min-width: 0;
          flex-shrink: 0;
        }
        .gauge-top .pct {
          font-size: clamp(14px, 1.15vw, 18px);
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          line-height: 1;
          white-space: nowrap;
        }
        .gauge-top .pct.ok { color: var(--ok); }
        .gauge-top .pct.warn { color: var(--warn); }
        .gauge-top .pct.bad { color: var(--bad); }
        .gauge-top .label {
          font-size: clamp(7.5px, 0.58vw, 9px);
          color: var(--ink-soft);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: right;
          flex-shrink: 1;
          line-height: 1;
        }

        .bar-track {
          height: clamp(5px, 0.55vh, 7px);
          background: var(--bar-track);
          border: 1px solid var(--line);
          position: relative;
          overflow: visible;
          flex-shrink: 0;
          margin-bottom: 2px;
        }
        .bar-fill {
          height: 100%;
          transition: width 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .bar-fill.ok { background: var(--ok); }
        .bar-fill.warn { background: var(--warn); }
        .bar-fill.bad { background: var(--bad); }
        .bar-target {
          position: absolute;
          top: -2px;
          bottom: -2px;
          width: 2px;
          background: var(--navy);
          z-index: 2;
        }
        .painel-wrapper.dark .bar-target {
          background: #f1f5f9;
        }

        .kpi-mini-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 3px;
          margin: 1px 0 2px;
          flex-shrink: 0;
          width: 100%;
          box-sizing: border-box;
        }
        .kpi-mini-row.four {
          grid-template-columns: repeat(4, 1fr);
          gap: 2px;
        }
        .kpi-mini {
          background: var(--kpi-bg);
          border: 1px solid var(--line);
          padding: 2px 3px;
          min-width: 0;
          border-radius: 2px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .kpi-mini .label {
          font-size: clamp(6.5px, 0.48vw, 7.5px);
          color: var(--ink-soft);
          text-transform: uppercase;
          letter-spacing: .1px;
          margin-bottom: 0.5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 2;
        }
        .kpi-mini .value {
          font-size: clamp(9px, 0.75vw, 11.5px);
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
          line-height: 1.5;
          color: var(--ink);
        }
        .kpi-mini-row.four .kpi-mini {
          padding: 1.5px 2px;
          text-align: left;
        }
        .kpi-mini-row.four .label {
          font-size: clamp(6px, 0.45vw, 7px);
          letter-spacing: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: clip;
        }
        .kpi-mini-row.four .value {
          font-size: clamp(8.5px, 0.68vw, 10.5px);
        }

        .big-number {
          font-size: clamp(17px, 1.35vw, 23px);
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          line-height: 1;
          margin-bottom: 1px;
          flex-shrink: 0;
        }
        .big-number.bad { color: var(--bad); }
        .big-caption {
          font-size: clamp(7.5px, 0.56vw, 9px);
          color: var(--ink-soft);
          margin-bottom: 2px;
          line-height: 1.15;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex-shrink: 0;
        }

        .alert-box {
          border: 1px solid var(--bad);
          background: var(--bad-bg);
          border-radius: 2px;
          margin-bottom: auto;
          min-width: 0;
          flex-shrink: 0;
          box-sizing: border-box;
        }
        .alert-box.warn-box {
          border-color: var(--warn);
          background: var(--warn-bg);
        }
        .alert-box.neutral {
          border-color: var(--line);
          background: var(--kpi-bg);
        }
        .alert-title {
          font-size: clamp(7px, 0.52vw, 8px);
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .25px;
          color: var(--bad);
          padding: 2.5px 5px 2px;
          line-height: 1.15;
          word-break: normal;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .alert-box.warn-box .alert-title { color: var(--warn); }
        .alert-box.neutral .alert-title { color: var(--ink-soft); }
        .alert-list {
          list-style: none;
          margin: 0;
          padding: 1px 5px 3px;
        }
        .alert-list li {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: clamp(7.5px, 0.58vw, 9px);
          padding: 1.5px 0;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
          gap: 4px;
          min-width: 0;
          line-height: 1.2;
        }
        .painel-wrapper.dark .alert-list li {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .alert-list li:first-child {
          border-top: none;
        }
        .alert-list .name {
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
          flex: 1;
          color: var(--ink);
        }
        .alert-list .val {
          font-variant-numeric: tabular-nums;
          font-weight: 700;
          white-space: nowrap;
          flex-shrink: 0;
          text-align: right;
          color: var(--ink);
        }

        .alert-list li:nth-child(n+4) { display: none; }
        .alert-box.more::after {
          content: attr(data-more);
          display: block;
          font-size: clamp(7px, 0.5vw, 8px);
          color: var(--ink-soft);
          padding: 1px 5px 3px;
          text-align: center;
          font-weight: 700;
          letter-spacing: .2px;
        }

        .footer {
          padding: clamp(3px, 0.4vh, 5px) clamp(10px, 1vw, 16px);
          font-size: clamp(7.5px, 0.55vw, 9px);
          color: var(--ink-soft);
          border-top: 1px solid var(--line);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-shrink: 0;
          background: var(--toolbar-bg);
          gap: 12px;
          white-space: nowrap;
        }
        @media print {
          .exec-toolbar, .hide-on-capture, .toolbar-restore-btn { display: none !important; }
          .painel-content-container { padding: 0 !important; background: transparent !important; }
          .page {
            box-shadow: none !important; border: none !important;
            width: 100% !important; max-width: 1660px !important; margin: 0 !important;
          }
        }
      `}</style>

      {/* ============================================================
          BARRA SUPERIOR — colapsável com visual exato do layout
          ============================================================ */}
      <AnimatePresence initial={false}>
        {showToolbar && (
          <motion.div
            key="toolbar"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 38, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="exec-toolbar hide-on-capture"
            style={{ overflow: "hidden" }}
          >
            <div className="left-info">
              <span>{isRegionais ? "Status Operação · Regionais (Fora de SP)" : "Status Operação · Matriz (SP)"}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500 font-normal">{lastUpdated}</span>

              {/* Badge de status da API http://10.210.1.242:8080/api/resumo */}
              <span
                className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                  apiStatusSource === "LIVE"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                }`}
                title="Conectado ao endpoint http://10.210.1.242:8080/api/resumo"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    apiStatusSource === "LIVE" ? "bg-emerald-500 animate-pulse" : "bg-blue-500"
                  }`}
                />
                {apiStatusSource === "LIVE" ? "API 10.210.1.242:8080 Conectada" : "API 10.210.1.242:8080 (Sincronizada)"}
              </span>
            </div>

            <div className="actions-group">
              {/* BOTÃO MINIMIZAR A TOOLBAR */}
              <button
                onClick={toggleToolbar}
                title="Minimizar barra superior"
                className="exec-btn"
              >
                <ChevronUp className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Minimizar</span>
              </button>

              {/* COPIAR IMAGEM (1 CLIQUE PARA CTRL+V NO OUTLOOK / TEAMS) */}
              <button
                onClick={handleQuickCopyScreenshot}
                disabled={isCapturing}
                title="Copiar imagem em 1 clique (Ctrl+V no Outlook/Gmail/Teams)"
                className={`exec-btn ${
                  quickCopied ? "!bg-emerald-600 !border-emerald-600 !text-white" : "primary"
                }`}
              >
                {quickCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copiado p/ E-mail!</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isCapturing ? "Capturando..." : "Copiar Imagem"}</span>
                  </>
                )}
              </button>

              {/* BOTÃO EDITAR DADOS */}
              <button
                type="button"
                onClick={() => setShowEditorModal(true)}
                title="Editar manualmente valores dos CDs"
                className="exec-btn edit"
              >
                <Pencil className="w-3.5 h-3.5 text-white" />
                <span>Editar Dados</span>
              </button>

              {/* SELETOR SP OU REGIONAIS (AO LADO DE ATUALIZAR) */}
              <div 
                className="view-selector-container"
                title="Alternar entre Centrais de SP e Centrais Regionais"
              >
                <button
                  type="button"
                  onClick={() => handleViewChange("sp")}
                  className={`view-selector-btn ${activeView === "sp" ? "active" : ""}`}
                  title="Exibir Centrais de São Paulo (CD 1965, 1942, 930, 7801)"
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>SP (Matriz)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleViewChange("regionais")}
                  className={`view-selector-btn ${activeView === "regionais" ? "active" : ""}`}
                  title="Exibir Centrais Regionais Fora de SP (CD 409, 1974, 1979, 1984, 1953)"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Regionais</span>
                </button>
              </div>

              {/* ATUALIZAR */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="Atualizar dados da API http://10.210.1.242:8080/api/resumo"
                className="exec-btn"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-slate-600 dark:text-slate-300 ${
                    isRefreshing ? "animate-spin text-blue-600" : ""
                  }`}
                />
                <span>{isRefreshing ? "Buscando..." : "Atualizar"}</span>
              </button>

              {/* FULLSCREEN */}
              <button onClick={toggleFullscreen} title="Tela Cheia" className="exec-btn">
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão flutuante para reabrir a toolbar e alternar visão quando oculta */}
      {!showToolbar && (
        <div className="fixed top-2 right-3 z-50 flex items-center gap-2 hide-on-capture">
          <div className="view-selector-container shadow-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
            <button
              type="button"
              onClick={() => handleViewChange("sp")}
              className={`view-selector-btn ${activeView === "sp" ? "active" : ""}`}
              title="Exibir Centrais de SP"
            >
              <Building className="w-3 h-3" />
              <span>SP</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewChange("regionais")}
              className={`view-selector-btn ${activeView === "regionais" ? "active" : ""}`}
              title="Exibir Centrais Regionais"
            >
              <Globe className="w-3 h-3" />
              <span>Regionais</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowEditorModal(true)}
            title="Editar valores dos CDs"
            className="exec-btn edit !h-7 shadow-md"
          >
            <Pencil className="w-3 h-3 text-white" />
            <span>Editar Dados</span>
          </button>
          <button
            onClick={toggleToolbar}
            title="Exibir barra superior completa"
            className="toolbar-restore-btn !static"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            <span>Exibir Barra</span>
          </button>
        </div>
      )}

      {/* ÁREA CENTRAL */}
      <div className="painel-content-container">
        <div className="page" ref={captureRef} id="painel-operacao-cds">
          <div className="masthead">
            <div>
              <h1>
                {isRegionais
                  ? "Status Diário da Operação — Regionais Fora de SP"
                  : "Status Diário da Operação — Centros de Distribuição"}
              </h1>
              <div className="sub">
                {isRegionais
                  ? "Centrais Regionais: CD 409 (Brasília) · CD 1974 (Fortaleza) · CD 1979 (Jaboatão) · CD 1984 (Curitiba) · CD 1953 (Caxias)"
                  : "Centrais São Paulo: CD 1965 (Osasco) · CD 1942 (Gravataí) · CD 930 (Cabo) · CD 7801 (São Paulo)"}
              </div>
            </div>
            <div className="meta">
              <div>
                <strong>{currentDate}</strong> · {currentTime}
              </div>
              <div>
                Distribuição:{" "}
                {isRegionais
                  ? "Supply Chain / Regionais Fora de SP"
                  : data.distribuicao || "Supply Chain / Operações CD"}
              </div>
            </div>
          </div>

          <div
            className="matrix"
            style={
              {
                ["--cd-count" as any]: Math.max(1, data.cds.length),
                ["--row-count" as any]: 4,
              } as React.CSSProperties
            }
          >
            {/* HEADER */}
            <div className="cd-head corner"></div>
            {data.cds.map((cd, cdIdx) => (
              <div key={cd.cd} className="cd-head relative group/cd">
                <div className="flex items-center justify-between w-full">
                  <h3>{cd.nome}</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setEditorTab(cdIdx);
                      setShowEditorModal(true);
                    }}
                    title={`Editar valores do ${cd.nome}`}
                    className="p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors opacity-75 hover:opacity-100 cursor-pointer"
                  >
                    <Pencil className="w-2.5 h-2.5" />
                  </button>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenStatusMenuCd(openStatusMenuCd === cd.cd ? null : cd.cd);
                    }}
                    title={`Clique para alterar o status do ${cd.nome} manualmente (Normal / Atenção / Crítico)`}
                    className={`status-pill ${
                      cd.statusGeral === "CRÍTICO"
                        ? "pill-bad"
                        : cd.statusGeral === "ATENÇÃO"
                        ? "pill-warn"
                        : "pill-ok"
                    }`}
                  >
                    <span>
                      {cd.statusGeral === "CRÍTICO"
                        ? "Crítico"
                        : cd.statusGeral === "ATENÇÃO"
                        ? "Atenção"
                        : "Normal"}
                    </span>
                    <ChevronDown className="w-2.5 h-2.5 opacity-60 hide-on-capture" />
                  </button>

                  {/* Dropdown de alteração de status do CD */}
                  {openStatusMenuCd === cd.cd && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setOpenStatusMenuCd(null)}
                      />
                      <div className="absolute top-full right-0 mt-1 z-50 bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 py-1 px-1 min-w-[130px] text-xs font-semibold hide-on-capture animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-2 py-1 text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1">
                          Definir Status
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateStatusGeral(cdIdx, "NORMAL");
                            setOpenStatusMenuCd(null);
                          }}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                            cd.statusGeral === "NORMAL"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Normal
                          </span>
                          {cd.statusGeral === "NORMAL" && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateStatusGeral(cdIdx, "ATENÇÃO");
                            setOpenStatusMenuCd(null);
                          }}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                            cd.statusGeral === "ATENÇÃO"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            Atenção
                          </span>
                          {cd.statusGeral === "ATENÇÃO" && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateStatusGeral(cdIdx, "CRÍTICO");
                            setOpenStatusMenuCd(null);
                          }}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                            cd.statusGeral === "CRÍTICO"
                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            Crítico
                          </span>
                          {cd.statusGeral === "CRÍTICO" && <Check className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* LINHA 1: OCUPAÇÃO (PREENCHIDO DIRETAMENTE PELA API /api/resumo) */}
            <div className="row-label">
              <h2>
                Ocupação
                <br />
                CD
              </h2>
            </div>
            {data.cds.map((cd) => {
              const pct = cd.ocupacao.percentual;
              const statusClass = pct >= 90 ? "bad" : pct >= 75 ? "warn" : "ok";
              const categoriasAcima80 = (cd.ocupacao.alertaCategorias || [])
                .filter((cat) => cat.percentual >= 80)
                .sort((a, b) => b.percentual - a.percentual);
              const hasAlerts = categoriasAcima80.length > 0;
              const hasMore = categoriasAcima80.length > 3;
              const qtdExtra = hasMore ? categoriasAcima80.length - 3 : 0;
              return (
                <div key={`ocup-${cd.cd}`} className="cell">
                  <div className="gauge-top">
                    <span className={`pct ${statusClass}`}>
                      {formatPercent(pct)}%
                    </span>
                    <span className="label">ocup. / capac.</span>
                  </div>
                  <div className="bar-track" title="Meta: 80%">
                    <div
                      className={`bar-fill ${statusClass}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    ></div>
                    <div className="bar-target" style={{ left: "80%" }}></div>
                  </div>
                  <div className="kpi-mini-row four">
                    <div className="kpi-mini">
                      <div className="label">Total</div>
                      <div className="value">{cd.ocupacao.total.toLocaleString("pt-BR")}</div>
                    </div>
                    <div className="kpi-mini">
                      <div className="label">Ocupada</div>
                      <div className="value">{cd.ocupacao.ocupada.toLocaleString("pt-BR")}</div>
                    </div>
                    <div className="kpi-mini">
                      <div className="label">Livre</div>
                      <div className="value">{cd.ocupacao.livre.toLocaleString("pt-BR")}</div>
                    </div>
                    <div className="kpi-mini">
                      <div className="label">Bloqueada</div>
                      <div className="value">{cd.ocupacao.bloqueada.toLocaleString("pt-BR")}</div>
                    </div>
                  </div>
                  {hasAlerts ? (
                    <div
                      className={`alert-box ${hasMore ? "more" : ""}`}
                      data-more={hasMore ? `+${qtdExtra} mais...` : undefined}
                    >
                      <div className="alert-title">Categorias acima de 80%</div>
                      <ul className="alert-list">
                        {categoriasAcima80.map((cat, i) => (
                          <li key={i}>
                            <span className="name" title={cat.nome}>
                              {cat.nome}
                            </span>
                            <span className="val">
                              {formatPercent(cat.percentual)}%
                              {cat.livres !== undefined ? ` (${cat.livres} livres)` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="alert-box neutral">
                      <div className="alert-title">Nenhuma categoria acima de 80%</div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* LINHA 2: AGENDAS RECEBIMENTO CD */}
            <div className="row-label">
              <h2>
                Agendas
                <br />
                Recebimento CD
              </h2>
            </div>
            {data.cds.map((cd) => {
              const pct = cd.agendas.percentual;
              const statusClass = pct > 105 ? "bad" : pct >= 95 ? "warn" : "ok";
              const categoriasAgendas = (cd.agendas.alertaCategorias || [])
                .filter((cat) => cat.percentual > 100)
                .sort((a, b) => b.percentual - a.percentual);
              const hasAlerts = categoriasAgendas.length > 0;
              const hasMore = categoriasAgendas.length > 3;
              const qtdExtra = hasMore ? categoriasAgendas.length - 3 : 0;
              return (
                <div key={`agend-${cd.cd}`} className="cell">
                  <div className="gauge-top">
                    <span className={`pct ${statusClass}`}>{formatPercent(pct)}%</span>
                    <span className="label">agend. / capac. dia</span>
                  </div>
                  <div className="bar-track" title="Capacidade: 100%">
                    <div
                      className={`bar-fill ${statusClass}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    ></div>
                    <div className="bar-target" style={{ left: "100%" }}></div>
                  </div>
                  <div className="kpi-mini-row">
                    <div className="kpi-mini">
                      <div className="label">Previstas</div>
                      <div className="value">{cd.agendas.previstas.toLocaleString("pt-BR")}</div>
                    </div>
                    <div className="kpi-mini">
                      <div className="label">Capacidade</div>
                      <div className="value">{cd.agendas.capacidade.toLocaleString("pt-BR")}</div>
                    </div>
                  </div>
                  {hasAlerts ? (
                    <div
                      className={`alert-box ${hasMore ? "more" : ""}`}
                      data-more={hasMore ? `+${qtdExtra} mais...` : undefined}
                    >
                      <div className="alert-title">Categorias acima da capacidade</div>
                      <ul className="alert-list">
                        {categoriasAgendas.map((cat, i) => (
                          <li key={i}>
                            <span className="name" title={cat.nome}>
                              {cat.nome}
                            </span>
                            <span className="val">
                              {formatPercent(cat.percentual)}%
                              {cat.senhas !== undefined ? ` (${cat.senhas} senhas)` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="alert-box neutral">
                      <div className="alert-title">Nenhuma categoria acima da capacidade</div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* LINHA 3: BACKLOG RECEBIMENTO */}
            <div className="row-label">
              <h2>
                Backlog
                <br />
                Recebimento
              </h2>
            </div>
            {data.cds.map((cd) => {
              const atraso = cd.backlogRecebimento.senhasAtraso;
              const diff = cd.backlogRecebimento.diffDiaAnterior;
              const statusColor = atraso > 300 ? "var(--bad)" : atraso > 100 ? "var(--warn)" : "var(--ok)";
              const statusClass = atraso > 300 ? "bad" : atraso > 100 ? "warn" : "ok";
              const topFornecedores = (cd.backlogRecebimento.topFornecedores || [])
                .sort((a, b) => b.senhasAtrasadas - a.senhasAtrasadas);
              const hasSuppliers = topFornecedores.length > 0;
              const hasMore = topFornecedores.length > 3;
              const qtdExtra = hasMore ? topFornecedores.length - 3 : 0;
              const diffSign = diff > 0 ? `+${diff}` : `${diff}`;
              return (
                <div key={`backlog-rec-${cd.cd}`} className="cell">
                  <div
                    className={`big-number ${statusClass === "bad" ? "bad" : ""}`}
                    style={statusClass !== "bad" ? { color: statusColor } : {}}
                  >
                    {atraso.toLocaleString("pt-BR")}
                  </div>
                  <div className="big-caption">
                    senhas em atraso · {diffSign} vs. dia anterior
                  </div>
                  {hasSuppliers ? (
                    <div
                      className={`alert-box ${statusClass === "warn" ? "warn-box" : ""} ${hasMore ? "more" : ""}`}
                      data-more={hasMore ? `+${qtdExtra} mais...` : undefined}
                    >
                      <div className="alert-title">Top fornecedores em backlog</div>
                      <ul className="alert-list">
                        {topFornecedores.map((forn, i) => (
                          <li key={i}>
                            <span className="name" title={forn.nome}>
                              {forn.nome}
                            </span>
                            <span className="val">{forn.senhasAtrasadas}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="alert-box neutral">
                      <div className="alert-title">Sem fornecedores relevantes em atraso</div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* LINHA 4: BACKLOG FATURAMENTO */}
            <div className="row-label">
              <h2>
                Backlog
                <br />
                Faturamento
              </h2>
            </div>
            {data.cds.map((cd) => {
              const pct = cd.backlogFaturamento.percentual;
              const statusClass = pct > 100 ? "bad" : pct >= 80 ? "warn" : "ok";
              return (
                <div key={`backlog-fat-${cd.cd}`} className="cell">
                  <div className="gauge-top">
                    <span className={`pct ${statusClass}`}>{formatPercent(pct)}%</span>
                    <span className="label">previsto 14h / capacidade</span>
                  </div>
                  <div className="bar-track" title="Capacidade: 100%">
                    <div
                      className={`bar-fill ${statusClass}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    ></div>
                    <div className="bar-target" style={{ left: "100%" }}></div>
                  </div>
                  <div className="kpi-mini-row">
                    <div className="kpi-mini">
                      <div className="label">Capacidade</div>
                      <div className="value">
                        {cd.backlogFaturamento.capacidade.toLocaleString("pt-BR")}
                      </div>
                    </div>
                    <div className="kpi-mini">
                      <div className="label">Backlog prev. 14h</div>
                      <div className="value">
                        {cd.backlogFaturamento.backlogPrevisto14h.toLocaleString("pt-BR")}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RODAPÉ DO PAINEL */}
          <div className="footer">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Fonte: API Corporativa (http://10.210.1.242:8080/api/resumo) · {currentDate} às {currentTime}
            </span>
            <span>GPA Logistics · Status Operação Centros de Distribuição</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          MODAL DE CAPTURA / COMPARTILHAMENTO
          ======================================================== */}
      <AnimatePresence>
        {showCaptureModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs hide-on-capture">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`rounded-xl shadow-2xl max-w-2xl w-full border overflow-hidden flex flex-col transition-colors ${
                isDark
                  ? "bg-slate-900 border-slate-700 text-slate-100"
                  : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div
                className={`p-4 border-b flex items-center justify-between ${
                  isDark ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-600 text-white">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Compartilhar Painel Gerencial</h3>
                    <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Status Operação CDs — Alta Resolução
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCaptureModal(false)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isDark
                      ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                      : "text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                <div
                  className={`border rounded-lg overflow-hidden p-2 transition-colors ${
                    isDark ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-slate-100"
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span className={isDark ? "text-slate-400" : "text-slate-500"}>
                      Prévia da Captura
                    </span>
                    {copyStatus && <span className="text-emerald-500 font-bold">{copyStatus}</span>}
                  </div>
                  {capturedImageUrl ? (
                    <img
                      src={capturedImageUrl}
                      alt="Status Operação CDs"
                      className={`w-full h-auto max-h-52 object-contain rounded border ${
                        isDark ? "border-slate-800 bg-slate-900" : "border-slate-300 bg-white"
                      }`}
                    />
                  ) : (
                    <div className="h-32 flex flex-col items-center justify-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mb-2 text-blue-600" />
                      <span className="text-xs">Renderizando imagem...</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={copyImageToClipboard}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all text-center gap-1.5 ${
                      isDark
                        ? "border-slate-800 hover:border-blue-500 hover:bg-blue-950/40"
                        : "border-slate-200 hover:border-blue-500 hover:bg-blue-50/50"
                    }`}
                  >
                    <Copy className="w-5 h-5 text-blue-500" />
                    <span className="text-xs font-bold">Copiar Imagem</span>
                    <span className={`text-[9px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Ctrl + V
                    </span>
                  </button>

                  <button
                    onClick={shareToWhatsApp}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all text-center gap-1.5 ${
                      isDark
                        ? "border-slate-800 hover:border-emerald-500 hover:bg-emerald-950/40"
                        : "border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50"
                    }`}
                  >
                    <MessageSquare className="w-5 h-5 text-emerald-500" />
                    <span className="text-xs font-bold">WhatsApp</span>
                    <span className={`text-[9px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Texto + Imagem
                    </span>
                  </button>

                  <button
                    onClick={shareToTeams}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all text-center gap-1.5 ${
                      isDark
                        ? "border-slate-800 hover:border-indigo-500 hover:bg-indigo-950/40"
                        : "border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50"
                    }`}
                  >
                    <Send className="w-5 h-5 text-indigo-400" />
                    <span className="text-xs font-bold">MS Teams</span>
                    <span className={`text-[9px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Chat / Canal
                    </span>
                  </button>

                  <button
                    onClick={downloadImage}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all text-center gap-1.5 ${
                      isDark
                        ? "border-slate-800 hover:border-slate-600 hover:bg-slate-800"
                        : "border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    <Download className={`w-5 h-5 ${isDark ? "text-slate-300" : "text-slate-700"}`} />
                    <span className="text-xs font-bold">Baixar PNG</span>
                    <span className={`text-[9px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Alta Qualidade
                    </span>
                  </button>
                </div>

                <div
                  className={`border rounded-lg p-3 ${
                    isDark ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      Resumo Operacional Estruturado
                    </span>
                    <div className="flex items-center gap-2">
                      {copySummaryStatus && (
                        <span className="text-xs font-bold text-emerald-500">
                          {copySummaryStatus}
                        </span>
                      )}
                      <button
                        onClick={copySummaryText}
                        className="text-[11px] font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Copiar Texto
                      </button>
                      <button
                        onClick={shareByEmail}
                        className={`text-[11px] font-bold flex items-center gap-1 ${
                          isDark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-800"
                        }`}
                      >
                        <Mail className="w-3 h-3" /> E-mail
                      </button>
                    </div>
                  </div>
                  <pre
                    className={`text-[10px] p-2.5 rounded border overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed ${
                      isDark
                        ? "bg-slate-900 border-slate-800 text-slate-300"
                        : "bg-white border-slate-200 text-slate-700"
                    }`}
                  >
                    {generateOperationalSummary()}
                  </pre>
                </div>
              </div>

              <div
                className={`p-3 border-t flex justify-end ${
                  isDark ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-slate-50"
                }`}
              >
                <button
                  onClick={() => setShowCaptureModal(false)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold transition-colors"
                >
                  Concluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================
          MODAL DO EDITOR MANUAL DOS CDS (STATUS OPERAÇÃO)
          ======================================================== */}
      <AnimatePresence>
        {showEditorModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm hide-on-capture">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className={`rounded-2xl shadow-2xl max-w-5xl w-full border overflow-hidden flex flex-col max-h-[94vh] transition-colors ${
                isDark
                  ? "bg-slate-900 text-slate-100 border-slate-700"
                  : "bg-white text-slate-900 border-slate-200"
              }`}
            >
              {/* Header do Modal */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/20">
                    <Pencil className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base">
                      Inserir Informações — {isRegionais ? "CDs Regionais (Fora de SP)" : "CDs Matriz (São Paulo)"}
                    </h3>
                    <p className="text-[11px] text-blue-100">
                      Insira fornecedores de backlog, categorias de agendas/ocupação e altere indicadores com casas decimais (ex: 80,55%)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetData}
                    title="Restaurar dados originais da API/Mock"
                    className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restaurar Padrão
                  </button>
                  <button
                    onClick={() => setShowEditorModal(false)}
                    className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Tabs dos CDs + Aba Geral */}
              <div
                className={`flex border-b overflow-x-auto ${
                  isDark ? "border-slate-800 bg-slate-950/80" : "border-slate-200 bg-slate-50"
                }`}
              >
                {data.cds.map((cd, idx) => (
                  <button
                    key={cd.cd}
                    onClick={() => setEditorTab(idx)}
                    className={`px-3 sm:px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                      editorTab === idx
                        ? isDark
                          ? "border-blue-500 text-blue-300 bg-slate-800/80 font-black"
                          : "border-blue-600 text-blue-700 bg-white font-black"
                        : isDark
                        ? "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                        : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" />
                    {cd.nome}
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        cd.statusGeral === "CRÍTICO"
                          ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                          : cd.statusGeral === "ATENÇÃO"
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                          : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {cd.statusGeral}
                    </span>
                  </button>
                ))}

                {/* Aba de Ajustes Gerais */}
                <button
                  onClick={() => setEditorTab(data.cds.length)}
                  className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                    editorTab === data.cds.length
                      ? isDark
                        ? "border-blue-500 text-blue-300 bg-slate-800/80 font-black"
                        : "border-blue-600 text-blue-700 bg-white font-black"
                      : isDark
                      ? "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Geral & Cabeçalho
                </button>
              </div>

              {/* Formulário do Editor */}
              <div className="p-5 overflow-y-auto flex-1 space-y-5">
                {/* Visualização de um CD específico */}
                {editorTab < data.cds.length && data.cds[editorTab] && (
                  <>
                    {/* Identificação */}
                    <section
                      className={`border rounded-xl p-4 transition-colors ${
                        isDark ? "border-slate-800 bg-slate-800/40" : "border-slate-200 bg-slate-50/50"
                      }`}
                    >
                      <h4
                        className={`text-xs font-black uppercase tracking-wide mb-3 flex items-center gap-2 ${
                          isDark ? "text-slate-200" : "text-slate-700"
                        }`}
                      >
                        <Building className="w-4 h-4 text-blue-500" />
                        Identificação da Unidade
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Field
                          isDark={isDark}
                          label="Nome"
                          value={data.cds[editorTab].nome}
                          onChange={(v) =>
                            updateCd(editorTab, (cd) => {
                              cd.nome = v;
                              return cd;
                            })
                          }
                        />
                        <Field
                          isDark={isDark}
                          label="Região / Cidade"
                          value={data.cds[editorTab].regiao || ""}
                          onChange={(v) =>
                            updateCd(editorTab, (cd) => {
                              cd.regiao = v;
                              return cd;
                            })
                          }
                        />
                        <label className="flex flex-col gap-0.5">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wide ${
                              isDark ? "text-slate-400" : "text-slate-500"
                            }`}
                          >
                            Status Geral
                          </span>
                          <select
                            value={data.cds[editorTab].statusGeral}
                            onChange={(e) =>
                              updateCd(editorTab, (cd) => {
                                cd.statusGeral = e.target.value as any;
                                return cd;
                              })
                            }
                            className={`w-full px-2 py-1 text-xs font-bold border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                              isDark
                                ? "bg-slate-800 border-slate-700 text-slate-100"
                                : "bg-white border-slate-300 text-slate-900"
                            }`}
                          >
                            <option value="NORMAL">NORMAL</option>
                            <option value="ATENÇÃO">ATENÇÃO</option>
                            <option value="CRÍTICO">CRÍTICO</option>
                          </select>
                        </label>
                      </div>
                    </section>

                    {/* Ocupação */}
                    <section
                      className={`border rounded-xl p-4 transition-colors ${
                        isDark ? "border-slate-800 bg-slate-800/40" : "border-slate-200 bg-slate-50/50"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700/60">
                        <div>
                          <h4
                            className={`text-xs font-black uppercase tracking-wide flex items-center gap-1.5 ${
                              isDark ? "text-cyan-400" : "text-cyan-700"
                            }`}
                          >
                            <span>📦 1º Quadrante: Ocupação CD</span>
                            <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              API Externa: 10.210.1.242:8080
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Dados integrados diretamente da API corporativa (/api/resumo). Atualizados dinamicamente.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => fetchResumoData(true)}
                          disabled={isRefreshing}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Sincronizar dados do 1º quadrante diretamente da API corporativa agora"
                        >
                          <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin text-cyan-500" : ""}`} />
                          <span>Sincronizar API Agora</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <Field
                          isDark={isDark}
                          label="% Ocupação"
                          type="number"
                          step="0.01"
                          value={data.cds[editorTab].ocupacao.percentual}
                          suffix="%"
                          onChange={(v) =>
                            updateCd(editorTab, (cd) => {
                              cd.ocupacao.percentual = parseFloat(v) || 0;
                              return cd;
                            })
                          }
                        />
                        <Field
                          isDark={isDark}
                          label="Total Posições"
                          type="number"
                          value={data.cds[editorTab].ocupacao.total}
                          onChange={(v) =>
                            updateCd(editorTab, (cd) => {
                              cd.ocupacao.total = parseInt(v) || 0;
                              return cd;
                            })
                          }
                        />
                        <Field
                          isDark={isDark}
                          label="Posições Ocupadas"
                          type="number"
                          value={data.cds[editorTab].ocupacao.ocupada}
                          onChange={(v) =>
                            updateCd(editorTab, (cd) => {
                              cd.ocupacao.ocupada = parseInt(v) || 0;
                              return cd;
                            })
                          }
                        />
                        <Field
                          isDark={isDark}
                          label="Posições Livres"
                          type="number"
                          value={data.cds[editorTab].ocupacao.livre}
                          onChange={(v) =>
                            updateCd(editorTab, (cd) => {
                              cd.ocupacao.livre = parseInt(v) || 0;
                              return cd;
                            })
                          }
                        />
                        <Field
                          isDark={isDark}
                          label="Posições Bloqueadas"
                          type="number"
                          value={data.cds[editorTab].ocupacao.bloqueada}
                          onChange={(v) =>
                            updateCd(editorTab, (cd) => {
                              cd.ocupacao.bloqueada = parseInt(v) || 0;
                              return cd;
                            })
                          }
                        />
                      </div>

                      {/* Alertas de Ocupação */}
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-[11px] font-bold uppercase ${
                              isDark ? "text-slate-300" : "text-slate-600"
                            }`}
                          >
                            Categorias acima de 80% (Alerta Ocupação)
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateCd(editorTab, (cd) => {
                                const list = [...(cd.ocupacao.alertaCategorias || [])];
                                list.push({ nome: "Nova Categoria", percentual: 85.0, livres: 50 });
                                cd.ocupacao.alertaCategorias = list;
                                return cd;
                              })
                            }
                            className="text-xs px-2.5 py-1 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Inserir Categoria Ocupação
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(data.cds[editorTab].ocupacao.alertaCategorias || []).map((cat, ci) => (
                            <div key={ci} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={cat.nome}
                                onChange={(e) =>
                                  updateCd(editorTab, (cd) => {
                                    const list = [...(cd.ocupacao.alertaCategorias || [])];
                                    if (list[ci]) list[ci] = { ...list[ci], nome: e.target.value };
                                    cd.ocupacao.alertaCategorias = list;
                                    return cd;
                                  })
                                }
                                placeholder="Nome da Categoria"
                                className={`flex-1 px-2 py-1 text-xs border rounded ${
                                  isDark
                                    ? "bg-slate-800 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={cat.percentual}
                                  onChange={(e) =>
                                    updateCd(editorTab, (cd) => {
                                      const list = [...(cd.ocupacao.alertaCategorias || [])];
                                      if (list[ci]) list[ci] = { ...list[ci], percentual: parseFloat(e.target.value) || 0 };
                                      cd.ocupacao.alertaCategorias = list;
                                      return cd;
                                    })
                                  }
                                  placeholder="%"
                                  className={`w-20 px-2 py-1 text-xs font-mono border rounded ${
                                    isDark
                                      ? "bg-slate-800 border-slate-700 text-white"
                                      : "bg-white border-slate-300 text-slate-900"
                                  }`}
                                />
                                <span className={`text-[10px] font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>%</span>
                              </div>
                              <input
                                type="number"
                                value={cat.livres ?? 0}
                                onChange={(e) =>
                                  updateCd(editorTab, (cd) => {
                                    const list = [...(cd.ocupacao.alertaCategorias || [])];
                                    if (list[ci]) list[ci] = { ...list[ci], livres: parseInt(e.target.value) || 0 };
                                    cd.ocupacao.alertaCategorias = list;
                                    return cd;
                                  })
                                }
                                placeholder="Livres"
                                className={`w-20 px-2 py-1 text-xs font-mono border rounded ${
                                  isDark
                                    ? "bg-slate-800 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateCd(editorTab, (cd) => {
                                    const list = [...(cd.ocupacao.alertaCategorias || [])];
                                    list.splice(ci, 1);
                                    cd.ocupacao.alertaCategorias = list;
                                    return cd;
                                  })
                                }
                                className="p-1 text-rose-500 hover:bg-rose-500/10 rounded cursor-pointer"
                                title="Remover categoria"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          {(!data.cds[editorTab].ocupacao.alertaCategorias || data.cds[editorTab].ocupacao.alertaCategorias.length === 0) && (
                            <p className="text-[11px] text-slate-400 italic">Nenhuma categoria acima de 80% adicionada.</p>
                          )}
                        </div>
                      </div>
                    </section>

                    {/* Agendas */}
                    <section
                      className={`border rounded-xl p-4 transition-colors ${
                        isDark ? "border-slate-800 bg-slate-800/40" : "border-slate-200 bg-slate-50/50"
                      }`}
                    >
                      <h4
                        className={`text-xs font-black uppercase tracking-wide mb-3 ${
                          isDark ? "text-slate-200" : "text-slate-700"
                        }`}
                      >
                        📅 Agendas Recebimento CD
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Field
                          isDark={isDark}
                          label="% Agendas"
                          type="number"
                          step="0.01"
                          value={data.cds[editorTab].agendas.percentual}
                          suffix="%"
                          onChange={(v) =>
                            updateCd(editorTab, (cd) => {
                              cd.agendas.percentual = parseFloat(v) || 0;
                              return cd;
                            })
                          }
                        />
                        <Field
                          isDark={isDark}
                          label="Previstas (Hoje)"
                          type="number"
                          value={data.cds[editorTab].agendas.previstas}
                          onChange={(v) =>
                            updateCd(editorTab, (cd) => {
                              cd.agendas.previstas = parseInt(v) || 0;
                              return cd;
                            })
                          }
                        />
                        <Field
                          isDark={isDark}
                          label="Capacidade do Dia"
                          type="number"
                          value={data.cds[editorTab].agendas.capacidade}
                          onChange={(v) =>
                            updateCd(editorTab, (cd) => {
                              cd.agendas.capacidade = parseInt(v) || 0;
                              return cd;
                            })
                          }
                        />
                      </div>

                      {/* Categorias Acima da Capacidade (Agendas) */}
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-[11px] font-bold uppercase ${
                              isDark ? "text-slate-300" : "text-slate-600"
                            }`}
                          >
                            Categorias Acima da Capacidade (&gt; 100%)
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateCd(editorTab, (cd) => {
                                const list = [...(cd.agendas.alertaCategorias || [])];
                                list.push({ nome: "Nova Categoria", percentual: 110.0, senhas: 25 });
                                cd.agendas.alertaCategorias = list;
                                return cd;
                              })
                            }
                            className="text-xs px-2.5 py-1 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Inserir Categoria Agendada
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(data.cds[editorTab].agendas.alertaCategorias || []).map((cat, ci) => (
                            <div key={ci} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={cat.nome}
                                onChange={(e) =>
                                  updateCd(editorTab, (cd) => {
                                    const list = [...(cd.agendas.alertaCategorias || [])];
                                    if (list[ci]) list[ci] = { ...list[ci], nome: e.target.value };
                                    cd.agendas.alertaCategorias = list;
                                    return cd;
                                  })
                                }
                                placeholder="Nome da Categoria (ex: Mercearia, Perecíveis)"
                                className={`flex-1 px-2 py-1 text-xs border rounded ${
                                  isDark
                                    ? "bg-slate-800 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={cat.percentual}
                                  onChange={(e) =>
                                    updateCd(editorTab, (cd) => {
                                      const list = [...(cd.agendas.alertaCategorias || [])];
                                      if (list[ci]) list[ci] = { ...list[ci], percentual: parseFloat(e.target.value) || 0 };
                                      cd.agendas.alertaCategorias = list;
                                      return cd;
                                    })
                                  }
                                  placeholder="%"
                                  className={`w-20 px-2 py-1 text-xs font-mono border rounded ${
                                    isDark
                                      ? "bg-slate-800 border-slate-700 text-white"
                                      : "bg-white border-slate-300 text-slate-900"
                                  }`}
                                />
                                <span className={`text-[10px] font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>%</span>
                              </div>
                              <input
                                type="number"
                                value={cat.senhas ?? 0}
                                onChange={(e) =>
                                  updateCd(editorTab, (cd) => {
                                    const list = [...(cd.agendas.alertaCategorias || [])];
                                    if (list[ci]) list[ci] = { ...list[ci], senhas: parseInt(e.target.value) || 0 };
                                    cd.agendas.alertaCategorias = list;
                                    return cd;
                                  })
                                }
                                placeholder="Senhas"
                                className={`w-20 px-2 py-1 text-xs font-mono border rounded ${
                                  isDark
                                    ? "bg-slate-800 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateCd(editorTab, (cd) => {
                                    const list = [...(cd.agendas.alertaCategorias || [])];
                                    list.splice(ci, 1);
                                    cd.agendas.alertaCategorias = list;
                                    return cd;
                                  })
                                }
                                className="p-1 text-rose-500 hover:bg-rose-500/10 rounded cursor-pointer"
                                title="Remover categoria"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          {(!data.cds[editorTab].agendas.alertaCategorias || data.cds[editorTab].agendas.alertaCategorias.length === 0) && (
                            <p className="text-[11px] text-slate-400 italic">Nenhuma categoria acima da capacidade adicionada.</p>
                          )}
                        </div>
                      </div>
                    </section>

                    {/* Backlog Recebimento */}
                    <section
                      className={`border rounded-xl p-4 transition-colors ${
                        isDark ? "border-slate-800 bg-slate-800/40" : "border-slate-200 bg-slate-50/50"
                      }`}
                    >
                      <h4
                        className={`text-xs font-black uppercase tracking-wide mb-3 ${
                          isDark ? "text-slate-200" : "text-slate-700"
                        }`}
                      >
                        🚚 Backlog Recebimento
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <Field
                          isDark={isDark}
                          label="Senhas em Atraso"
                          type="number"
                          value={data.cds[editorTab].backlogRecebimento.senhasAtraso}
                          onChange={(v) =>
                            updateCd(editorTab, (cd) => {
                              cd.backlogRecebimento.senhasAtraso = parseInt(v) || 0;
                              return cd;
                            })
                          }
                        />
                        <Field
                          isDark={isDark}
                          label="Diferença vs. Dia Anterior (+ ou -)"
                          type="number"
                          value={data.cds[editorTab].backlogRecebimento.diffDiaAnterior}
                          onChange={(v) =>
                            updateCd(editorTab, (cd) => {
                              cd.backlogRecebimento.diffDiaAnterior = parseInt(v) || 0;
                              return cd;
                            })
                          }
                        />
                      </div>

                      {/* Fornecedores em Atraso (Backlog) */}
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-[11px] font-bold uppercase ${
                              isDark ? "text-slate-300" : "text-slate-600"
                            }`}
                          >
                            Top Fornecedores em Backlog / Atraso
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateCd(editorTab, (cd) => {
                                const list = [...(cd.backlogRecebimento.topFornecedores || [])];
                                list.push({ nome: "Novo Fornecedor", senhasAtrasadas: 15 });
                                cd.backlogRecebimento.topFornecedores = list;
                                return cd;
                              })
                            }
                            className="text-xs px-2.5 py-1 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Inserir Fornecedor de Backlog
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(data.cds[editorTab].backlogRecebimento.topFornecedores || []).map((forn, fi) => (
                            <div key={fi} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={forn.nome}
                                onChange={(e) =>
                                  updateCd(editorTab, (cd) => {
                                    const list = [...(cd.backlogRecebimento.topFornecedores || [])];
                                    if (list[fi]) list[fi] = { ...list[fi], nome: e.target.value };
                                    cd.backlogRecebimento.topFornecedores = list;
                                    return cd;
                                  })
                                }
                                placeholder="Nome do Fornecedor (ex: Unilever, Ambev, Nestlé)"
                                className={`flex-1 px-2 py-1 text-xs border rounded ${
                                  isDark
                                    ? "bg-slate-800 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={forn.senhasAtrasadas}
                                  onChange={(e) =>
                                    updateCd(editorTab, (cd) => {
                                      const list = [...(cd.backlogRecebimento.topFornecedores || [])];
                                      if (list[fi]) list[fi] = { ...list[fi], senhasAtrasadas: parseInt(e.target.value) || 0 };
                                      cd.backlogRecebimento.topFornecedores = list;
                                      return cd;
                                    })
                                  }
                                  placeholder="Senhas"
                                  className={`w-24 px-2 py-1 text-xs font-mono border rounded ${
                                    isDark
                                      ? "bg-slate-800 border-slate-700 text-white"
                                      : "bg-white border-slate-300 text-slate-900"
                                  }`}
                                />
                                <span className={`text-[10px] font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>senhas</span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  updateCd(editorTab, (cd) => {
                                    const list = [...(cd.backlogRecebimento.topFornecedores || [])];
                                    list.splice(fi, 1);
                                    cd.backlogRecebimento.topFornecedores = list;
                                    return cd;
                                  })
                                }
                                className="p-1 text-rose-500 hover:bg-rose-500/10 rounded cursor-pointer"
                                title="Remover fornecedor"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          {(!data.cds[editorTab].backlogRecebimento.topFornecedores || data.cds[editorTab].backlogRecebimento.topFornecedores.length === 0) && (
                            <p className="text-[11px] text-slate-400 italic">Nenhum fornecedor adicionado ao backlog deste CD.</p>
                          )}
                        </div>
                      </div>
                    </section>

                    {/* Backlog Faturamento */}
                    <section
                      className={`border rounded-xl p-4 transition-colors ${
                        isDark ? "border-slate-800 bg-slate-800/40" : "border-slate-200 bg-slate-50/50"
                      }`}
                    >
                      <h4
                        className={`text-xs font-black uppercase tracking-wide mb-3 ${
                          isDark ? "text-slate-200" : "text-slate-700"
                        }`}
                      >
                        📤 Backlog Faturamento
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Field
                          isDark={isDark}
                          label="% Previsto 14h / Capacidade"
                          type="number"
                          step="0.01"
                          value={data.cds[editorTab].backlogFaturamento.percentual}
                          suffix="%"
                          onChange={(v) =>
                            updateCd(editorTab, (cd) => {
                              cd.backlogFaturamento.percentual = parseFloat(v) || 0;
                              return cd;
                            })
                          }
                        />
                        <Field
                          isDark={isDark}
                          label="Capacidade"
                          type="number"
                          value={data.cds[editorTab].backlogFaturamento.capacidade}
                          onChange={(v) =>
                            updateCd(editorTab, (cd) => {
                              cd.backlogFaturamento.capacidade = parseInt(v) || 0;
                              return cd;
                            })
                          }
                        />
                        <Field
                          isDark={isDark}
                          label="Backlog Previsto 14h"
                          type="number"
                          value={data.cds[editorTab].backlogFaturamento.backlogPrevisto14h}
                          onChange={(v) =>
                            updateCd(editorTab, (cd) => {
                              cd.backlogFaturamento.backlogPrevisto14h = parseInt(v) || 0;
                              return cd;
                            })
                          }
                        />
                      </div>
                    </section>
                  </>
                )}

                {/* Aba Geral & Mock */}
                {editorTab === data.cds.length && (
                  <div className="space-y-4">
                    <section
                      className={`border rounded-xl p-4 transition-colors ${
                        isDark ? "border-slate-800 bg-slate-800/40" : "border-slate-200 bg-slate-50/50"
                      }`}
                    >
                      <h4
                        className={`text-xs font-black uppercase tracking-wide mb-3 ${
                          isDark ? "text-slate-200" : "text-slate-700"
                        }`}
                      >
                        Informações Globais do Cabeçalho
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field
                          isDark={isDark}
                          label="Distribuição / Diretoria"
                          value={data.distribuicao || ""}
                          onChange={(v) =>
                            updateGlobalData((prev) => ({
                              ...prev,
                              distribuicao: v,
                            }))
                          }
                        />
                        <Field
                          isDark={isDark}
                          label="Data Referência Inicial"
                          value={data.dataReferencia || ""}
                          onChange={(v) =>
                            updateGlobalData((prev) => ({
                              ...prev,
                              dataReferencia: v,
                            }))
                          }
                        />
                      </div>
                    </section>

                    <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-blue-900 dark:text-blue-200">
                          Persistência dos Dados Manuais
                        </p>
                        <p className="text-slate-600 dark:text-slate-400">
                          Todas as alterações feitas para os CDs ({isRegionais ? "Regionais" : "São Paulo"}) são salvas automaticamente
                          no seu navegador. Para retornar aos dados reais fornecidos pela API corporativa, basta clicar em "Restaurar Padrão".
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Modal */}
              <div
                className={`p-4 border-t flex items-center justify-between transition-colors ${
                  isDark ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-slate-50"
                }`}
              >
                <span className="text-xs text-slate-500 font-medium">
                  Salvo automaticamente a cada digitação
                </span>
                <button
                  type="button"
                  onClick={() => setShowEditorModal(false)}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Concluir e Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
