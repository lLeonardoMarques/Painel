import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  Filler
} from "chart.js";
import { Chart, getElementAtEvent } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ChartTitle,
  ChartTooltip,
  ChartLegend,
  Filler,
  ChartDataLabels
);

import {
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Boxes,
  Truck,
  CornerDownRight,
  BarChart2,
  Database,
  ArrowUpRight,
  Info,
  Building,
  Package,
  SlidersHorizontal,
  X,
  Gauge,
  Sliders,
  Layers
} from "lucide-react";

interface InboundRecord {
  data: string;
  cd: number;
  categoria: string;
  recebido: number;
  agendado: number;
  capacidade: number;
  agendamentoECapacidade: boolean;
  noShow: number;
  agendasSistema: number;
}

import { User } from "../types";

interface Dashboard2Props {
  theme: "light" | "dark";
  showNotification: (msg: string) => void;
  user?: User | null;
}

const MONTH_NAMES: Record<string, string> = {
  "01": "Janeiro",
  "02": "Fevereiro",
  "03": "Março",
  "04": "Abril",
  "05": "Maio",
  "06": "Junho",
  "07": "Julho",
  "08": "Agosto",
  "09": "Setembro",
  "10": "Outubro",
  "11": "Novembro",
  "12": "Dezembro"
};
// Global memory cache to persist performance data across tab switches (Stale-While-Revalidate pattern)
let cachedInboundData: InboundRecord[] | null = null;

