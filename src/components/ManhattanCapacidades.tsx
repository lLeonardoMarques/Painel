import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  Clock,
  RefreshCw,
  Download,
  Copy,
  Check,
  Building2,
  Filter,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BarChart3,
  Layers,
  ArrowUpDown,
  SlidersHorizontal,
  Info,
  CheckCircle2,
  TrendingUp,
  Boxes,
  Truck,
  Hash,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Capacidade } from "../types";

export interface ManhattanCapacidadesProps {
  theme?: "light" | "dark";
  showNotification?: (msg: string) => void;
  user?: any;
  onPageChange?: (page: string) => void;
  onThemeToggle?: () => void;
  onLogout?: () => void;
}

// 24 Faixas Horárias Padrão WMS Manhattan
export const MANHATTAN_HORARIOS: string[] = [
  "00:00-01:00",
  "01:00-02:00",
  "02:00-03:00",
  "03:00-04:00",
  "04:00-05:00",
  "05:00-06:00",
  "06:00-07:00",
  "07:00-08:00",
  "08:00-09:00",
  "09:00-10:00",
  "10:00-11:00",
  "11:00-12:00",
  "12:00-13:00",
  "13:00-14:00",
  "14:00-15:00",
  "15:00-16:00",
  "16:00-17:00",
  "17:00-18:00",
  "18:00-19:00",
  "19:00-20:00",
  "20:00-21:00",
  "21:00-22:00",
  "22:00-23:00",
  "23:00-00:00",
];

// Matriz de referência padrão informada pelo usuário:
// Ordem das colunas: [Domingo, Segunda, Terça, Quarta, Quinta, Sexta, Sábado]
export const MANHATTAN_DEFAULT_MATRIX: number[][] = [
  [0, 0, 0, 0, 0, 0, 0],         // 00:00-01:00
  [0, 5, 10, 10, 10, 10, 7],     // 01:00-02:00
  [0, 10, 5, 10, 10, 10, 7],     // 02:00-03:00
  [0, 10, 10, 10, 11, 10, 7],    // 03:00-04:00
  [0, 10, 10, 10, 10, 10, 7],    // 04:00-05:00
  [0, 10, 10, 10, 10, 10, 7],    // 05:00-06:00
  [15, 0, 0, 0, 0, 0, 7],        // 06:00-07:00
  [15, 10, 10, 10, 10, 10, 7],   // 07:00-08:00
  [15, 10, 15, 10, 10, 10, 7],   // 08:00-09:00
  [15, 10, 10, 10, 10, 10, 7],   // 09:00-10:00
  [0, 10, 10, 10, 10, 10, 7],    // 10:00-11:00
  [0, 0, 0, 0, 0, 0, 0],         // 11:00-12:00
  [0, 10, 10, 10, 10, 10, 6],    // 12:00-13:00
  [0, 10, 10, 10, 10, 10, 0],    // 13:00-14:00
  [0, 0, 0, 0, 0, 0, 0],         // 14:00-15:00
  [0, 15, 10, 10, 10, 10, 0],    // 15:00-16:00
  [0, 10, 10, 10, 10, 10, 0],    // 16:00-17:00
  [0, 10, 10, 10, 10, 10, 0],    // 17:00-18:00
  [0, 0, 0, 0, 0, 0, 0],         // 18:00-19:00
  [0, 10, 10, 10, 10, 10, 0],    // 19:00-20:00
  [0, 10, 10, 10, 10, 10, 0],    // 20:00-21:00
  [0, 10, 10, 10, 10, 10, 0],    // 21:00-22:00
  [0, 0, 0, 0, 0, 1, 0],         // 22:00-23:00
  [0, 10, 10, 10, 10, 10, 0],    // 23:00-00:00
];

const DIAS_NOMES = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

// Amarração estrita de Centro de Distribuição x Categorias Permitidas informada pelo usuário
export const CD_CATEGORIAS_MAP: Record<string, string[]> = {
  "930": ["FLV", "Insumos/Embalagens", "Mercearia"],
  "1942": ["Perecíveis"],
  "1965": ["Mercearia"],
  "7801": ["Bazar"],
  "1953": ["Mercearia"],
  "1984": ["Perecíveis", "FLV"],
  "409": ["Mercearia", "Perecíveis", "FLV"],
  "1979": ["Mercearia", "Perecíveis", "FLV"],
  "1974": ["Mercearia", "Perecíveis", "FLV"],
  "941": ["Suprimentos"],
};

