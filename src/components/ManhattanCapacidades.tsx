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

  return (
    <div
      className={`min-h-full w-full flex flex-col p-4 md:p-6 transition-colors duration-200 ${
        isDark ? "bg-[#070b14] text-slate-100" : "bg-[#f8fafc] text-slate-950"
      }`}
    >
      {/* ============================================================
          CABEÇALHO PRINCIPAL COM IDENTIFICAÇÃO E AÇÕES
          ============================================================ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1
                className={`text-2xl font-black tracking-tight ${
                  isDark ? "text-white" : "text-slate-950"
                }`}
              >
                Manhattan Capacidades
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                WMS Inbound
              </span>
            </div>
            
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Botão de Ocultar/Desocultar Opções */}
          <button
            onClick={() => setShowOptions((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
              showOptions
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
            title={showOptions ? "Ocultar painel de opções" : "Mostrar painel de opções"}
          >
            {showOptions ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                Ocultar Opções
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                Mostrar Opções
              </>
            )}
          </button>

          {/* Botão de Atualizar API */}
          <button
            onClick={fetchCapacidades}
            disabled={isLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
              isDark
                ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                : "bg-white hover:bg-slate-100 text-slate-900 border border-slate-300"
            }`}
            title="Recarregar dados da API de Capacidades"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-500" : ""}`}
            />
            {isLoading ? "Sincronizando..." : "Atualizar"}
          </button>

          {/* Botão Copiar */}


          {/* Botão Exportar Excel */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            title="Exportar para planilha Excel (.xlsx)"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar Excel
          </button>

          {/* Botão Maximizar Tabela */}
          <button
            onClick={() => setIsTableMaximized((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
              isTableMaximized
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : isDark
                ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                : "bg-white hover:bg-slate-100 text-slate-900 border border-slate-300"
            }`}
            title={
              isTableMaximized
                ? "Restaurar tamanho normal da tabela (Esc)"
                : "Maximizar visualização da tabela para tela cheia"
            }
          >
            {isTableMaximized ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                Restaurar Tabela
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-blue-500" />
                Maximizar Tabela
              </>
            )}
          </button>
        </div>
      </div>

      {/* ============================================================
          PAINEL DE OPÇÕES E CONTROLES (OCULTÁVEL)
          ============================================================ */}
      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div
              className={`rounded-2xl border transition-all shadow-xs ${
                isDark
                  ? "bg-[#0b101e] border-slate-800"
                  : "bg-white border-slate-200"
              }`}
            >
              <div className="p-4 sm:p-5 flex flex-col gap-4">
                {/* NÍVEL 1: NAVEGAÇÃO E SELETOR DE PERÍODO (SEMANA) */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                  {/* Lado Esquerdo: Controle de Semana com Stepper */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs font-black uppercase tracking-wider mr-1 ${
                        isDark ? "text-slate-300" : "text-slate-900"
                      }`}
                    >
                      Semana:
                    </span>

                    {/* Botões de Navegação de Semana */}
                    <div className="inline-flex items-center rounded-xl p-1 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
                      <button
                        onClick={handleSemanaAnterior}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                          isDark
                            ? "hover:bg-slate-800 text-slate-300 hover:text-white"
                            : "hover:bg-white text-slate-800 hover:text-slate-950 hover:shadow-2xs"
                        }`}
                        title="Semana Anterior (-7 dias)"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <button
                        onClick={handleSemanaAtual}
                        className="px-3 py-1 rounded-lg text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all flex items-center gap-1.5"
                        title="Ir para a semana atual vigente"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        Semana Atual
                      </button>

                      <button
                        onClick={handleSemanaSeguinte}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                          isDark
                            ? "hover:bg-slate-800 text-slate-300 hover:text-white"
                            : "hover:bg-white text-slate-800 hover:text-slate-950 hover:shadow-2xs"
                        }`}
                        title="Próxima Semana (+7 dias)"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Lado Direito: Caixa Limpa de Intervalo de Datas */}
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors ${
                        isDark
                          ? "bg-slate-900/80 border-slate-700/80 text-white"
                          : "bg-slate-50 border-slate-300/80 text-slate-950"
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          De
                        </span>
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
                          className={`bg-transparent font-mono font-black text-xs outline-hidden cursor-pointer ${
                            isDark ? "text-white" : "text-slate-950"
                          }`}
                        />
                        <span className="text-slate-400 font-bold px-0.5">até</span>
                        <input
                          type="date"
                          value={dataFim}
                          onChange={(e) => setDataFim(e.target.value)}
                          className={`bg-transparent font-mono font-black text-xs outline-hidden cursor-pointer ${
                            isDark ? "text-white" : "text-slate-950"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Tag com contagem de dias */}
                    <span
                      className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                        isDark
                          ? "bg-slate-800/60 text-slate-300 border-slate-700"
                          : "bg-slate-100 text-slate-800 border-slate-200"
                      }`}
                    >
                      7 dias (Dom-Sáb)
                    </span>
                  </div>
                </div>

                {/* NÍVEL 2: FILTROS DE CD/CATEGORIA + MODO + AÇÃO PRINCIPAL */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Filtros de CD e Categoria */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Dropdown Centro de Distribuição */}
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                          isDark
                            ? "bg-slate-900 border-slate-700 text-white"
                            : "bg-slate-50 border-slate-300 text-slate-950"
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                          CD:
                        </span>
                        <select
                          value={cdSelecionado}
                          onChange={(e) => setCdSelecionado(e.target.value)}
                          className="bg-transparent font-bold outline-hidden cursor-pointer pr-1"
                        >
                          <option value="all" className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-950"}>
                            Todos os Centros (Consolidado)
                          </option>
                          <optgroup label="São Paulo / Matriz" className={isDark ? "bg-slate-900 text-slate-300" : "bg-slate-100 text-slate-700"}>
                            <option value="1965" className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-950"}>
                              CD 1965 (Mercearia)
                            </option>
                            <option value="1942" className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-950"}>
                              CD 1942 (Perecíveis)
                            </option>
                            <option value="930" className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-950"}>
                              CD 930 (FLV, Insumos/Emb, Mercearia)
                            </option>
                            <option value="7801" className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-950"}>
                              CD 7801 (Bazar)
                            </option>
                            <option value="941" className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-950"}>
                              CD 941 (Suprimentos)
                            </option>
                          </optgroup>
                          <optgroup label="Centros Regionais" className={isDark ? "bg-slate-900 text-slate-300" : "bg-slate-100 text-slate-700"}>
                            <option value="409" className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-950"}>
                              CD 409 (Mercearia, Perecíveis, FLV)
                            </option>
                            <option value="1974" className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-950"}>
                              CD 1974 (Mercearia, Perecíveis, FLV)
                            </option>
                            <option value="1979" className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-950"}>
                              CD 1979 (Mercearia, Perecíveis, FLV)
                            </option>
                            <option value="1984" className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-950"}>
                              CD 1984 (Perecíveis, FLV)
                            </option>
                            <option value="1953" className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-950"}>
                              CD 1953 (Mercearia)
                            </option>
                          </optgroup>
                        </select>
                      </div>
                    </div>

                    {/* Dropdown Categoria Inbound */}
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                          isDark
                            ? "bg-slate-900 border-slate-700 text-white"
                            : "bg-slate-50 border-slate-300 text-slate-950"
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                          Categoria:
                        </span>
                        <select
                          value={categoriaSelecionada}
                          onChange={(e) => setCategoriaSelecionada(e.target.value)}
                          className="bg-transparent font-bold outline-hidden cursor-pointer pr-1"
                        >
                          <option value="all" className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-950"}>
                            {cdSelecionado === "all" ? "Todas Categorias" : "Todas as Categorias do CD"}
                          </option>
                          {[
                            { val: "Mercearia", label: "Mercearia" },
                            { val: "Perecíveis", label: "Perecíveis" },
                            { val: "FLV", label: "FLV (Frutas, Legumes, Verduras)" },
                            { val: "Bazar", label: "Bazar" },
                            { val: "Insumos/Embalagens", label: "Insumos/Embalagens" },
                            { val: "Suprimentos", label: "Suprimentos" },
                          ].map((cat) => {
                            const isHomologada = cdSelecionado === "all" || cdPossuiCategoria(cdSelecionado, cat.val);
                            return (
                              <option
                                key={cat.val}
                                value={cat.val}
                                className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-950"}
                              >
                                {cat.label} {cdSelecionado !== "all" ? (isHomologada ? "✓" : "(Não opera - Retorna 0)") : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Lado Direito: Segmented Modo de Visualização + Botão Recalcular */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Segmented Control de Visualização */}
                    <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <button
                        onClick={() => setVisualizacaoModo("igualitaria")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                          visualizacaoModo === "igualitaria"
                            ? "bg-blue-600 text-white shadow-xs"
                            : isDark
                            ? "text-slate-400 hover:text-white"
                            : "text-slate-700 hover:text-slate-950"
                        }`}
                        title="Diluição uniforme entre as 24 horas: conserva rigorosamente o total de inbound (ex: 150 plts)"
                      >
                        Diluição Igualitária (24h)
                      </button>
                      <button
                        onClick={() => setVisualizacaoModo("ponderada")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                          visualizacaoModo === "ponderada"
                            ? "bg-blue-600 text-white shadow-xs"
                            : isDark
                            ? "text-slate-400 hover:text-white"
                            : "text-slate-700 hover:text-slate-950"
                        }`}
                        title="Diluição ponderada pelas janelas operacionais de docas Manhattan WMS com conservação exata da capacidade"
                      >
                        Diluição por Curva WMS
                      </button>
                    </div>

                    {/* Botão Principal de Recalcular */}
                    <button
                      onClick={handleRecalcular}
                      disabled={isRecalculating}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-md shadow-blue-500/20 transition-all active:scale-95 shrink-0"
                      title="Recalcular a distribuição horária da semana selecionada"
                    >
                      <Calculator
                        className={`w-4 h-4 ${isRecalculating ? "animate-spin" : ""}`}
                      />
                      <span>Recalcular Grade</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alerta de Incompatibilidade CD x Categoria */}
      {isCdCategoriaIncompativel && (
        <div className="mb-5 p-4 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <span>
                O <strong>CD {cdSelecionado}</strong> não opera a categoria <strong>"{categoriaSelecionada}"</strong> (categorias homologadas para este CD:{" "}
                <span className="underline">{CD_CATEGORIAS_MAP[cdSelecionado]?.join(", ")}</span>).
              </span>
              <p className="text-[11px] font-normal text-amber-800 dark:text-amber-300 mt-0.5">
                Conforme a regra operacional estrita de amarração, todos os horários retornam exatamente 0.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-lg bg-amber-200/90 dark:bg-amber-900/80 text-[11px] font-black tracking-wider uppercase shrink-0 text-center">
            Capacidade: 0 plts
          </span>
        </div>
      )}

      {/* ============================================================
          TABELA MANHATTAN CAPACIDADES
          ============================================================ */}
      <div
        className={`${
          isTableMaximized
            ? "fixed inset-0 z-50 p-4 md:p-6 flex flex-col backdrop-blur-xl " +
              (isDark ? "bg-[#070b14]/98" : "bg-slate-100/98")
            : "flex-1 rounded-xl border overflow-hidden flex flex-col transition-colors " +
              (isDark ? "bg-[#0b101e] border-slate-800" : "bg-white border-slate-200 shadow-sm")
        }`}
      >
        {/* Barra Superior da Tabela com Status e Botão Maximizar / Restaurar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/80 rounded-t-xl shrink-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-100">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Grade Horária Manhattan</span>
            </div>

            {isTableMaximized && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Tela Cheia (Maximizado)
              </span>
            )}

            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              • {weekDays[0].labelDisplay} a {weekDays[6].labelDisplay}
            </span>

            {cdSelecionado !== "all" && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                CD {cdSelecionado}
              </span>
            )}

            {categoriaSelecionada !== "all" && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                {categoriaSelecionada}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Se maximizado, atalhos rápidos de cópia e exportação */}
            {isTableMaximized && (
              <>
                <button
                  onClick={handleCopyClipboard}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                    isDark
                      ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                      : "bg-white hover:bg-slate-100 text-slate-900 border border-slate-300"
                  }`}
                  title="Copiar grade no formato TSV"
                >
                  {copiedSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copiar
                    </>
                  )}
                </button>

                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                  title="Exportar para planilha Excel (.xlsx)"
                >
                  <Download className="w-3.5 h-3.5" />
                  Excel
                </button>
              </>
            )}

            {/* Botão de Maximizar / Restaurar */}
            <button
              onClick={() => setIsTableMaximized(!isTableMaximized)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all border ${
                isTableMaximized
                  ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-500 shadow-sm"
                  : isDark
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                  : "bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 shadow-2xs"
              }`}
              title={
                isTableMaximized
                  ? "Restaurar tamanho normal da tabela (Pressione Esc)"
                  : "Maximizar visualização da tabela para tela cheia"
              }
            >
              {isTableMaximized ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Restaurar (Esc)</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>Maximizar Tabela</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[760px]">
            {/* CABEÇALHO DA TABELA */}
            <thead>
              <tr
                className={`text-xs uppercase tracking-wider font-black border-b sticky top-0 z-10 ${
                  isDark
                    ? "bg-[#0f172a] text-slate-200 border-slate-800"
                    : "bg-slate-100 text-slate-950 border-slate-300"
                }`}
              >
                <th className="py-3 px-3.5 font-black w-36 border-r border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Horário
                  </div>
                </th>

                {weekDays.map((d, idx) => (
                  <th
                    key={d.dateStr}
                    className={`py-3 px-3 text-center border-r border-slate-200 dark:border-slate-800 ${
                      idx === 0 || idx === 6
                        ? isDark
                          ? "bg-slate-900/60 text-slate-300"
                          : "bg-slate-100/90 text-slate-900"
                        : ""
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="font-black">{d.nomeDia}</span>
                      <span className="text-[10px] font-mono font-semibold opacity-75">
                        {d.dateStr.slice(8, 10)}/{d.dateStr.slice(5, 7)}
                      </span>
                    </div>
                  </th>
                ))}

                <th className="py-3 px-3 text-center font-black text-blue-600 dark:text-blue-400">
                  Total Horário
                </th>
              </tr>
            </thead>

            {/* CORPO COM AS 24 FAIXAS HORÁRIAS */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-xs">
              {computedTableData.map((row, rIdx) => {
                const isZeroRow = row.totalHorario === 0;

                return (
                  <tr
                    key={row.horario}
                    className={`transition-colors ${
                      isZeroRow
                        ? isDark
                          ? "bg-slate-950/20 text-slate-500"
                          : "bg-slate-50/50 text-slate-400"
                        : isDark
                        ? "hover:bg-slate-800/40 text-slate-100"
                        : "hover:bg-blue-50/40 text-slate-950 font-bold"
                    }`}
                  >
                    {/* Coluna Horário */}
                    <td className="py-2 px-3.5 font-bold border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                          isZeroRow
                            ? "text-slate-400 dark:text-slate-600 font-normal"
                            : isDark
                            ? "bg-slate-800/70 text-slate-200"
                            : "bg-slate-100 text-slate-900 font-bold"
                        }`}
                      >
                        {row.horario}
                      </span>
                    </td>

                    {/* Domingo */}
                    <td
                      className={`py-2 px-3 text-center border-r border-slate-200 dark:border-slate-800 ${
                        row.domingo >= 15
                          ? isDark
                            ? "bg-purple-950/30 text-purple-300 font-black"
                            : "bg-purple-50 text-purple-950 font-black"
                          : row.domingo > 0
                          ? isDark
                            ? "text-white font-bold"
                            : "text-slate-950 font-black"
                          : "text-slate-400 dark:text-slate-600"
                      }`}
                    >
                      {row.domingo}
                    </td>

                    {/* Segunda */}
                    <td
                      className={`py-2 px-3 text-center border-r border-slate-200 dark:border-slate-800 ${
                        row.segunda >= 15
                          ? isDark
                            ? "bg-purple-950/30 text-purple-300 font-black"
                            : "bg-purple-50 text-purple-950 font-black"
                          : row.segunda > 0
                          ? isDark
                            ? "text-white font-bold"
                            : "text-slate-950 font-black"
                          : "text-slate-400 dark:text-slate-600"
                      }`}
                    >
                      {row.segunda}
                    </td>

                    {/* Terça */}
                    <td
                      className={`py-2 px-3 text-center border-r border-slate-200 dark:border-slate-800 ${
                        row.terca >= 15
                          ? isDark
                            ? "bg-purple-950/30 text-purple-300 font-black"
                            : "bg-purple-50 text-purple-950 font-black"
                          : row.terca > 0
                          ? isDark
                            ? "text-white font-bold"
                            : "text-slate-950 font-black"
                          : "text-slate-400 dark:text-slate-600"
                      }`}
                    >
                      {row.terca}
                    </td>

                    {/* Quarta */}
                    <td
                      className={`py-2 px-3 text-center border-r border-slate-200 dark:border-slate-800 ${
                        row.quarta >= 15
                          ? isDark
                            ? "bg-purple-950/30 text-purple-300 font-black"
                            : "bg-purple-50 text-purple-950 font-black"
                          : row.quarta > 0
                          ? isDark
                            ? "text-white font-bold"
                            : "text-slate-950 font-black"
                          : "text-slate-400 dark:text-slate-600"
                      }`}
                    >
                      {row.quarta}
                    </td>

                    {/* Quinta */}
                    <td
                      className={`py-2 px-3 text-center border-r border-slate-200 dark:border-slate-800 ${
                        row.quinta >= 15
                          ? isDark
                            ? "bg-purple-950/30 text-purple-300 font-black"
                            : "bg-purple-50 text-purple-950 font-black"
                          : row.quinta > 0
                          ? isDark
                            ? "text-white font-bold"
                            : "text-slate-950 font-black"
                          : "text-slate-400 dark:text-slate-600"
                      }`}
                    >
                      {row.quinta}
                    </td>

                    {/* Sexta */}
                    <td
                      className={`py-2 px-3 text-center border-r border-slate-200 dark:border-slate-800 ${
                        row.sexta >= 15
                          ? isDark
                            ? "bg-purple-950/30 text-purple-300 font-black"
                            : "bg-purple-50 text-purple-950 font-black"
                          : row.sexta > 0
                          ? isDark
                            ? "text-white font-bold"
                            : "text-slate-950 font-black"
                          : "text-slate-400 dark:text-slate-600"
                      }`}
                    >
                      {row.sexta}
                    </td>

                    {/* Sábado */}
                    <td
                      className={`py-2 px-3 text-center border-r border-slate-200 dark:border-slate-800 ${
                        row.sabado >= 15
                          ? isDark
                            ? "bg-purple-950/30 text-purple-300 font-black"
                            : "bg-purple-50 text-purple-950 font-black"
                          : row.sabado > 0
                          ? isDark
                            ? "text-white font-bold"
                            : "text-slate-950 font-black"
                          : "text-slate-400 dark:text-slate-600"
                      }`}
                    >
                      {row.sabado}
                    </td>

                    {/* Total Horário */}
                    <td
                      className={`py-2 px-3 text-center font-black ${
                        isZeroRow
                          ? "text-slate-400 dark:text-slate-600"
                          : "text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {row.totalHorario}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* RODAPÉ COM TOTAL DO DIA */}
            <tfoot>
              <tr
                className={`font-black text-xs border-t-2 ${
                  isDark
                    ? "bg-[#0f172a] text-slate-100 border-slate-700"
                    : "bg-slate-100 text-slate-950 border-slate-300"
                }`}
              >
                <td className="py-3 px-3.5 uppercase tracking-wide border-r border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 font-black text-slate-900 dark:text-slate-100">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Total do Dia
                  </div>
                </td>

                {columnTotals.map((tot, idx) => (
                  <td
                    key={idx}
                    className="py-3 px-3 text-center font-black text-sm font-mono border-r border-slate-200 dark:border-slate-800"
                  >
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded ${
                        isDark
                          ? "bg-slate-800 text-white"
                          : "bg-white text-slate-950 shadow-2xs border border-slate-200"
                      }`}
                    >
                      {tot.toLocaleString("pt-BR")}
                    </span>
                  </td>
                ))}

                <td className="py-3 px-3 text-center font-black text-base font-mono text-blue-600 dark:text-blue-400">
                  {stats.totalSemana.toLocaleString("pt-BR")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Rodapé Informativo */}
        <div
          className={`p-3 text-[11px] font-medium border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
            isDark
              ? "bg-[#090d18] border-slate-800 text-slate-400"
              : "bg-slate-50 border-slate-200 text-slate-700"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>
              <strong>Cálculo 100% Exato:</strong> A soma das 24 horas conserva com precisão matemática o total de Inbound da API (ex: 150 plts diluídos rigorosamente).
              {lastSync && ` Última sincronização: ${lastSync}.`}
            </span>
          </div>
          <div className="font-mono text-slate-500 dark:text-slate-400 text-right">
            Período: {weekDays[0].labelDisplay} a {weekDays[6].labelDisplay}
          </div>
        </div>
      </div>
    </div>
  );
}