export default function Dashboard2({ theme, showNotification, user }: Dashboard2Props) {
  const [data, setData] = useState<InboundRecord[]>(() => cachedInboundData || []);
  const [loading, setLoading] = useState<boolean>(!cachedInboundData);
  const [error, setError] = useState<string | null>(null);
  const [apiSource, setApiSource] = useState<"api" | "local_fallback">("api");
  
  // Dynamic filter states (selectedCd starts as empty string, defaulted to the first CD in list)
  const [selectedCd, setSelectedCd] = useState<string>("");
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });
  
  // Chart Drilldown State: Click on any bar/line element to filter the entire dashboard by that date
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // Weekly filter state
  const [selectedWeek, setSelectedWeek] = useState<string>("all");
  const [showFilters, setShowFilters] = useState<boolean>(true);
  const [showDetailTable, setShowDetailTable] = useState<boolean>(false);
  const [showCards, setShowCards] = useState<boolean>(true);

  const chartRef = useRef<any>(null);

  const handleChartClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!chartRef.current) return;
    const activeElements = getElementAtEvent(chartRef.current, event);
    if (activeElements.length > 0) {
      const dataIndex = activeElements[0].index;
      const clickedRecord = filteredDataDropdowns[dataIndex];
      if (clickedRecord) {
        // Toggle date drilldown selection
        setSelectedDate(prev => prev === clickedRecord.data ? null : clickedRecord.data);
      }
    }
  };

  // Fetch from our same-origin backend proxy route
  const fetchData = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const headers: Record<string, string> = {
        "Accept": "application/json"
      };
      if (user?.token) {
        headers["Authorization"] = `Bearer ${user.token}`;
      }

      const response = await fetch("/api/dashboard/inbound", {
        method: "GET",
        headers
      });

      if (!response.ok) {
        throw new Error(`Erro de rede: status ${response.status}`);
      }

      const parsedArray = await response.json();

      if (Array.isArray(parsedArray) && parsedArray.length > 0) {
        setData(parsedArray);
        cachedInboundData = parsedArray; // Update global cache
        setApiSource("api");
        if (!silent) {
          showNotification("📥 Dados do Dashboard Inbound carregados com sucesso!");
        }
      } else {
        throw new Error("Formato de dados recebido é inválido ou array vazio.");
      }
    } catch (err) {
      console.warn("⚠️ API Inbound offline ou erro de rede. Usando fallback de alta fidelidade.", err);
      // Fallback direct JSON in case of failure (matches high fidelity GPA data)
      const fallbackInboundDashboard: InboundRecord[] = [
        {"data":"2026-06-01","cd":1965,"categoria":"Mercearia","recebido":35,"agendado":138,"capacidade":100,"agendamentoECapacidade":true,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-02","cd":1965,"categoria":"Mercearia","recebido":75,"agendado":119,"capacidade":100,"agendamentoECapacidade":true,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-03","cd":1965,"categoria":"Mercearia","recebido":90,"agendado":90,"capacidade":100,"agendamentoECapacidade":false,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-04","cd":1965,"categoria":"Mercearia","recebido":91,"agendado":8,"capacidade":100,"agendamentoECapacidade":false,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-05","cd":1965,"categoria":"Mercearia","recebido":100,"agendado":91,"capacidade":100,"agendamentoECapacidade":false,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-06","cd":1965,"categoria":"Mercearia","recebido":81,"agendado":51,"capacidade":60,"agendamentoECapacidade":false,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-08","cd":1965,"categoria":"Mercearia","recebido":63,"agendado":73,"capacidade":100,"agendamentoECapacidade":true,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-09","cd":1965,"categoria":"Mercearia","recebido":85,"agendado":84,"capacidade":100,"agendamentoECapacidade":true,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-10","cd":1965,"categoria":"Mercearia","recebido":77,"agendado":92,"capacidade":100,"agendamentoECapacidade":true,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-11","cd":1965,"categoria":"Mercearia","recebido":83,"agendado":98,"capacidade":100,"agendamentoECapacidade":true,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-12","cd":1965,"categoria":"Mercearia","recebido":100,"agendado":117,"capacidade":100,"agendamentoECapacidade":true,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-13","cd":1965,"categoria":"Mercearia","recebido":56,"agendado":4,"capacidade":100,"agendamentoECapacidade":true,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-14","cd":1965,"categoria":"Mercearia","recebido":5,"agendado":2,"capacidade":100,"agendamentoECapacidade":true,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-15","cd":1965,"categoria":"Mercearia","recebido":70,"agendado":108,"capacidade":100,"agendamentoECapacidade":true,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-16","cd":1965,"categoria":"Mercearia","recebido":108,"agendado":102,"capacidade":100,"agendamentoECapacidade":true,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-17","cd":1965,"categoria":"Mercearia","recebido":106,"agendado":101,"capacidade":100,"agendamentoECapacidade":true,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-18","cd":1965,"categoria":"Mercearia","recebido":72,"agendado":69,"capacidade":100,"agendamentoECapacidade":true,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-19","cd":1965,"categoria":"Mercearia","recebido":63,"agendado":62,"capacidade":100,"agendamentoECapacidade":true,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-20","cd":1965,"categoria":"Mercearia","recebido":59,"agendado":34,"capacidade":100,"agendamentoECapacidade":true,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-22","cd":1965,"categoria":"Mercearia","recebido":44,"agendado":63,"capacidade":100,"agendamentoECapacidade":true,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-23","cd":1965,"categoria":"Mercearia","recebido":82,"agendado":86,"capacidade":100,"agendamentoECapacidade":true,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-24","cd":1965,"categoria":"Mercearia","recebido":61,"agendado":65,"capacidade":100,"agendamentoECapacidade":true,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-25","cd":1965,"categoria":"Mercearia","recebido":72,"agendado":70,"capacidade":100,"agendamentoECapacidade":true,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-26","cd":1965,"categoria":"Mercearia","recebido":82,"agendado":103,"capacidade":100,"agendamentoECapacidade":true,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-27","cd":1965,"categoria":"Mercearia","recebido":79,"agendado":40,"capacidade":100,"agendamentoECapacidade":true,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-28","cd":1965,"categoria":"Mercearia","recebido":10,"agendado":1,"capacidade":100,"agendamentoECapacidade":true,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-29","cd":1965,"categoria":"Mercearia","recebido":41,"agendado":56,"capacidade":100,"agendamentoECapacidade":true,"noShow":1,"agendasSistema":10},
        {"data":"2026-06-30","cd":1965,"categoria":"Mercearia","recebido":60,"agendado":80,"capacidade":100,"agendamentoECapacidade":true,"noShow":1,"agendasSistema":10}
      ];
      setData(prev => {
        const newData = prev.length > 0 ? prev : fallbackInboundDashboard;
        cachedInboundData = newData; // Save fallback to cache
        return newData;
      });
      setApiSource("local_fallback");
      if (!silent) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // If we have cached data, fetch silently in the background (Stale-While-Revalidate)
    const silentFetch = !!cachedInboundData;
    fetchData(silentFetch);
    const interval = setInterval(() => {
      fetchData(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Extract unique options dynamically for filters
  const cdsList = useMemo(() => {
    const list = new Set<string>();
    data.forEach(item => {
      if (item.cd) list.add(String(item.cd));
    });
    return Array.from(list).sort();
  }, [data]);

  // Enforce single active CD selection (no "all" allowed)
  useEffect(() => {
    if (cdsList.length > 0 && (!selectedCd || selectedCd === "all")) {
      setSelectedCd(cdsList[0]);
    }
  }, [cdsList, selectedCd]);

  // Helper to determine if date is Weekend (Saturday or Sunday)
  const isWeekendDay = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const parts = dateStr.split("-");
    let d: Date;
    if (parts.length === 3) {
      d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    } else {
      d = new Date(dateStr);
    }
    const day = d.getDay(); // 0 = Sunday, 6 = Saturday
    return day === 0 || day === 6;
  };

  // Helper to calculate week of the month (1 to 6) based on Monday to Sunday weeks
  const getWeekOfMonth = (dateStr: string): number => {
    if (!dateStr) return 1;
    const parts = dateStr.split("-");
    if (parts.length < 3) return 1;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const day = parseInt(parts[2], 10);

    const firstDayOfMonth = new Date(year, month, 1);
    const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // Adjust so that Monday is 0, Tuesday is 1, ..., Sunday is 6
    const firstDayAdjusted = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    return Math.ceil((day + firstDayAdjusted) / 7);
  };

  const categoriesList = useMemo(() => {
    const list = new Set<string>();
    data.forEach(item => {
      if (item.categoria) list.add(item.categoria);
    });
    return Array.from(list).sort();
  }, [data]);

  const monthsList = useMemo(() => {
    const list = new Set<string>();
    
    // Always include the current month in the list so it is selectable
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    list.add(`${year}-${month}`);

    data.forEach(item => {
      if (item.data) {
        const parts = item.data.split("-");
        if (parts.length >= 2) {
          list.add(`${parts[0]}-${parts[1]}`); // YYYY-MM
        }
      }
    });
    return Array.from(list).sort();
  }, [data]);

  // Formatter for month selection label
  const formatMonthLabel = (mKey: string) => {
    const parts = mKey.split("-");
    if (parts.length === 2) {
      const name = MONTH_NAMES[parts[1]] || parts[1];
      return `${name}/${parts[0]}`;
    }
    return mKey;
  };

  // Stage 1 Filter: filtered by Dropdown selections only (This goes to the Chart!)
  const filteredDataDropdowns = useMemo(() => {
    return data.filter(item => {
      // CD filter (always active, single CD)
      if (selectedCd && String(item.cd) !== selectedCd) return false;
      
      // Category filter
      if (selectedCat !== "all" && item.categoria !== selectedCat) return false;

      // Month filter
      if (selectedMonth !== "all") {
        const parts = item.data.split("-");
        const itemMonthKey = `${parts[0]}-${parts[1]}`;
        if (itemMonthKey !== selectedMonth) return false;
      }

      // Week filter
      if (selectedWeek !== "all") {
        const itemWeek = getWeekOfMonth(item.data);
        if (String(itemWeek) !== selectedWeek) return false;
      }

      return true;
    });
  }, [data, selectedCd, selectedCat, selectedMonth, selectedWeek]);

  // Stage 2 Filter: further filtered by Drilldown / Chart selection (This goes to the Cards & Tables!)
  const filteredData = useMemo(() => {
    if (selectedDate) {
      return filteredDataDropdowns.filter(item => item.data === selectedDate);
    }
    return filteredDataDropdowns;
  }, [filteredDataDropdowns, selectedDate]);

  // Main KPI Calculations (considering weekends for all cards, EXCEPT Media and Max)
  const stats = useMemo(() => {
    // Weekday-only records for Media and Max Recebido calculations
    const weekdayRecords = filteredData.filter(item => !isWeekendDay(item.data));

    // 1. Calculations for all records in filteredData (which considers Saturdays & Sundays)
    let sumCapacidade = 0;
    let sumAgendado = 0;
    let sumRecebido = 0;
    let sumAgendasSistema = 0;
    let sumNoShow = 0;
    let daysInMeta = 0;

    filteredData.forEach(item => {
      const cap = item.capacidade;
      const agen = item.agendado;
      const rec = item.recebido;

      sumCapacidade += cap;
      sumAgendado += agen;
      sumRecebido += rec;
      sumAgendasSistema += (item.agendasSistema || 0);
      sumNoShow += (item.noShow || 0);

      const isOver = item.agendamentoECapacidade;

      if (!isOver) {
        daysInMeta++;
      }
    });

    const pctDiasNaMeta = filteredData.length > 0 ? Math.round((daysInMeta / filteredData.length) * 100) : 0;
    
    // Total No-Show / Total Agenda G.A
    const noShowPct = sumAgendasSistema > 0 ? Math.round((sumNoShow / sumAgendasSistema) * 100) : 0;

    // 2. Weekday-only calculations for Media & Max Recebido
    let sumRecebidoWeekdays = 0;
    let maxRecebido = 0;

    weekdayRecords.forEach(item => {
      const rec = item.recebido;
      sumRecebidoWeekdays += rec;
      if (rec > maxRecebido) {
        maxRecebido = rec;
      }
    });

    const mediaRecebido = weekdayRecords.length > 0 ? Math.round(sumRecebidoWeekdays / weekdayRecords.length) : 0;

    // Total aggregate overload percentage
    const totalExcessoVolume = sumAgendado > sumCapacidade && sumCapacidade > 0 
      ? Math.round(((sumAgendado - sumCapacidade) / sumCapacidade) * 100) 
      : 0;

    return {
      sumCapacidade,
      sumAgendado,
      sumRecebido,
      sumAgendasSistema,
      sumNoShow,
      noShowPct,
      mediaRecebido,
      maxRecebido,
      pctDiasNaMeta,
      totalExcessoVolume,
      allDaysCount: filteredData.length,
      weekdayCount: weekdayRecords.length
    };
  }, [filteredData]);

  const isDarkMode = theme === "dark";

  // Chart configuration (visualizes the Stage 1 filteredDataDropdowns to allow PowerBI-style drilldown click selections)
  const chartData = useMemo(() => {
    const labels = filteredDataDropdowns.map(item => {
      const parts = item.data.split("-");
      const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : item.data;
      return label;
    });

    // Color code agendado line based on overload status
    const agendadoBorderColors = filteredDataDropdowns.map(item => {
      const isOver = item.agendamentoECapacidade;
      const isDimmed = selectedDate !== null && item.data !== selectedDate;
      const alpha = isDimmed ? "0.15" : "1";
      return isOver ? `rgba(239, 68, 68, ${alpha})` : `rgba(139, 92, 246, ${alpha})`;
    });

    const agendadoBgColors = filteredDataDropdowns.map(item => {
      const isOver = item.agendamentoECapacidade;
      const isDimmed = selectedDate !== null && item.data !== selectedDate;
      const alpha = isDimmed ? "0.15" : "0.75";
      return isOver ? `rgba(239, 68, 68, ${alpha})` : `rgba(139, 92, 246, ${alpha})`;
    });

    const recebidoBgColors = filteredDataDropdowns.map(item => {
      const isOver = item.agendamentoECapacidade;
      const isDimmed = selectedDate !== null && item.data !== selectedDate;
      const alpha = isDimmed ? "0.15" : "0.75";
      // Rule true / false: true (overload) = red, false (normal) = green
      return isOver ? `rgba(239, 68, 68, ${alpha})` : `rgba(34, 197, 94, ${alpha})`;
    });

    const recebidoBorderColors = filteredDataDropdowns.map(item => {
      const isOver = item.agendamentoECapacidade;
      const isDimmed = selectedDate !== null && item.data !== selectedDate;
      const alpha = isDimmed ? "0.15" : "1";
      return isOver ? `rgba(239, 68, 68, ${alpha})` : `rgba(34, 197, 94, ${alpha})`;
    });

    const agendaSistemaBorderColors = filteredDataDropdowns.map(item => {
      const isDimmed = selectedDate !== null && item.data !== selectedDate;
      const alpha = isDimmed ? "0.15" : "1";
      return `rgba(6, 182, 212, ${alpha})`; // Elegant Cyan/Teal for Agenda G.A
    });

    const agendaSistemaBgColors = filteredDataDropdowns.map(item => {
      const isDimmed = selectedDate !== null && item.data !== selectedDate;
      const alpha = isDimmed ? "0.15" : "0.75";
      return `rgba(6, 182, 212, ${alpha})`;
    });

    return {
      labels,
      datasets: [
        {
          type: "line" as const,
          label: "Capacidade In",
          data: filteredDataDropdowns.map(item => item.capacidade),
          borderColor: filteredDataDropdowns.map(item => {
            const isDimmed = selectedDate !== null && item.data !== selectedDate;
            return isDimmed ? "rgba(249, 115, 22, 0.15)" : "#f97316";
          }),
          backgroundColor: "rgba(249, 115, 22, 0.02)",
          borderWidth: 3,
          // borderDash: [5, 5], // Sleek dashed line for target/meta reference
          pointBackgroundColor: "#f97316",
          pointBorderColor: "#ffffff",
          pointRadius: filteredDataDropdowns.map(item => selectedDate && item.data === selectedDate ? 6 : 3), // Subtle dot
          pointHoverRadius: 5,
          tension: 0.15,
          order: 1,
          fill: false,
          datalabels: {
            display: "auto",
            align: "top" as const,
            anchor: "end" as const,
            color: isDarkMode ? "#f97316" : "#c2410c",
            offset: 4,
            font: {
              family: "JetBrains Mono, monospace",
              size: 9,
              weight: "bold" as const
            },
            formatter: (val: any, ctx: any) => {
              const isLast = ctx.dataIndex === ctx.dataset.data.length - 1;
              const item = filteredDataDropdowns[ctx.dataIndex];
              if (selectedDate) {
                if (item?.data === selectedDate) return `Meta: ${val}`;
                return "";
              }
              return isLast ? `Meta: ${val}` : "";
            }
          }
        },
        {
          type: "line" as const,
          label: "Agendado",
          data: filteredDataDropdowns.map(item => item.agendado),
          backgroundColor: agendadoBgColors,
          borderColor: agendadoBorderColors,
          borderWidth: 2,
          pointBackgroundColor: "#8b5cf6",
          pointBorderColor: "#ffffff",
          pointRadius: filteredDataDropdowns.map(item => selectedDate && item.data === selectedDate ? 6 : 3), // Subtle dot
          pointHoverRadius: 5,
          tension: 0.15,
          order: 2,
          fill: false,
          datalabels: {
            display: "auto",
            align: "top" as const,
            anchor: "end" as const,
            color: isDarkMode ? "#c084fc" : "#6b21a8",
            offset: 2,
            font: {
              family: "JetBrains Mono, monospace",
              size: 9,
              weight: "bold" as const
            },
            formatter: (val: any, ctx: any) => {
              if (val === 0) return "";
              const item = filteredDataDropdowns[ctx.dataIndex];
              if (selectedDate !== null && item?.data !== selectedDate) return "";
              return val;
            }
          }
        },
        {
          type: "line" as const,
          label: "Agenda G.A",
          data: filteredDataDropdowns.map(item => item.agendasSistema || 0),
          backgroundColor: agendaSistemaBgColors,
          borderColor: agendaSistemaBorderColors,
          borderWidth: 2,
          pointBackgroundColor: "#06b6d4",
          pointBorderColor: "#ffffff",
          pointRadius: filteredDataDropdowns.map(item => selectedDate && item.data === selectedDate ? 6 : 3), // Subtle dot
          pointHoverRadius: 5,
          tension: 0.15,
          order: 3,
          fill: false,
          datalabels: {
            display: "auto",
            align: "top" as const,
            anchor: "end" as const,
            color: isDarkMode ? "#22d3ee" : "#0891b2",
            offset: 2,
            font: {
              family: "JetBrains Mono, monospace",
              size: 9,
              weight: "bold" as const
            },
            formatter: (val: any, ctx: any) => {
              if (val === 0) return "";
              const item = filteredDataDropdowns[ctx.dataIndex];
              if (selectedDate !== null && item?.data !== selectedDate) return "";
              return val;
            }
          }
        },
        {
          type: "bar" as const,
          label: "Recebidos ",
          data: filteredDataDropdowns.map(item => item.recebido),
          backgroundColor: recebidoBgColors,
          borderColor: recebidoBorderColors,
          borderWidth: 2,
          borderRadius: 6,
          barPercentage: 0.75,
          categoryPercentage: 0.75,
          order: 4,
          datalabels: {
            display: "auto",
            align: "top" as const,
            anchor: "end" as const,
            color: isDarkMode ? "#38bdf8" : "#0369a1",
            offset: 2,
            font: {
              family: "JetBrains Mono, monospace",
              size: 9,
              weight: "bold" as const
            },
            formatter: (val: any, ctx: any) => {
              if (val === 0) return "";
              const item = filteredDataDropdowns[ctx.dataIndex];
              if (selectedDate !== null && item?.data !== selectedDate) return "";
              return val;
            }
          }
        }
      ]
    };
  }, [filteredDataDropdowns, selectedDate, isDarkMode]);

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      onClick: (event: any, activeElements: any) => {
        if (activeElements && activeElements.length > 0) {
          const dataIndex = activeElements[0].index;
          const clickedRecord = filteredDataDropdowns[dataIndex];
          if (clickedRecord) {
            setSelectedDate(prev => prev === clickedRecord.data ? null : clickedRecord.data);
          }
        }
      },
      plugins: {
        legend: {
          position: "bottom" as const,
          labels: {
            color: isDarkMode ? "#f1f5f9" : "#00122e",
            font: {
              family: "JetBrains Mono, monospace",
              weight: "bold" as const,
              size: 10
            },
            boxWidth: 10,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: "rgba(0, 18, 46, 0.98)",
          titleColor: "#94a3b8",
          bodyColor: "#ffffff",
          borderColor: "rgba(56, 189, 248, 0.2)",
          borderWidth: 1.5,
          padding: 12,
          cornerRadius: 12,
          titleFont: {
            family: "JetBrains Mono",
            weight: "bold" as const,
            size: 11
          },
          bodyFont: {
            family: "Inter",
            size: 11
          },
          callbacks: {
            title: function(context: any) {
              const idx = context[0].dataIndex;
              const record = filteredDataDropdowns[idx];
              if (record) {
                const parts = record.data.split("-");
                const dateLabel = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : record.data;
                const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                const weekdayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
                return `${dateLabel} (${weekdayNames[d.getDay()] || ""})`;
              }
              return "";
            },
            label: function(context: any) {
              let label = context.dataset.label || "";
              if (label) {
                label += ": ";
              }
              if (context.parsed.y !== null) {
                label += context.parsed.y.toLocaleString("pt-BR");
              }
              
              const idx = context.dataIndex;
              const record = filteredDataDropdowns[idx];
              if (record && context.dataset.label === "Agendado") {
                const cap = record.capacidade;
                const agen = record.agendado;
                if (cap > 0 && agen > cap) {
                  const overPct = Math.round(((agen - cap) / cap) * 100);
                  label += ` (+${overPct}% Excesso!) 🔴`;
                }
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: isDarkMode ? "#94a3b8" : "#1a3a6b",
            font: {
              family: "JetBrains Mono",
              size: 10,
              weight: "bold" as const
            }
          }
        },
        y: {
          grid: {
            color: isDarkMode ? "rgba(51, 65, 85, 0.4)" : "rgba(226, 232, 240, 0.6)"
          },
          ticks: {
            color: isDarkMode ? "#94a3b8" : "#1a3a6b",
            font: {
              family: "Inter",
              size: 10,
              weight: "bold" as const
            }
          }
        }
      }
    };
  }, [filteredDataDropdowns, selectedDate, isDarkMode]);

  const fmt = (val: number) => val.toLocaleString("pt-BR");

  return (
    <div className={`p-6 space-y-6 ${isDarkMode ? "text-[#e2e8f0]" : "text-[#00122e]"} font-medium`}>
      
      {/* HEADER SECTION */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-transparent p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 transition-all duration-300">
        

        <div className="flex flex-wrap items-center gap-3">
          {/* Active Date Filter (Drilldown) Indicator */}
          {selectedDate && (
            <div className="px-3 py-1.5 bg-rose-500/15 border border-rose-500/20 text-rose-500 rounded-xl text-[10px] font-mono font-black flex items-center gap-2 animate-bounce">
              <span>DATA ATIVA: {selectedDate.split("-").reverse().join("/")}</span>
              <button 
                onClick={() => setSelectedDate(null)}
                className="hover:bg-rose-500/20 px-1 py-0.5 rounded cursor-pointer"
                title="Limpar Filtro de Gráfico (Drilldown)"
              >
                X
              </button>
            </div>
          )}

          {/* API Status */}


          {/* Quick Cards Toggle */}
          <button
            onClick={() => setShowCards(!showCards)}
            className={`px-3.5 py-1.5 border rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              showCards 
                ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/10"
                : "bg-transparent border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{showCards ? "Ocultar Cards" : "Exibir Cards"}</span>
          </button>

          {/* Quick Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3.5 py-1.5 border rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              showFilters 
                ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10"
                : "bg-transparent border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{showFilters ? "Ocultar Filtros" : "Exibir Filtros"}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40 transition-all"
            title="Sincronizar API"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-500" : ""}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="w-full h-80 flex flex-col items-center justify-center bg-white/40 dark:bg-slate-900/10 border border-slate-200/40 rounded-3xl p-12">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Sincronizando com a API...</p>
        </div>
      ) : (
        <>
          {/* KPI CARDS GRID */}
          <AnimatePresence>
            {showCards && (
              <motion.div
                key="kpi-cards"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  
                  {/* Card 1: Capacidade Total (% Dias na Meta integrado) */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-transparent border border-slate-200/50 dark:border-slate-800/50 p-5 rounded-2xl hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block font-mono">Capacidade Total</span>
                      <h3 className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-900 dark:to-indigo-400 mt-1.5 tracking-tight">
                        {fmt(stats.sumCapacidade)}
                      </h3>
                    </div>
                    <div className="mt-4 flex flex-col gap-1 text-left">
                      <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                        <span className="text-slate-400">Dias na Meta:</span>
                        <span className={stats.pctDiasNaMeta < 90 ? "text-rose-500" : "text-emerald-500"}>
                          {stats.pctDiasNaMeta}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono mt-1">
                        <span>Dias no Período: {stats.allDaysCount}</span>
                        <Boxes className="w-3.5 h-3.5 text-orange-500 opacity-80" />
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500/70" />
                  </motion.div>
        
                  {/* Card 2: Total Agendado */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="bg-transparent border border-slate-200/50 dark:border-slate-800/50 p-5 rounded-2xl hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block font-mono">Total Agendado</span>
                      <h3 className={`text-xl font-black mt-1.5 tracking-tight ${
                        stats.sumAgendado > stats.sumCapacidade 
                          ? "text-rose-600" 
                          : "text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-900 dark:to-indigo-400 mt-1.5 tracking-tight"
                      }`}>
                        {fmt(stats.sumAgendado)}
                      </h3>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      {stats.sumAgendado > stats.sumCapacidade ? (
                        <span className="text-[8px] font-black bg-rose-500/10 text-rose-500 border border-rose-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5 animate-pulse" /> Excesso
                        </span>
                      ) : (
                        <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          Equilibrado
                        </span>
                      )}
                      <Truck className="w-4 h-4 text-indigo-500 opacity-80" />
                    </div>
                    <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${stats.sumAgendado > stats.sumCapacidade ? "bg-rose-500" : "bg-indigo-500"}`} />
                  </motion.div>
        
                  {/* Card 3: Total Recebido */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-transparent border border-slate-200/50 dark:border-slate-800/50 p-5 rounded-2xl hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block font-mono">Total Recebido</span>
                      <h3 className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-900 dark:to-indigo-400 mt-1.5 tracking-tight">
                        {fmt(stats.sumRecebido)}
                      </h3>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-[9px] text-slate-500 font-mono">
                        Realizado Real
                      </span>
                      <BarChart2 className="w-4 h-4 text-blue-500 opacity-80" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                  </motion.div>
        
                  {/* Card 4: Média Recebido (Weekdays only) */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-transparent border border-slate-200/50 dark:border-slate-800/50 p-5 rounded-2xl hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block font-mono">Média Recebido</span>
                      <h3 className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-900 dark:to-indigo-400 mt-1.5 tracking-tight">
                        {fmt(stats.mediaRecebido)}
                      </h3>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-[9px] text-slate-500 font-mono">
                        Dias úteis (excl. fds)
                      </span>
                      <TrendingUp className="w-4 h-4 text-blue-400 opacity-80" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400" />
                  </motion.div>
        
                  {/* Card 5: Máximo Recebido (Weekdays only) */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-transparent border border-slate-200/50 dark:border-slate-800/50 p-5 rounded-2xl hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block font-mono">Máximo Recebido</span>
                      <h3 className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-900 dark:to-indigo-400 mt-1.5 tracking-tight">
                        {fmt(stats.maxRecebido)}
                      </h3>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-[9px] text-slate-500 font-mono">
                        Dia útil pico
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-emerald-500 opacity-80" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                  </motion.div>
        
                  {/* Card 6: Agenda G.A & No Show */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="bg-transparent border border-slate-200/50 dark:border-slate-800/50 p-5 rounded-2xl hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block font-mono">Agenda G.A</span>
                      <h3 className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-indigo-900 dark:to-indigo-400 mt-1.5 tracking-tight">
                        {fmt(stats.sumAgendasSistema)}
                      </h3>
                    </div>
                    <div className="mt-4 flex flex-col gap-1 text-left">
                      <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                        <span className="text-slate-400">No Show / Agenda:</span>
                        <span className="text-rose-500">
                          {stats.noShowPct}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono mt-1">
                        <span>Qtd No Show: {fmt(stats.sumNoShow)}</span>
                        <Layers className="w-3.5 h-3.5 text-indigo-400 opacity-80" />
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
                  </motion.div>
        
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* DYNAMIC FILTERS PANEL (Similar to Dsh) */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                key="filters-panel"
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 bg-slate-50/40 dark:bg-slate-900/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              >
                {/* CD Dropdown (Enforced single CD, no "Todos os CDs") */}
                <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 px-3.5 py-2 rounded-2xl shadow-sm">
                  <Building className="w-4 h-4 text-blue-500 shrink-0" />
                  <div className="flex flex-col text-left w-full">
                    <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">Depósito / CD</span>
                    <select
                      value={selectedCd}
                      onChange={(e) => {
                        setSelectedCd(e.target.value);
                        setSelectedDate(null); // Clear drilldown when changing CD
                      }}
                      className="bg-transparent border-none text-xs font-black text-[#00122e] dark:text-white focus:outline-none cursor-pointer pr-1 w-full"
                    >
                      {cdsList.map(cd => (
                        <option key={cd} value={cd} className="text-[#00122e] dark:text-slate-900">CD {cd}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Category Dropdown */}
                <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 px-3.5 py-2 rounded-2xl shadow-sm">
                  <Package className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="flex flex-col text-left w-full">
                    <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">Fluxo / Categoria</span>
                    <select
                      value={selectedCat}
                      onChange={(e) => {
                        setSelectedCat(e.target.value);
                        setSelectedDate(null); // Clear drilldown on category change
                      }}
                      className="bg-transparent border-none text-xs font-black text-[#00122e] dark:text-white focus:outline-none cursor-pointer pr-1 w-full"
                    >
                      <option value="all" className="text-[#00122e] dark:text-slate-900">Todas as Categorias</option>
                      {categoriesList.map(cat => (
                        <option key={cat} value={cat} className="text-[#00122e] dark:text-slate-900">{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Month Dropdown */}
                <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 px-3.5 py-2 rounded-2xl shadow-sm">
                  <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div className="flex flex-col text-left w-full">
                    <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">Período / Mês</span>
                    <select
                      value={selectedMonth}
                      onChange={(e) => {
                        setSelectedMonth(e.target.value);
                        setSelectedDate(null); // Clear drilldown on month change
                      }}
                      className="bg-transparent border-none text-xs font-black text-[#00122e] dark:text-white focus:outline-none cursor-pointer pr-1 w-full"
                    >
                      {monthsList.map(m => (
                        <option key={m} value={m} className="text-[#00122e] dark:text-slate-900">{formatMonthLabel(m)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Week of Month Dropdown */}
                <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 px-3.5 py-2 rounded-2xl shadow-sm">
                  <Sliders className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="flex flex-col text-left w-full">
                    <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">Semana do Mês</span>
                    <select
                      value={selectedWeek}
                      onChange={(e) => {
                        setSelectedWeek(e.target.value);
                        setSelectedDate(null); // Clear drilldown on week change
                      }}
                      className="bg-transparent border-none text-xs font-black text-[#00122e] dark:text-white focus:outline-none cursor-pointer pr-1 w-full"
                    >
                      <option value="all" className="text-[#00122e] dark:text-slate-900">Todas as Semanas</option>
                      <option value="1" className="text-[#00122e] dark:text-slate-900">Semana 1</option>
                      <option value="2" className="text-[#00122e] dark:text-slate-900">Semana 2</option>
                      <option value="3" className="text-[#00122e] dark:text-slate-900">Semana 3</option>
                      <option value="4" className="text-[#00122e] dark:text-slate-900">Semana 4</option>
                      <option value="5" className="text-[#00122e] dark:text-slate-900">Semana 5</option>
                      <option value="6" className="text-[#00122e] dark:text-slate-900">Semana 6</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MAIN CHART WITH COMPARISONS */}
          <div className="bg-transparent border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-6 gap-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">
                  Projeção de Inbound vs Capacidade
                </h3>
                <h2 className="text-lg font-black tracking-tight mt-0.5">
                  Comparativo de Agendamentos x Capacidades Diárias.
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono font-bold border-slate-200 dark:border-slate-800">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-[#f97316] inline-block" /> Capacidade
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-[#8b5cf6] inline-block" /> Agendado
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-[#06b6d4] inline-block" /> Agenda G.A
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-emerald-500 inline-block rounded-sm" /> Recebido (OK)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-rose-500 inline-block rounded-sm" /> Recebido (Sobrecarga)
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full h-[380px] relative">
              <Chart 
                type="bar" 
                data={chartData} 
                options={chartOptions as any} 
              />
            </div>

            {/* Ocultar Tabela Button Placed Below the Graph */}
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setShowDetailTable(!showDetailTable)}
                className={`px-4 py-2 border rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  showDetailTable 
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/10"
                    : "bg-transparent border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
                title="Exibir ou ocultar a tabela de detalhamento operacional abaixo"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>{showDetailTable ? "Ocultar Tabela" : "Exibir Tabela"}</span>
              </button>
            </div>
          </div>

          {/* DETAIL VIEW: TABLES */}
          <AnimatePresence>
            {showDetailTable && (
              <motion.div
                initial={{ opacity: 0, y: 15, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: 15, height: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full overflow-hidden"
              >
            
            {/* Interactive Table with Overloads Highlighted in Red */}
            <div className="bg-transparent border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 transition-all duration-300">
              <div className="mb-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">Detalhamento Diário</h3>
                <h2 className="text-base font-black tracking-tight mt-0.5">Lançamentos Sincronizados com a API</h2>
              </div>

              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-[9px] uppercase font-bold text-slate-400 font-mono">
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Semana</th>
                      <th className="py-3 px-4 text-right">Capacidade</th>
                      <th className="py-3 px-4 text-right">Agendado</th>
                      <th className="py-3 px-4 text-right">Recebido</th>
                      <th className="py-3 px-4 text-right">Status / Desvio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-medium">
                    {filteredData.map((item, idx) => {
                      const isWeekend = isWeekendDay(item.data);
                      const cap = item.capacidade;
                      const isOver = item.agendamentoECapacidade;
                      const desvio = item.agendado - cap;
                      const desvioPct = cap > 0 ? Math.round((desvio / cap) * 100) : 100;

                      return (
                        <tr 
                          key={`${item.data}-${idx}`}
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                            isOver 
                              ? "bg-rose-500/5 border-l-2 border-rose-500" 
                              : isWeekend 
                                ? "opacity-40 bg-slate-50/10" 
                                : ""
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold">
                            {item.data.split("-").reverse().join("/")}
                          </td>
                          <td className="py-3 px-4 font-mono">
                            Semana {getWeekOfMonth(item.data)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-500">
                            {fmt(cap)}
                          </td>
                          <td className={`py-3 px-4 text-right font-mono font-bold ${isOver ? "text-rose-600" : "text-slate-800 dark:text-white"}`}>
                            {fmt(item.agendado)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                            {fmt(item.recebido)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            {isOver ? (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-black bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2 py-0.5 rounded-full animate-pulse">
                                +{desvioPct}% (+{fmt(desvio)})
                              </span>
                            ) : isWeekend ? (
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                Fim de Semana
                              </span>
                            ) : (
                              <span className="inline-flex text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                OK
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
        </>
      )}

    </div>
  );
}