// Verifica se um CD suporta determinada categoria
export function cdPossuiCategoria(cd: string | number, categoria: string): boolean {
  if (categoria === "all") return true;
  const cdKey = String(cd);
  const permitidas = CD_CATEGORIAS_MAP[cdKey];
  if (!permitidas) return false;
  return permitidas.includes(categoria);
}

// CDs permitidos conforme a regra do projeto
const CDS_SP = [1965, 1942, 930, 7801, 941];
const CDS_REGIONAL = [409, 1974, 1979, 1984, 1953];
const ALL_CDS = [...CDS_SP, ...CDS_REGIONAL];

export type ModoVisualizacao = "igualitaria" | "ponderada";

/**
 * Diluição Igualitária Perfeita entre as 24 Horas
 * Garante que a soma das 24 horas seja RIGOROSAMENTE EXATA ao total de Inbound da API (ex: 150 plts).
 * Para 150 plts / 24h:
 * - base = floor(150 / 24) = 6
 * - sobra = 150 % 24 = 6
 * - As 6 primeiras horas recebem +1 (= 7), e as outras 18 horas recebem 6.
 * Soma: (6 * 7) + (18 * 6) = 42 + 108 = 150 EXATOS!
 */
export function distributeEqually24(total: number): number[] {
  if (total <= 0) return Array(24).fill(0);
  const base = Math.floor(total / 24);
  const remainder = total % 24;
  const result = Array(24).fill(base);
  for (let i = 0; i < remainder; i++) {
    result[i] += 1;
  }
  return result;
}

/**
 * Diluição Proporcional Perfeita (Método do Maior Resto / Hamilton / Hare-Niemeyer)
 * Respeita a curva e janelas de docas do Manhattan WMS, mas garante
 * matematicamente que a soma das 24 horas seja 100% IDÊNTICA ao total de Inbound da API (ex: 150 plts).
 */
export function distributeProportionalWMS(total: number, weights: number[]): number[] {
  if (total <= 0) return Array(weights.length).fill(0);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (weightSum === 0) return distributeEqually24(total);

  // Calcula cota exata e parte inteira
  const quotas = weights.map((w, idx) => {
    const raw = (w / weightSum) * total;
    const floor = Math.floor(raw);
    const fraction = raw - floor;
    return { idx, weight: w, floor, fraction };
  });

  const sumFloors = quotas.reduce((acc, q) => acc + q.floor, 0);
  const remainder = total - sumFloors;

  // Ordena pelas maiores frações para receber +1 unitário
  const sorted = [...quotas].sort((a, b) => b.fraction - a.fraction);
  for (let i = 0; i < remainder; i++) {
    sorted[i % sorted.length].floor += 1;
  }

  // Restaura ordem cronológica original das 24 horas
  sorted.sort((a, b) => a.idx - b.idx);
  return sorted.map((q) => q.floor);
}

// Helper para formatar data YYYY-MM-DD
function formatDateToISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper para converter string YYYY-MM-DD para Date local
function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

// Calcula o domingo e sábado da semana atual
function getWeekBounds(referenceDate: Date = new Date()): { start: string; end: string } {
  const d = new Date(referenceDate);
  const dayOfWeek = d.getDay(); // 0 = Domingo, 6 = Sábado
  
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - dayOfWeek);
  
  const saturday = new Date(d);
  saturday.setDate(d.getDate() + (6 - dayOfWeek));
  
  return {
    start: formatDateToISO(sunday),
    end: formatDateToISO(saturday),
  };
}

export default function ManhattanCapacidades({
  theme = "dark",
  showNotification,
  user,
}: ManhattanCapacidadesProps) {
  const isDark = theme === "dark";

  // Semana Atual sempre calculada inicialmente
  const currentWeekDefault = useMemo(() => getWeekBounds(), []);

  // Estados de data da semana
  const [dataInicio, setDataInicio] = useState<string>(currentWeekDefault.start);
  const [dataFim, setDataFim] = useState<string>(currentWeekDefault.end);

  // Filtros
  const [cdSelecionado, setCdSelecionado] = useState<string>("all");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>("all");
  const [visualizacaoModo, setVisualizacaoModo] = useState<ModoVisualizacao>("igualitaria");

  // Estado para maximizar a tabela em tela cheia
  const [isTableMaximized, setIsTableMaximized] = useState<boolean>(false);

  // NOVO: Estado para ocultar/desocultar o painel de opções
  const [showOptions, setShowOptions] = useState<boolean>(true);

  // Escuta tecla Escape para fechar modo maximizado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTableMaximized) {
        setIsTableMaximized(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTableMaximized]);

  // Amarração estrita de compatibilidade CD x Categoria informada pelo usuário
  const isCdCategoriaIncompativel = useMemo(() => {
    if (cdSelecionado === "all" || categoriaSelecionada === "all") return false;
    return !cdPossuiCategoria(cdSelecionado, categoriaSelecionada);
  }, [cdSelecionado, categoriaSelecionada]);

  // Dados brutos de capacidades da API
  const [capacidadesApi, setCapacidadesApi] = useState<Capacidade[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastSync, setLastSync] = useState<string>("");
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);

  // Busca de capacidades na API
  const fetchCapacidades = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/capacidades");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setCapacidadesApi(data);
        setLastSync(new Date().toLocaleTimeString("pt-BR"));
      }
    } catch (err) {
      console.error("Erro ao carregar /api/capacidades:", err);
      if (showNotification) {
        showNotification("Aviso: Conectando com contingência de capacidades.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchCapacidades();
  }, [fetchCapacidades]);

  // Lista dos 7 dias selecionados (Domingo a Sábado)
  const weekDays = useMemo(() => {
    const startDateObj = parseISODate(dataInicio);
    const days: { dateStr: string; nomeDia: string; labelDisplay: string; dayIndex: number }[] = [];

    for (let i = 0; i < 7; i++) {
      const cur = new Date(startDateObj);
      cur.setDate(startDateObj.getDate() + i);
      const iso = formatDateToISO(cur);
      const dayIdx = cur.getDay(); // 0 a 6
      const diaNum = String(cur.getDate()).padStart(2, "0");
      const mesNum = String(cur.getMonth() + 1).padStart(2, "0");

      days.push({
        dateStr: iso,
        nomeDia: DIAS_NOMES[i] || DIAS_NOMES[dayIdx],
        labelDisplay: `${DIAS_NOMES[i]} (${diaNum}/${mesNum})`,
        dayIndex: i,
      });
    }

    return days;
  }, [dataInicio]);

  // Capacidade total de Inbound por dia extraída da API com amarração estrita por categoria
  const dailyInboundFromApi = useMemo(() => {
    const map = new Map<string, number>();

    // Se o CD selecionado não opera a categoria selecionada, retorna tudo 0
    if (isCdCategoriaIncompativel) {
      return map;
    }

    capacidadesApi.forEach((item) => {
      if (!item.dataMovimentacao) return;

      const itemCdStr = String(item.cd);
      if (item.cd === 8034) return; // Exclui 8034

      // Se o CD não opera essa categoria conforme a amarração oficial, descarta
      if (!cdPossuiCategoria(itemCdStr, item.categoria || "")) {
        return;
      }

      // Filtro de CD
      if (cdSelecionado !== "all" && itemCdStr !== cdSelecionado) return;

      // Filtro de Categoria
      if (categoriaSelecionada !== "all" && item.categoria !== categoriaSelecionada) return;

      const inCap = Number(item.capacidadeInbound) || 0;
      const prev = map.get(item.dataMovimentacao) || 0;
      map.set(item.dataMovimentacao, prev + inCap);
    });

    return map;
  }, [capacidadesApi, cdSelecionado, categoriaSelecionada, isCdCategoriaIncompativel]);

  // Pesos diários da matriz padrão informada pelo usuário (somas das colunas)
  const defaultDayTotals = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0];
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row < 24; row++) {
        totals[col] += MANHATTAN_DEFAULT_MATRIX[row][col];
      }
    }
    return totals; // [60, 180, 180, 180, 181, 181, 76]
  }, []);

  // Matriz final calculada e diluída por horário com amarração estrita e conservação de capacidade
  const computedTableData = useMemo(() => {
    // 1. Calcula a coluna horária de 24 valores para cada um dos 7 dias da semana
    const dayColumns: number[][] = [];

    for (let colIndex = 0; colIndex < 7; colIndex++) {
      const dayInfo = weekDays[colIndex];
      const baseWeightsForDay = MANHATTAN_HORARIOS.map(
        (_, rIdx) => MANHATTAN_DEFAULT_MATRIX[rIdx][colIndex]
      );

      // REGRA ESTRITA: Se o CD não possui a categoria vinculada, retorna TUDO 0
      if (isCdCategoriaIncompativel) {
        dayColumns.push(Array(24).fill(0));
        continue;
      }

      const apiCapForDay = dailyInboundFromApi.get(dayInfo.dateStr);

      if (apiCapForDay !== undefined && apiCapForDay > 0) {
        if (visualizacaoModo === "ponderada") {
          // Diluição Ponderada (WMS) com soma matematicamente exata
          dayColumns.push(distributeProportionalWMS(apiCapForDay, baseWeightsForDay));
        } else {
          // visualizacaoModo === "igualitaria" (Padrão)
          // Diluição Igualitária entre as 24 horas: conserva rigorosamente o total da API
          dayColumns.push(distributeEqually24(apiCapForDay));
        }
      } else {
        // Sem capacidade inbound cadastrada na API para o dia: retorna estritamente 0 para as 24 horas
        dayColumns.push(Array(24).fill(0));
      }
    }

    // 2. Mapeia para as 24 linhas de horários
    return MANHATTAN_HORARIOS.map((horario, rowIndex) => {
      const rowValues = dayColumns.map((col) => col[rowIndex]);
      const totalHorario = rowValues.reduce((a, b) => a + b, 0);

      return {
        horario,
        domingo: rowValues[0],
        segunda: rowValues[1],
        terca: rowValues[2],
        quarta: rowValues[3],
        quinta: rowValues[4],
        sexta: rowValues[5],
        sabado: rowValues[6],
        totalHorario,
      };
    });
  }, [weekDays, visualizacaoModo, dailyInboundFromApi, isCdCategoriaIncompativel, cdSelecionado, categoriaSelecionada]);

  // Totais por Coluna (Total do Dia)
  const columnTotals = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0];
    computedTableData.forEach((row) => {
      totals[0] += row.domingo;
      totals[1] += row.segunda;
      totals[2] += row.terca;
      totals[3] += row.quarta;
      totals[4] += row.quinta;
      totals[5] += row.sexta;
      totals[6] += row.sabado;
    });
    return totals;
  }, [computedTableData]);

  // Estatísticas Gerais e KPIs da Semana
  const stats = useMemo(() => {
    const totalSemana = columnTotals.reduce((a, b) => a + b, 0);
    const mediaDiaria = Math.round(totalSemana / 7);

    let maxValor = 0;
    let maxHorario = "";
    let maxDia = "";

    computedTableData.forEach((row) => {
      const vals = [
        row.domingo,
        row.segunda,
        row.terca,
        row.quarta,
        row.quinta,
        row.sexta,
        row.sabado,
      ];
      vals.forEach((v, idx) => {
        if (v > maxValor) {
          maxValor = v;
          maxHorario = row.horario;
          maxDia = DIAS_NOMES[idx];
        }
      });
    });

    let horasAtivas = 0;
    computedTableData.forEach((row) => {
      if (row.totalHorario > 0) horasAtivas++;
    });

    return {
      totalSemana,
      mediaDiaria,
      picoValor: maxValor,
      picoDesc: maxValor > 0 ? `${maxDia} (${maxHorario})` : "--",
      horasAtivas,
    };
  }, [columnTotals, computedTableData]);

  // Ação explícita para recalcular a grade da semana selecionada
  const handleRecalcular = useCallback(() => {
    setIsRecalculating(true);
    setTimeout(() => {
      setIsRecalculating(false);
      if (showNotification) {
        showNotification(
          `Grade recalculada para a semana: ${weekDays[0].labelDisplay} até ${weekDays[6].labelDisplay}`
        );
      }
    }, 300);
  }, [weekDays, showNotification]);

  // Navegação rápida de semana
  const handleSemanaAnterior = () => {
    const d = parseISODate(dataInicio);
    d.setDate(d.getDate() - 7);
    const newStart = formatDateToISO(d);
    d.setDate(d.getDate() + 6);
    const newEnd = formatDateToISO(d);
    setDataInicio(newStart);
    setDataFim(newEnd);
  };

  const handleSemanaAtual = () => {
    const bounds = getWeekBounds();
    setDataInicio(bounds.start);
    setDataFim(bounds.end);
    if (showNotification) {
      showNotification("Visualizando a Semana Atual.");
    }
  };

  const handleSemanaSeguinte = () => {
    const d = parseISODate(dataInicio);
    d.setDate(d.getDate() + 7);
    const newStart = formatDateToISO(d);
    d.setDate(d.getDate() + 6);
    const newEnd = formatDateToISO(d);
    setDataInicio(newStart);
    setDataFim(newEnd);
  };

  // Exportação para Excel (.xlsx)
  const handleExportExcel = () => {
    const rows = computedTableData.map((r) => ({
      Horário: r.horario,
      [weekDays[0].labelDisplay]: r.domingo,
      [weekDays[1].labelDisplay]: r.segunda,
      [weekDays[2].labelDisplay]: r.terca,
      [weekDays[3].labelDisplay]: r.quarta,
      [weekDays[4].labelDisplay]: r.quinta,
      [weekDays[5].labelDisplay]: r.sexta,
      [weekDays[6].labelDisplay]: r.sabado,
      "Total Horário": r.totalHorario,
    }));

    // Linha de Total
    rows.push({
      Horário: "TOTAL DO DIA",
      [weekDays[0].labelDisplay]: columnTotals[0],
      [weekDays[1].labelDisplay]: columnTotals[1],
      [weekDays[2].labelDisplay]: columnTotals[2],
      [weekDays[3].labelDisplay]: columnTotals[3],
      [weekDays[4].labelDisplay]: columnTotals[4],
      [weekDays[5].labelDisplay]: columnTotals[5],
      [weekDays[6].labelDisplay]: columnTotals[6],
      "Total Horário": stats.totalSemana,
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Grade Manhattan");
    XLSX.writeFile(workbook, `Manhattan_Capacidades_${dataInicio}_a_${dataFim}.xlsx`);

    if (showNotification) {
      showNotification("Arquivo Excel gerado com sucesso!");
    }
  };

  // Copiar para Área de Transferência (formato tabular TSV compatível com Excel/Manhattan)
  const handleCopyClipboard = () => {
    const headers = [
      "Horário",
      ...weekDays.map((d) => d.labelDisplay),
      "Total Horário",
    ].join("\t");

    const lines = computedTableData.map((r) =>
      [
        r.horario,
        r.domingo,
        r.segunda,
        r.terca,
        r.quarta,
        r.quinta,
        r.sexta,
        r.sabado,
        r.totalHorario,
      ].join("\t")
    );

    const totalLine = [
      "TOTAL DO DIA",
      ...columnTotals,
      stats.totalSemana,
    ].join("\t");

    const fullText = [headers, ...lines, totalLine].join("\n");
    navigator.clipboard.writeText(fullText);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);

    if (showNotification) {
      showNotification("Tabela copiada no formato Manhattan / Excel!");
    }
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
    primaryBtn: "inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3.5 text-xs font-semibold shadow-xs disabled:opacity-60 cursor-pointer transition-colors",
    th: "px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 select-none",
    seg: (active: boolean) => `px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
      active
        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
    }`,
  };
  const optionClass = isDark ? "bg-slate-900 text-slate-100" : "";
  const DIAS = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"] as const;
  const CD_OPCOES = [
    { grupo: "São Paulo / Matriz", itens: [["1965", "Mercearia"], ["1942", "Perecíveis"], ["930", "FLV, Insumos/Emb, Mercearia"], ["7801", "Bazar"], ["941", "Suprimentos"]] },
    { grupo: "Centros regionais", itens: [["409", "Mercearia, Perecíveis, FLV"], ["1974", "Mercearia, Perecíveis, FLV"], ["1979", "Mercearia, Perecíveis, FLV"], ["1984", "Perecíveis, FLV"], ["1953", "Mercearia"]] },
  ];
  const CATEGORIAS_OPCOES = [
    { val: "Mercearia", label: "Mercearia" },
    { val: "Perecíveis", label: "Perecíveis" },
    { val: "FLV", label: "FLV (Frutas, Legumes, Verduras)" },
    { val: "Bazar", label: "Bazar" },
    { val: "Insumos/Embalagens", label: "Insumos/Embalagens" },
    { val: "Suprimentos", label: "Suprimentos" },
  ];

  const tableBlock = (
    <div className={isTableMaximized ? "flex min-h-0 flex-1 flex-col" : "space-y-4"}>
      {/* Barra superior da tabela */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Grade horária</span>
          <span className="font-mono">
            {weekDays[0].labelDisplay} a {weekDays[6].labelDisplay}
          </span>
          {cdSelecionado !== "all" && (
            <span className="px-2 py-0.5 rounded-md font-mono bg-slate-500/10 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 font-medium">CD {cdSelecionado}</span>
          )}
          {categoriaSelecionada !== "all" && (
            <span className="px-2 py-0.5 rounded-md bg-slate-500/10 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 font-medium">{categoriaSelecionada}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isTableMaximized && (
            <>
              <button type="button" onClick={handleCopyClipboard} className={ui.ghostBtn} title="Copiar grade no formato TSV">
                {copiedSuccess ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedSuccess ? "Copiado" : "Copiar"}
              </button>
              <button type="button" onClick={handleExportExcel} className={ui.ghostBtn} title="Exportar para Excel (.xlsx)">
                <Download className="h-3.5 w-3.5" />
                Excel
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setIsTableMaximized(!isTableMaximized)}
            className={ui.ghostBtn}
            title={isTableMaximized ? "Restaurar tamanho normal (Esc)" : "Ver a tabela em tela cheia"}
          >
            {isTableMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            {isTableMaximized ? "Restaurar (Esc)" : "Tela cheia"}
          </button>
        </div>
      </div>

      <div className={isTableMaximized ? "min-h-0 flex-1 overflow-auto" : "max-h-[620px] overflow-auto"}>
        <table className="w-full min-w-[820px] text-left border-separate border-spacing-y-1">
          <thead className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
            <tr>
              <th className={`${ui.th} text-left rounded-l-xl w-36`}>Horário</th>
              {weekDays.map((d, idx) => (
                <th key={d.dateStr} className={`${ui.th} text-center ${idx === 0 || idx === 6 ? "text-slate-400 dark:text-slate-500" : ""}`}>
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{d.nomeDia}</span>
                    <span className="font-mono text-[10px] font-medium normal-case tracking-normal opacity-70">
                      {d.dateStr.slice(8, 10)}/{d.dateStr.slice(5, 7)}
                    </span>
                  </div>
                </th>
              ))}
              <th className={`${ui.th} text-right rounded-r-xl`}>Total</th>
            </tr>
          </thead>

          <tbody className="font-mono text-xs tabular-nums">
            {computedTableData.map((row) => {
              const isZeroRow = row.totalHorario === 0;
              return (
                <tr
                  key={row.horario}
                  className={`transition-colors ${
                    isZeroRow ? "" : "bg-slate-500/[0.03] dark:bg-slate-500/[0.06] hover:bg-slate-500/[0.07] dark:hover:bg-slate-500/[0.11]"
                  }`}
                >
                  <td className={`px-3 py-2.5 rounded-l-xl whitespace-nowrap ${isZeroRow ? "text-slate-400 dark:text-slate-600" : "text-slate-600 dark:text-slate-300 font-medium"}`}>
                    {row.horario}
                  </td>
                  {DIAS.map((dia) => {
                    const v = (row as any)[dia] as number;
                    return (
                      <td
                        key={dia}
                        className={`px-3 py-2.5 text-center ${
                          v >= 15
                            ? "text-blue-700 dark:text-blue-300 font-semibold"
                            : v > 0
                            ? "text-slate-900 dark:text-slate-100 font-medium"
                            : "text-slate-300 dark:text-slate-600"
                        }`}
                      >
                        {v}
                      </td>
                    );
                  })}
                  <td className={`px-3 py-2.5 text-right font-semibold rounded-r-xl ${isZeroRow ? "text-slate-300 dark:text-slate-600" : "text-slate-900 dark:text-slate-100"}`}>
                    {row.totalHorario}
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot className="sticky bottom-0 z-10">
            <tr className="bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md font-mono tabular-nums">
              <td className="px-3 py-3 rounded-l-xl text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300 font-sans">
                Total do dia
              </td>
              {columnTotals.map((tot, idx) => (
                <td key={idx} className="px-3 py-3 text-center text-sm font-bold text-slate-900 dark:text-slate-100">
                  {tot.toLocaleString("pt-BR")}
                </td>
              ))}
              <td className="px-3 py-3 text-right text-sm font-bold text-blue-700 dark:text-blue-300 rounded-r-xl">
                {stats.totalSemana.toLocaleString("pt-BR")}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Rodapé informativo */}
      <footer className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          A soma das 24 faixas conserva exatamente o total de inbound da API.
          {lastSync && ` Última sincronização: ${lastSync}.`}
        </span>
        <span className="font-medium text-slate-700 dark:text-slate-300">
          Total da semana:
          <strong className="ml-1.5 font-mono text-sm text-slate-900 dark:text-slate-100 font-bold">
            {stats.totalSemana.toLocaleString("pt-BR")}
          </strong>
        </span>
      </footer>
    </div>
  );

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-5 text-slate-900 dark:text-slate-100">
      <div className="max-w-[1760px] mx-auto w-full space-y-6">
        {/* CABEÇALHO */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Planejamento operacional · WMS inbound
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Manhattan capacidades
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Distribuição horária da capacidade de recebimento por semana.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowOptions((prev) => !prev)}
              className={ui.ghostBtn}
              title={showOptions ? "Ocultar filtros" : "Mostrar filtros"}
            >
              {showOptions ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showOptions ? "Ocultar filtros" : "Mostrar filtros"}
            </button>
            <button type="button" onClick={handleCopyClipboard} className={ui.ghostBtn} title="Copiar grade no formato TSV">
              {copiedSuccess ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedSuccess ? "Copiado" : "Copiar"}
            </button>
            <button type="button" onClick={handleExportExcel} className={ui.ghostBtn} title="Exportar para Excel (.xlsx)">
              <Download className="h-3.5 w-3.5" />
              Exportar Excel
            </button>
            <button type="button" onClick={fetchCapacidades} disabled={isLoading} className={ui.ghostBtn} title="Recarregar dados da API de Capacidades">
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Sincronizando..." : "Atualizar dados"}
            </button>
          </div>
        </header>

        {/* FILTROS */}
        <AnimatePresence initial={false}>
          {showOptions && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className={`${ui.card} p-4 sm:p-5`}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="block">
                    <span className={ui.label}><Calendar className={ui.labelIcon} /> Semana</span>
                    <div className="flex items-center gap-1 rounded-xl bg-slate-500/5 dark:bg-slate-500/10 p-1">
                      <button type="button" onClick={handleSemanaAnterior} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-500/15 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer" title="Semana anterior (-7 dias)">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={handleSemanaAtual} className="flex-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-500/15 cursor-pointer" title="Ir para a semana atual">
                        Semana atual
                      </button>
                      <button type="button" onClick={handleSemanaSeguinte} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-500/15 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer" title="Próxima semana (+7 dias)">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="block">
                    <span className={ui.label}><Clock className={ui.labelIcon} /> Período (dom–sáb)</span>
                    <div className="flex items-center gap-1.5 rounded-xl bg-slate-500/5 dark:bg-slate-500/10 px-3 py-2 text-xs">
                      <input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => {
                          const startVal = e.target.value;
                          setDataInicio(startVal);
                          if (startVal) {
                            const d = parseISODate(startVal);
                            d.setDate(d.getDate() + 6);
                            setDataFim(formatDateToISO(d));
                          }
                        }}
                        className="min-w-0 flex-1 bg-transparent font-mono font-medium text-slate-800 dark:text-slate-100 outline-hidden cursor-pointer dark:[color-scheme:dark]"
                      />
                      <span className="text-slate-400">até</span>
                      <input
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        className="min-w-0 flex-1 bg-transparent font-mono font-medium text-slate-800 dark:text-slate-100 outline-hidden cursor-pointer dark:[color-scheme:dark]"
                      />
                    </div>
                  </div>
                  <label className="block">
                    <span className={ui.label}><Building2 className={ui.labelIcon} /> Centro de distribuição</span>
                    <select value={cdSelecionado} onChange={(e) => setCdSelecionado(e.target.value)} className={ui.select}>
                      <option value="all" className={optionClass}>Todos os CDs (consolidado)</option>
                      {CD_OPCOES.map((g) => (
                        <optgroup key={g.grupo} label={g.grupo} className={optionClass}>
                          {g.itens.map(([cdv, desc]) => (
                            <option key={cdv} value={cdv} className={optionClass}>CD {cdv} ({desc})</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className={ui.label}><Layers className={ui.labelIcon} /> Categoria</span>
                    <select value={categoriaSelecionada} onChange={(e) => setCategoriaSelecionada(e.target.value)} className={ui.select}>
                      <option value="all" className={optionClass}>
                        {cdSelecionado === "all" ? "Todas as categorias" : "Todas as categorias do CD"}
                      </option>
                      {CATEGORIAS_OPCOES.map((cat) => {
                        const isHomologada = cdSelecionado === "all" || cdPossuiCategoria(cdSelecionado, cat.val);
                        return (
                          <option key={cat.val} value={cat.val} className={optionClass}>
                            {cat.label} {cdSelecionado !== "all" ? (isHomologada ? "✓" : "(não opera)") : ""}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* CONTAINER PRINCIPAL */}
        <section className={`${ui.card} p-5 sm:p-6 space-y-6`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex p-1 rounded-xl bg-slate-500/10 dark:bg-slate-500/15" role="tablist" aria-label="Modo de diluição">
              <button
                type="button"
                role="tab"
                aria-selected={visualizacaoModo === "igualitaria"}
                onClick={() => setVisualizacaoModo("igualitaria")}
                className={ui.seg(visualizacaoModo === "igualitaria")}
                title="Diluição uniforme entre as 24 horas"
              >
                Diluição igualitária (24h)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={visualizacaoModo === "ponderada"}
                onClick={() => setVisualizacaoModo("ponderada")}
                className={ui.seg(visualizacaoModo === "ponderada")}
                title="Diluição ponderada pelas janelas operacionais de docas do Manhattan WMS"
              >
                Curva WMS
              </button>
            </div>
            <button type="button" onClick={handleRecalcular} disabled={isRecalculating} className={ui.primaryBtn} title="Recalcular a distribuição horária da semana">
              <Calculator className={`h-3.5 w-3.5 ${isRecalculating ? "animate-spin" : ""}`} />
              Recalcular grade
            </button>
          </div>

          {/* Aviso CD x categoria (padrão do banner de Capacidades) */}
          {isCdCategoriaIncompativel && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
              <span className="flex items-center gap-2">
                <Info className="h-4 w-4 shrink-0" />
                <span>
                  O <strong>CD {cdSelecionado}</strong> não opera a categoria <strong>{categoriaSelecionada}</strong> (homologadas:{" "}
                  {CD_CATEGORIAS_MAP[cdSelecionado]?.join(", ")}). Todos os horários retornam 0.
                </span>
              </span>
              <span className="rounded-lg bg-amber-500/15 px-2.5 py-1 font-semibold">Capacidade: 0 plts</span>
            </div>
          )}

          {!isTableMaximized && tableBlock}
        </section>
      </div>

      {/* TELA CHEIA */}
      {isTableMaximized && (
        <div className={`fixed inset-0 z-50 flex flex-col p-4 md:p-6 backdrop-blur-xl ${isDark ? "bg-slate-950/95" : "bg-slate-50/95"}`}>
          {tableBlock}
        </div>
      )}
    </div>
  );
}
