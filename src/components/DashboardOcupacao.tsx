import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  Filler
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Doughnut, Bar, Line, Chart } from "react-chartjs-2";
import {
  Package,
  Layers,
  TrendingUp,
  Building,
  RefreshCw,
  Search,
  ArrowUpRight,
  BarChart3,
  CalendarRange,
  Maximize2,
  Minimize2,
  X
} from "lucide-react";
import { User, PainelEstoqueSubCategoria } from "../types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  ChartTitle,
  ChartTooltip,
  ChartLegend,
  Filler,
  ChartDataLabels
);

interface DashboardOcupacaoProps {
  theme: "light" | "dark";
  showNotification: (msg: string) => void;
  user?: User | null;
  onPageChange?: (page: string) => void;
  onThemeToggle?: () => void;
  onLogout?: () => void;
}

// Model for category data
interface CategoryStat {
  id: string;
  name: string;
  pallets: number;
  capacidade: number;
  ocupacaoPct: number;
  color: string;
  gradient: [string, string];
  variacao: number;
  giro: "Alto" | "Médio" | "Estável";
}

// Model for item/PLU data
interface PluItem {
  plu: string;
  descricao: string;
  categoria: string;
  cd: number;
  pallets: number;
  capacidadeMax: number;
}

// Default Fallback Subcategories dataset from API with 14 Days Real History and 14 Days Projection
const DEFAULT_PAINEL_ESTOQUE: PainelEstoqueSubCategoria[] = [
  {
    cd: 1965,
    categoria: "Mercearia",
    subCategoria: "Bazar",
    historico: [
      { data: "2026-08-11", origem: "REAL", qtdPosicoes: 4865, qtdOcupada: 2510, percentualOcupacao: 0.516 },
      { data: "2026-08-12", origem: "REAL", qtdPosicoes: 4865, qtdOcupada: 2530, percentualOcupacao: 0.52 },
      { data: "2026-08-13", origem: "REAL", qtdPosicoes: 4865, qtdOcupada: 2545, percentualOcupacao: 0.523 },
      { data: "2026-08-14", origem: "REAL", qtdPosicoes: 4865, qtdOcupada: 2560, percentualOcupacao: 0.526 },
      { data: "2026-08-15", origem: "REAL", qtdPosicoes: 4865, qtdOcupada: 2555, percentualOcupacao: 0.525 },
      { data: "2026-08-16", origem: "REAL", qtdPosicoes: 4865, qtdOcupada: 2565, percentualOcupacao: 0.527 },
      { data: "2026-08-17", origem: "REAL", qtdPosicoes: 4865, qtdOcupada: 2570, percentualOcupacao: 0.528 },
      { data: "2026-08-18", origem: "REAL", qtdPosicoes: 4865, qtdOcupada: 2575, percentualOcupacao: 0.53 },
      { data: "2026-08-19", origem: "REAL", qtdPosicoes: 4865, qtdOcupada: 2795, percentualOcupacao: 0.575 },
      { data: "2026-08-20", origem: "REAL", qtdPosicoes: 4864, qtdOcupada: 2596, percentualOcupacao: 0.534 },
      { data: "2026-08-21", origem: "REAL", qtdPosicoes: 4864, qtdOcupada: 2583, percentualOcupacao: 0.531 },
      { data: "2026-08-22", origem: "REAL", qtdPosicoes: 4864, qtdOcupada: 2582, percentualOcupacao: 0.531 },
      { data: "2026-08-23", origem: "REAL", qtdPosicoes: 4863, qtdOcupada: 2597, percentualOcupacao: 0.534 },
      { data: "2026-08-24", origem: "REAL", qtdPosicoes: 4862, qtdOcupada: 3142, percentualOcupacao: 0.646 }
    ],
    projecao: [
      { data: "2026-08-25", origem: "PROJETADO", qtdPosicoes: 4862, qtdOcupada: 3150, percentualOcupacao: 0.648 },
      { data: "2026-08-26", origem: "PROJETADO", qtdPosicoes: 4862, qtdOcupada: 3160, percentualOcupacao: 0.65 },
      { data: "2026-08-27", origem: "PROJETADO", qtdPosicoes: 4862, qtdOcupada: 3175, percentualOcupacao: 0.653 },
      { data: "2026-08-28", origem: "PROJETADO", qtdPosicoes: 4862, qtdOcupada: 3190, percentualOcupacao: 0.656 },
      { data: "2026-08-29", origem: "PROJETADO", qtdPosicoes: 4862, qtdOcupada: 3200, percentualOcupacao: 0.658 },
      { data: "2026-08-30", origem: "PROJETADO", qtdPosicoes: 4862, qtdOcupada: 3210, percentualOcupacao: 0.66 },
      { data: "2026-08-31", origem: "PROJETADO", qtdPosicoes: 4862, qtdOcupada: 3220, percentualOcupacao: 0.662 },
      { data: "2026-09-01", origem: "PROJETADO", qtdPosicoes: 4862, qtdOcupada: 3235, percentualOcupacao: 0.665 },
      { data: "2026-09-02", origem: "PROJETADO", qtdPosicoes: 4862, qtdOcupada: 3250, percentualOcupacao: 0.668 },
      { data: "2026-09-03", origem: "PROJETADO", qtdPosicoes: 4862, qtdOcupada: 3260, percentualOcupacao: 0.671 },
      { data: "2026-09-04", origem: "PROJETADO", qtdPosicoes: 4862, qtdOcupada: 3270, percentualOcupacao: 0.673 },
      { data: "2026-09-05", origem: "PROJETADO", qtdPosicoes: 4862, qtdOcupada: 3280, percentualOcupacao: 0.675 },
      { data: "2026-09-06", origem: "PROJETADO", qtdPosicoes: 4862, qtdOcupada: 3290, percentualOcupacao: 0.677 },
      { data: "2026-09-07", origem: "PROJETADO", qtdPosicoes: 4862, qtdOcupada: 3300, percentualOcupacao: 0.679 }
    ]
  },
  {
    cd: 1965,
    categoria: "Mercearia",
    subCategoria: "Blocado",
    historico: [
      { data: "2026-08-11", origem: "REAL", qtdPosicoes: 2265, qtdOcupada: 880, percentualOcupacao: 0.389 },
      { data: "2026-08-12", origem: "REAL", qtdPosicoes: 2265, qtdOcupada: 885, percentualOcupacao: 0.391 },
      { data: "2026-08-13", origem: "REAL", qtdPosicoes: 2265, qtdOcupada: 890, percentualOcupacao: 0.393 },
      { data: "2026-08-14", origem: "REAL", qtdPosicoes: 2265, qtdOcupada: 895, percentualOcupacao: 0.395 },
      { data: "2026-08-15", origem: "REAL", qtdPosicoes: 2265, qtdOcupada: 900, percentualOcupacao: 0.397 },
      { data: "2026-08-16", origem: "REAL", qtdPosicoes: 2265, qtdOcupada: 905, percentualOcupacao: 0.4 },
      { data: "2026-08-17", origem: "REAL", qtdPosicoes: 2265, qtdOcupada: 908, percentualOcupacao: 0.401 },
      { data: "2026-08-18", origem: "REAL", qtdPosicoes: 2265, qtdOcupada: 910, percentualOcupacao: 0.402 },
      { data: "2026-08-19", origem: "REAL", qtdPosicoes: 2265, qtdOcupada: 920, percentualOcupacao: 0.406 },
      { data: "2026-08-20", origem: "REAL", qtdPosicoes: 2265, qtdOcupada: 925, percentualOcupacao: 0.408 },
      { data: "2026-08-21", origem: "REAL", qtdPosicoes: 2265, qtdOcupada: 930, percentualOcupacao: 0.41 },
      { data: "2026-08-22", origem: "REAL", qtdPosicoes: 2265, qtdOcupada: 935, percentualOcupacao: 0.413 },
      { data: "2026-08-23", origem: "REAL", qtdPosicoes: 2265, qtdOcupada: 938, percentualOcupacao: 0.414 },
      { data: "2026-08-24", origem: "REAL", qtdPosicoes: 2265, qtdOcupada: 940, percentualOcupacao: 0.415 }
    ],
    projecao: [
      { data: "2026-08-25", origem: "PROJETADO", qtdPosicoes: 2265, qtdOcupada: 945, percentualOcupacao: 0.417 },
      { data: "2026-08-26", origem: "PROJETADO", qtdPosicoes: 2265, qtdOcupada: 950, percentualOcupacao: 0.419 },
      { data: "2026-08-27", origem: "PROJETADO", qtdPosicoes: 2265, qtdOcupada: 955, percentualOcupacao: 0.422 },
      { data: "2026-08-28", origem: "PROJETADO", qtdPosicoes: 2265, qtdOcupada: 960, percentualOcupacao: 0.424 },
      { data: "2026-08-29", origem: "PROJETADO", qtdPosicoes: 2265, qtdOcupada: 965, percentualOcupacao: 0.426 },
      { data: "2026-08-30", origem: "PROJETADO", qtdPosicoes: 2265, qtdOcupada: 970, percentualOcupacao: 0.428 },
      { data: "2026-08-31", origem: "PROJETADO", qtdPosicoes: 2265, qtdOcupada: 975, percentualOcupacao: 0.43 },
      { data: "2026-09-01", origem: "PROJETADO", qtdPosicoes: 2265, qtdOcupada: 980, percentualOcupacao: 0.433 },
      { data: "2026-09-02", origem: "PROJETADO", qtdPosicoes: 2265, qtdOcupada: 985, percentualOcupacao: 0.435 },
      { data: "2026-09-03", origem: "PROJETADO", qtdPosicoes: 2265, qtdOcupada: 990, percentualOcupacao: 0.437 },
      { data: "2026-09-04", origem: "PROJETADO", qtdPosicoes: 2265, qtdOcupada: 995, percentualOcupacao: 0.439 },
      { data: "2026-09-05", origem: "PROJETADO", qtdPosicoes: 2265, qtdOcupada: 1000, percentualOcupacao: 0.442 },
      { data: "2026-09-06", origem: "PROJETADO", qtdPosicoes: 2265, qtdOcupada: 1005, percentualOcupacao: 0.444 },
      { data: "2026-09-07", origem: "PROJETADO", qtdPosicoes: 2265, qtdOcupada: 1010, percentualOcupacao: 0.446 }
    ]
  },
  {
    cd: 1965,
    categoria: "Mercearia",
    subCategoria: "Dinamico",
    historico: [
      { data: "2026-08-11", origem: "REAL", qtdPosicoes: 6762, qtdOcupada: 2680, percentualOcupacao: 0.396 },
      { data: "2026-08-12", origem: "REAL", qtdPosicoes: 6762, qtdOcupada: 2685, percentualOcupacao: 0.397 },
      { data: "2026-08-13", origem: "REAL", qtdPosicoes: 6762, qtdOcupada: 2690, percentualOcupacao: 0.398 },
      { data: "2026-08-14", origem: "REAL", qtdPosicoes: 6762, qtdOcupada: 2695, percentualOcupacao: 0.399 },
      { data: "2026-08-15", origem: "REAL", qtdPosicoes: 6762, qtdOcupada: 2700, percentualOcupacao: 0.399 },
      { data: "2026-08-16", origem: "REAL", qtdPosicoes: 6762, qtdOcupada: 2702, percentualOcupacao: 0.4 },
      { data: "2026-08-17", origem: "REAL", qtdPosicoes: 6762, qtdOcupada: 2705, percentualOcupacao: 0.4 },
      { data: "2026-08-18", origem: "REAL", qtdPosicoes: 6762, qtdOcupada: 2710, percentualOcupacao: 0.401 },
      { data: "2026-08-19", origem: "REAL", qtdPosicoes: 6762, qtdOcupada: 2720, percentualOcupacao: 0.402 },
      { data: "2026-08-20", origem: "REAL", qtdPosicoes: 6762, qtdOcupada: 2735, percentualOcupacao: 0.404 },
      { data: "2026-08-21", origem: "REAL", qtdPosicoes: 6762, qtdOcupada: 2740, percentualOcupacao: 0.405 },
      { data: "2026-08-22", origem: "REAL", qtdPosicoes: 6762, qtdOcupada: 2750, percentualOcupacao: 0.407 },
      { data: "2026-08-23", origem: "REAL", qtdPosicoes: 6762, qtdOcupada: 2755, percentualOcupacao: 0.407 },
      { data: "2026-08-24", origem: "REAL", qtdPosicoes: 6762, qtdOcupada: 2759, percentualOcupacao: 0.408 }
    ],
    projecao: [
      { data: "2026-08-25", origem: "PROJETADO", qtdPosicoes: 6762, qtdOcupada: 2765, percentualOcupacao: 0.409 },
      { data: "2026-08-26", origem: "PROJETADO", qtdPosicoes: 6762, qtdOcupada: 2770, percentualOcupacao: 0.41 },
      { data: "2026-08-27", origem: "PROJETADO", qtdPosicoes: 6762, qtdOcupada: 2780, percentualOcupacao: 0.411 },
      { data: "2026-08-28", origem: "PROJETADO", qtdPosicoes: 6762, qtdOcupada: 2790, percentualOcupacao: 0.413 },
      { data: "2026-08-29", origem: "PROJETADO", qtdPosicoes: 6762, qtdOcupada: 2800, percentualOcupacao: 0.414 },
      { data: "2026-08-30", origem: "PROJETADO", qtdPosicoes: 6762, qtdOcupada: 2810, percentualOcupacao: 0.416 },
      { data: "2026-08-31", origem: "PROJETADO", qtdPosicoes: 6762, qtdOcupada: 2820, percentualOcupacao: 0.417 },
      { data: "2026-09-01", origem: "PROJETADO", qtdPosicoes: 6762, qtdOcupada: 2830, percentualOcupacao: 0.418 },
      { data: "2026-09-02", origem: "PROJETADO", qtdPosicoes: 6762, qtdOcupada: 2840, percentualOcupacao: 0.42 },
      { data: "2026-09-03", origem: "PROJETADO", qtdPosicoes: 6762, qtdOcupada: 2850, percentualOcupacao: 0.421 },
      { data: "2026-09-04", origem: "PROJETADO", qtdPosicoes: 6762, qtdOcupada: 2860, percentualOcupacao: 0.423 },
      { data: "2026-09-05", origem: "PROJETADO", qtdPosicoes: 6762, qtdOcupada: 2870, percentualOcupacao: 0.424 },
      { data: "2026-09-06", origem: "PROJETADO", qtdPosicoes: 6762, qtdOcupada: 2880, percentualOcupacao: 0.426 },
      { data: "2026-09-07", origem: "PROJETADO", qtdPosicoes: 6762, qtdOcupada: 2890, percentualOcupacao: 0.427 }
    ]
  },
  {
    cd: 1965,
    categoria: "Mercearia",
    subCategoria: "Dph",
    historico: [
      { data: "2026-08-11", origem: "REAL", qtdPosicoes: 15304, qtdOcupada: 12700, percentualOcupacao: 0.83 },
      { data: "2026-08-12", origem: "REAL", qtdPosicoes: 15304, qtdOcupada: 12680, percentualOcupacao: 0.829 },
      { data: "2026-08-13", origem: "REAL", qtdPosicoes: 15304, qtdOcupada: 12650, percentualOcupacao: 0.827 },
      { data: "2026-08-14", origem: "REAL", qtdPosicoes: 15304, qtdOcupada: 12600, percentualOcupacao: 0.823 },
      { data: "2026-08-15", origem: "REAL", qtdPosicoes: 15304, qtdOcupada: 12580, percentualOcupacao: 0.822 },
      { data: "2026-08-16", origem: "REAL", qtdPosicoes: 15304, qtdOcupada: 12550, percentualOcupacao: 0.82 },
      { data: "2026-08-17", origem: "REAL", qtdPosicoes: 15304, qtdOcupada: 12520, percentualOcupacao: 0.818 },
      { data: "2026-08-18", origem: "REAL", qtdPosicoes: 15304, qtdOcupada: 12500, percentualOcupacao: 0.817 },
      { data: "2026-08-19", origem: "REAL", qtdPosicoes: 15304, qtdOcupada: 12400, percentualOcupacao: 0.81 },
      { data: "2026-08-20", origem: "REAL", qtdPosicoes: 15304, qtdOcupada: 12300, percentualOcupacao: 0.804 },
      { data: "2026-08-21", origem: "REAL", qtdPosicoes: 15304, qtdOcupada: 12200, percentualOcupacao: 0.797 },
      { data: "2026-08-22", origem: "REAL", qtdPosicoes: 15304, qtdOcupada: 12150, percentualOcupacao: 0.794 },
      { data: "2026-08-23", origem: "REAL", qtdPosicoes: 15304, qtdOcupada: 12100, percentualOcupacao: 0.791 },
      { data: "2026-08-24", origem: "REAL", qtdPosicoes: 15304, qtdOcupada: 12090, percentualOcupacao: 0.79 }
    ],
    projecao: [
      { data: "2026-08-25", origem: "PROJETADO", qtdPosicoes: 15304, qtdOcupada: 12200, percentualOcupacao: 0.797 },
      { data: "2026-08-26", origem: "PROJETADO", qtdPosicoes: 15304, qtdOcupada: 12250, percentualOcupacao: 0.8 },
      { data: "2026-08-27", origem: "PROJETADO", qtdPosicoes: 15304, qtdOcupada: 12250, percentualOcupacao: 0.8 },
      { data: "2026-08-28", origem: "PROJETADO", qtdPosicoes: 15304, qtdOcupada: 12300, percentualOcupacao: 0.804 },
      { data: "2026-08-29", origem: "PROJETADO", qtdPosicoes: 15304, qtdOcupada: 12300, percentualOcupacao: 0.804 },
      { data: "2026-08-30", origem: "PROJETADO", qtdPosicoes: 15304, qtdOcupada: 12300, percentualOcupacao: 0.804 },
      { data: "2026-08-31", origem: "PROJETADO", qtdPosicoes: 15304, qtdOcupada: 12300, percentualOcupacao: 0.804 },
      { data: "2026-09-01", origem: "PROJETADO", qtdPosicoes: 15304, qtdOcupada: 12350, percentualOcupacao: 0.807 },
      { data: "2026-09-02", origem: "PROJETADO", qtdPosicoes: 15304, qtdOcupada: 12380, percentualOcupacao: 0.809 },
      { data: "2026-09-03", origem: "PROJETADO", qtdPosicoes: 15304, qtdOcupada: 12400, percentualOcupacao: 0.81 },
      { data: "2026-09-04", origem: "PROJETADO", qtdPosicoes: 15304, qtdOcupada: 12420, percentualOcupacao: 0.812 },
      { data: "2026-09-05", origem: "PROJETADO", qtdPosicoes: 15304, qtdOcupada: 12450, percentualOcupacao: 0.813 },
      { data: "2026-09-06", origem: "PROJETADO", qtdPosicoes: 15304, qtdOcupada: 12480, percentualOcupacao: 0.815 },
      { data: "2026-09-07", origem: "PROJETADO", qtdPosicoes: 15304, qtdOcupada: 12500, percentualOcupacao: 0.817 }
    ]
  },
  {
    cd: 1965,
    categoria: "Mercearia",
    subCategoria: "Fefo E Bloqueio",
    historico: [
      { data: "2026-08-11", origem: "REAL", qtdPosicoes: 350, qtdOcupada: 60, percentualOcupacao: 0.171 },
      { data: "2026-08-12", origem: "REAL", qtdPosicoes: 350, qtdOcupada: 60, percentualOcupacao: 0.171 },
      { data: "2026-08-13", origem: "REAL", qtdPosicoes: 350, qtdOcupada: 62, percentualOcupacao: 0.177 },
      { data: "2026-08-14", origem: "REAL", qtdPosicoes: 350, qtdOcupada: 62, percentualOcupacao: 0.177 },
      { data: "2026-08-15", origem: "REAL", qtdPosicoes: 350, qtdOcupada: 64, percentualOcupacao: 0.183 },
      { data: "2026-08-16", origem: "REAL", qtdPosicoes: 350, qtdOcupada: 64, percentualOcupacao: 0.183 },
      { data: "2026-08-17", origem: "REAL", qtdPosicoes: 350, qtdOcupada: 65, percentualOcupacao: 0.186 },
      { data: "2026-08-18", origem: "REAL", qtdPosicoes: 350, qtdOcupada: 65, percentualOcupacao: 0.186 },
      { data: "2026-08-19", origem: "REAL", qtdPosicoes: 350, qtdOcupada: 65, percentualOcupacao: 0.186 },
      { data: "2026-08-20", origem: "REAL", qtdPosicoes: 350, qtdOcupada: 66, percentualOcupacao: 0.189 },
      { data: "2026-08-21", origem: "REAL", qtdPosicoes: 350, qtdOcupada: 67, percentualOcupacao: 0.191 },
      { data: "2026-08-22", origem: "REAL", qtdPosicoes: 350, qtdOcupada: 68, percentualOcupacao: 0.194 },
      { data: "2026-08-23", origem: "REAL", qtdPosicoes: 350, qtdOcupada: 68, percentualOcupacao: 0.194 },
      { data: "2026-08-24", origem: "REAL", qtdPosicoes: 350, qtdOcupada: 68, percentualOcupacao: 0.194 }
    ],
    projecao: [
      { data: "2026-08-25", origem: "PROJETADO", qtdPosicoes: 350, qtdOcupada: 68, percentualOcupacao: 0.194 },
      { data: "2026-08-26", origem: "PROJETADO", qtdPosicoes: 350, qtdOcupada: 69, percentualOcupacao: 0.197 },
      { data: "2026-08-27", origem: "PROJETADO", qtdPosicoes: 350, qtdOcupada: 70, percentualOcupacao: 0.2 },
      { data: "2026-08-28", origem: "PROJETADO", qtdPosicoes: 350, qtdOcupada: 70, percentualOcupacao: 0.2 },
      { data: "2026-08-29", origem: "PROJETADO", qtdPosicoes: 350, qtdOcupada: 71, percentualOcupacao: 0.203 },
      { data: "2026-08-30", origem: "PROJETADO", qtdPosicoes: 350, qtdOcupada: 72, percentualOcupacao: 0.206 },
      { data: "2026-08-31", origem: "PROJETADO", qtdPosicoes: 350, qtdOcupada: 72, percentualOcupacao: 0.206 },
      { data: "2026-09-01", origem: "PROJETADO", qtdPosicoes: 350, qtdOcupada: 73, percentualOcupacao: 0.209 },
      { data: "2026-09-02", origem: "PROJETADO", qtdPosicoes: 350, qtdOcupada: 74, percentualOcupacao: 0.211 },
      { data: "2026-09-03", origem: "PROJETADO", qtdPosicoes: 350, qtdOcupada: 74, percentualOcupacao: 0.211 },
      { data: "2026-09-04", origem: "PROJETADO", qtdPosicoes: 350, qtdOcupada: 75, percentualOcupacao: 0.214 },
      { data: "2026-09-05", origem: "PROJETADO", qtdPosicoes: 350, qtdOcupada: 75, percentualOcupacao: 0.214 },
      { data: "2026-09-06", origem: "PROJETADO", qtdPosicoes: 350, qtdOcupada: 76, percentualOcupacao: 0.217 },
      { data: "2026-09-07", origem: "PROJETADO", qtdPosicoes: 350, qtdOcupada: 76, percentualOcupacao: 0.217 }
    ]
  },
  {
    cd: 1965,
    categoria: "Mercearia",
    subCategoria: "Liquida",
    historico: [
      { data: "2026-08-11", origem: "REAL", qtdPosicoes: 5525, qtdOcupada: 5150, percentualOcupacao: 0.932 },
      { data: "2026-08-12", origem: "REAL", qtdPosicoes: 5525, qtdOcupada: 5145, percentualOcupacao: 0.931 },
      { data: "2026-08-13", origem: "REAL", qtdPosicoes: 5525, qtdOcupada: 5140, percentualOcupacao: 0.93 },
      { data: "2026-08-14", origem: "REAL", qtdPosicoes: 5525, qtdOcupada: 5135, percentualOcupacao: 0.929 },
      { data: "2026-08-15", origem: "REAL", qtdPosicoes: 5525, qtdOcupada: 5130, percentualOcupacao: 0.928 },
      { data: "2026-08-16", origem: "REAL", qtdPosicoes: 5525, qtdOcupada: 5125, percentualOcupacao: 0.928 },
      { data: "2026-08-17", origem: "REAL", qtdPosicoes: 5525, qtdOcupada: 5122, percentualOcupacao: 0.927 },
      { data: "2026-08-18", origem: "REAL", qtdPosicoes: 5525, qtdOcupada: 5120, percentualOcupacao: 0.927 },
      { data: "2026-08-19", origem: "REAL", qtdPosicoes: 5525, qtdOcupada: 5115, percentualOcupacao: 0.926 },
      { data: "2026-08-20", origem: "REAL", qtdPosicoes: 5525, qtdOcupada: 5110, percentualOcupacao: 0.925 },
      { data: "2026-08-21", origem: "REAL", qtdPosicoes: 5525, qtdOcupada: 5108, percentualOcupacao: 0.924 },
      { data: "2026-08-22", origem: "REAL", qtdPosicoes: 5525, qtdOcupada: 5106, percentualOcupacao: 0.924 },
      { data: "2026-08-23", origem: "REAL", qtdPosicoes: 5525, qtdOcupada: 5105, percentualOcupacao: 0.924 },
      { data: "2026-08-24", origem: "REAL", qtdPosicoes: 5525, qtdOcupada: 5105, percentualOcupacao: 0.924 }
    ],
    projecao: [
      { data: "2026-08-25", origem: "PROJETADO", qtdPosicoes: 5525, qtdOcupada: 5100, percentualOcupacao: 0.923 },
      { data: "2026-08-26", origem: "PROJETADO", qtdPosicoes: 5525, qtdOcupada: 5100, percentualOcupacao: 0.923 },
      { data: "2026-08-27", origem: "PROJETADO", qtdPosicoes: 5525, qtdOcupada: 5100, percentualOcupacao: 0.923 },
      { data: "2026-08-28", origem: "PROJETADO", qtdPosicoes: 5525, qtdOcupada: 5100, percentualOcupacao: 0.923 },
      { data: "2026-08-29", origem: "PROJETADO", qtdPosicoes: 5525, qtdOcupada: 5100, percentualOcupacao: 0.923 },
      { data: "2026-08-30", origem: "PROJETADO", qtdPosicoes: 5525, qtdOcupada: 5100, percentualOcupacao: 0.923 },
      { data: "2026-08-31", origem: "PROJETADO", qtdPosicoes: 5525, qtdOcupada: 5100, percentualOcupacao: 0.923 },
      { data: "2026-09-01", origem: "PROJETADO", qtdPosicoes: 5525, qtdOcupada: 5100, percentualOcupacao: 0.923 },
      { data: "2026-09-02", origem: "PROJETADO", qtdPosicoes: 5525, qtdOcupada: 5100, percentualOcupacao: 0.923 },
      { data: "2026-09-03", origem: "PROJETADO", qtdPosicoes: 5525, qtdOcupada: 5100, percentualOcupacao: 0.923 },
      { data: "2026-09-04", origem: "PROJETADO", qtdPosicoes: 5525, qtdOcupada: 5100, percentualOcupacao: 0.923 },
      { data: "2026-09-05", origem: "PROJETADO", qtdPosicoes: 5525, qtdOcupada: 5100, percentualOcupacao: 0.923 },
      { data: "2026-09-06", origem: "PROJETADO", qtdPosicoes: 5525, qtdOcupada: 5100, percentualOcupacao: 0.923 },
      { data: "2026-09-07", origem: "PROJETADO", qtdPosicoes: 5525, qtdOcupada: 5100, percentualOcupacao: 0.923 }
    ]
  },
  {
    cd: 1965,
    categoria: "Mercearia",
    subCategoria: "Liquida 7801",
    historico: [
      { data: "2026-08-11", origem: "REAL", qtdPosicoes: 2772, qtdOcupada: 58, percentualOcupacao: 0.021 },
      { data: "2026-08-12", origem: "REAL", qtdPosicoes: 2772, qtdOcupada: 58, percentualOcupacao: 0.021 },
      { data: "2026-08-13", origem: "REAL", qtdPosicoes: 2772, qtdOcupada: 59, percentualOcupacao: 0.021 },
      { data: "2026-08-14", origem: "REAL", qtdPosicoes: 2772, qtdOcupada: 59, percentualOcupacao: 0.021 },
      { data: "2026-08-15", origem: "REAL", qtdPosicoes: 2772, qtdOcupada: 60, percentualOcupacao: 0.022 },
      { data: "2026-08-16", origem: "REAL", qtdPosicoes: 2772, qtdOcupada: 60, percentualOcupacao: 0.022 },
      { data: "2026-08-17", origem: "REAL", qtdPosicoes: 2772, qtdOcupada: 60, percentualOcupacao: 0.022 },
      { data: "2026-08-18", origem: "REAL", qtdPosicoes: 2772, qtdOcupada: 60, percentualOcupacao: 0.022 },
      { data: "2026-08-19", origem: "REAL", qtdPosicoes: 2772, qtdOcupada: 60, percentualOcupacao: 0.022 },
      { data: "2026-08-20", origem: "REAL", qtdPosicoes: 2772, qtdOcupada: 61, percentualOcupacao: 0.022 },
      { data: "2026-08-21", origem: "REAL", qtdPosicoes: 2772, qtdOcupada: 61, percentualOcupacao: 0.022 },
      { data: "2026-08-22", origem: "REAL", qtdPosicoes: 2772, qtdOcupada: 61, percentualOcupacao: 0.022 },
      { data: "2026-08-23", origem: "REAL", qtdPosicoes: 2772, qtdOcupada: 61, percentualOcupacao: 0.022 },
      { data: "2026-08-24", origem: "REAL", qtdPosicoes: 2772, qtdOcupada: 61, percentualOcupacao: 0.022 }
    ],
    projecao: [
      { data: "2026-08-25", origem: "PROJETADO", qtdPosicoes: 2772, qtdOcupada: 61, percentualOcupacao: 0.022 },
      { data: "2026-08-26", origem: "PROJETADO", qtdPosicoes: 2772, qtdOcupada: 62, percentualOcupacao: 0.022 },
      { data: "2026-08-27", origem: "PROJETADO", qtdPosicoes: 2772, qtdOcupada: 62, percentualOcupacao: 0.022 },
      { data: "2026-08-28", origem: "PROJETADO", qtdPosicoes: 2772, qtdOcupada: 62, percentualOcupacao: 0.022 },
      { data: "2026-08-29", origem: "PROJETADO", qtdPosicoes: 2772, qtdOcupada: 63, percentualOcupacao: 0.023 },
      { data: "2026-08-30", origem: "PROJETADO", qtdPosicoes: 2772, qtdOcupada: 63, percentualOcupacao: 0.023 },
      { data: "2026-08-31", origem: "PROJETADO", qtdPosicoes: 2772, qtdOcupada: 63, percentualOcupacao: 0.023 },
      { data: "2026-09-01", origem: "PROJETADO", qtdPosicoes: 2772, qtdOcupada: 64, percentualOcupacao: 0.023 },
      { data: "2026-09-02", origem: "PROJETADO", qtdPosicoes: 2772, qtdOcupada: 64, percentualOcupacao: 0.023 },
      { data: "2026-09-03", origem: "PROJETADO", qtdPosicoes: 2772, qtdOcupada: 64, percentualOcupacao: 0.023 },
      { data: "2026-09-04", origem: "PROJETADO", qtdPosicoes: 2772, qtdOcupada: 65, percentualOcupacao: 0.023 },
      { data: "2026-09-05", origem: "PROJETADO", qtdPosicoes: 2772, qtdOcupada: 65, percentualOcupacao: 0.023 },
      { data: "2026-09-06", origem: "PROJETADO", qtdPosicoes: 2772, qtdOcupada: 65, percentualOcupacao: 0.023 },
      { data: "2026-09-07", origem: "PROJETADO", qtdPosicoes: 2772, qtdOcupada: 66, percentualOcupacao: 0.024 }
    ]
  },
  {
    cd: 1965,
    categoria: "Mercearia",
    subCategoria: "Mercearia Basica",
    historico: [
      { data: "2026-08-11", origem: "REAL", qtdPosicoes: 3277, qtdOcupada: 2855, percentualOcupacao: 0.871 },
      { data: "2026-08-12", origem: "REAL", qtdPosicoes: 3277, qtdOcupada: 2850, percentualOcupacao: 0.87 },
      { data: "2026-08-13", origem: "REAL", qtdPosicoes: 3277, qtdOcupada: 2848, percentualOcupacao: 0.869 },
      { data: "2026-08-14", origem: "REAL", qtdPosicoes: 3277, qtdOcupada: 2845, percentualOcupacao: 0.868 },
      { data: "2026-08-15", origem: "REAL", qtdPosicoes: 3277, qtdOcupada: 2844, percentualOcupacao: 0.868 },
      { data: "2026-08-16", origem: "REAL", qtdPosicoes: 3277, qtdOcupada: 2842, percentualOcupacao: 0.867 },
      { data: "2026-08-17", origem: "REAL", qtdPosicoes: 3277, qtdOcupada: 2841, percentualOcupacao: 0.867 },
      { data: "2026-08-18", origem: "REAL", qtdPosicoes: 3277, qtdOcupada: 2840, percentualOcupacao: 0.867 },
      { data: "2026-08-19", origem: "REAL", qtdPosicoes: 3277, qtdOcupada: 2838, percentualOcupacao: 0.866 },
      { data: "2026-08-20", origem: "REAL", qtdPosicoes: 3277, qtdOcupada: 2836, percentualOcupacao: 0.865 },
      { data: "2026-08-21", origem: "REAL", qtdPosicoes: 3277, qtdOcupada: 2835, percentualOcupacao: 0.865 },
      { data: "2026-08-22", origem: "REAL", qtdPosicoes: 3277, qtdOcupada: 2835, percentualOcupacao: 0.865 },
      { data: "2026-08-23", origem: "REAL", qtdPosicoes: 3277, qtdOcupada: 2835, percentualOcupacao: 0.865 },
      { data: "2026-08-24", origem: "REAL", qtdPosicoes: 3277, qtdOcupada: 2835, percentualOcupacao: 0.865 }
    ],
    projecao: [
      { data: "2026-08-25", origem: "PROJETADO", qtdPosicoes: 3277, qtdOcupada: 2840, percentualOcupacao: 0.867 },
      { data: "2026-08-26", origem: "PROJETADO", qtdPosicoes: 3277, qtdOcupada: 2840, percentualOcupacao: 0.867 },
      { data: "2026-08-27", origem: "PROJETADO", qtdPosicoes: 3277, qtdOcupada: 2840, percentualOcupacao: 0.867 },
      { data: "2026-08-28", origem: "PROJETADO", qtdPosicoes: 3277, qtdOcupada: 2840, percentualOcupacao: 0.867 },
      { data: "2026-08-29", origem: "PROJETADO", qtdPosicoes: 3277, qtdOcupada: 2840, percentualOcupacao: 0.867 },
      { data: "2026-08-30", origem: "PROJETADO", qtdPosicoes: 3277, qtdOcupada: 2840, percentualOcupacao: 0.867 },
      { data: "2026-08-31", origem: "PROJETADO", qtdPosicoes: 3277, qtdOcupada: 2840, percentualOcupacao: 0.867 },
      { data: "2026-09-01", origem: "PROJETADO", qtdPosicoes: 3277, qtdOcupada: 2845, percentualOcupacao: 0.868 },
      { data: "2026-09-02", origem: "PROJETADO", qtdPosicoes: 3277, qtdOcupada: 2845, percentualOcupacao: 0.868 },
      { data: "2026-09-03", origem: "PROJETADO", qtdPosicoes: 3277, qtdOcupada: 2850, percentualOcupacao: 0.87 },
      { data: "2026-09-04", origem: "PROJETADO", qtdPosicoes: 3277, qtdOcupada: 2850, percentualOcupacao: 0.87 },
      { data: "2026-09-05", origem: "PROJETADO", qtdPosicoes: 3277, qtdOcupada: 2855, percentualOcupacao: 0.871 },
      { data: "2026-09-06", origem: "PROJETADO", qtdPosicoes: 3277, qtdOcupada: 2855, percentualOcupacao: 0.871 },
      { data: "2026-09-07", origem: "PROJETADO", qtdPosicoes: 3277, qtdOcupada: 2860, percentualOcupacao: 0.873 }
    ]
  },
  {
    cd: 1965,
    categoria: "Mercearia",
    subCategoria: "Mercearia Complementar",
    historico: [
      { data: "2026-08-11", origem: "REAL", qtdPosicoes: 15195, qtdOcupada: 13910, percentualOcupacao: 0.915 },
      { data: "2026-08-12", origem: "REAL", qtdPosicoes: 15195, qtdOcupada: 13905, percentualOcupacao: 0.915 },
      { data: "2026-08-13", origem: "REAL", qtdPosicoes: 15195, qtdOcupada: 13900, percentualOcupacao: 0.915 },
      { data: "2026-08-14", origem: "REAL", qtdPosicoes: 15195, qtdOcupada: 13895, percentualOcupacao: 0.914 },
      { data: "2026-08-15", origem: "REAL", qtdPosicoes: 15195, qtdOcupada: 13895, percentualOcupacao: 0.914 },
      { data: "2026-08-16", origem: "REAL", qtdPosicoes: 15195, qtdOcupada: 13892, percentualOcupacao: 0.914 },
      { data: "2026-08-17", origem: "REAL", qtdPosicoes: 15195, qtdOcupada: 13890, percentualOcupacao: 0.914 },
      { data: "2026-08-18", origem: "REAL", qtdPosicoes: 15195, qtdOcupada: 13890, percentualOcupacao: 0.914 },
      { data: "2026-08-19", origem: "REAL", qtdPosicoes: 15195, qtdOcupada: 13885, percentualOcupacao: 0.914 },
      { data: "2026-08-20", origem: "REAL", qtdPosicoes: 15195, qtdOcupada: 13880, percentualOcupacao: 0.913 },
      { data: "2026-08-21", origem: "REAL", qtdPosicoes: 15195, qtdOcupada: 13875, percentualOcupacao: 0.913 },
      { data: "2026-08-22", origem: "REAL", qtdPosicoes: 15195, qtdOcupada: 13874, percentualOcupacao: 0.913 },
      { data: "2026-08-23", origem: "REAL", qtdPosicoes: 15195, qtdOcupada: 13873, percentualOcupacao: 0.913 },
      { data: "2026-08-24", origem: "REAL", qtdPosicoes: 15195, qtdOcupada: 13873, percentualOcupacao: 0.913 }
    ],
    projecao: [
      { data: "2026-08-25", origem: "PROJETADO", qtdPosicoes: 15195, qtdOcupada: 13900, percentualOcupacao: 0.915 },
      { data: "2026-08-26", origem: "PROJETADO", qtdPosicoes: 15195, qtdOcupada: 13900, percentualOcupacao: 0.915 },
      { data: "2026-08-27", origem: "PROJETADO", qtdPosicoes: 15195, qtdOcupada: 13900, percentualOcupacao: 0.915 },
      { data: "2026-08-28", origem: "PROJETADO", qtdPosicoes: 15195, qtdOcupada: 13900, percentualOcupacao: 0.915 },
      { data: "2026-08-29", origem: "PROJETADO", qtdPosicoes: 15195, qtdOcupada: 13900, percentualOcupacao: 0.915 },
      { data: "2026-08-30", origem: "PROJETADO", qtdPosicoes: 15195, qtdOcupada: 13900, percentualOcupacao: 0.915 },
      { data: "2026-08-31", origem: "PROJETADO", qtdPosicoes: 15195, qtdOcupada: 13900, percentualOcupacao: 0.915 },
      { data: "2026-09-01", origem: "PROJETADO", qtdPosicoes: 15195, qtdOcupada: 13910, percentualOcupacao: 0.915 },
      { data: "2026-09-02", origem: "PROJETADO", qtdPosicoes: 15195, qtdOcupada: 13910, percentualOcupacao: 0.915 },
      { data: "2026-09-03", origem: "PROJETADO", qtdPosicoes: 15195, qtdOcupada: 13920, percentualOcupacao: 0.916 },
      { data: "2026-09-04", origem: "PROJETADO", qtdPosicoes: 15195, qtdOcupada: 13920, percentualOcupacao: 0.916 },
      { data: "2026-09-05", origem: "PROJETADO", qtdPosicoes: 15195, qtdOcupada: 13930, percentualOcupacao: 0.917 },
      { data: "2026-09-06", origem: "PROJETADO", qtdPosicoes: 15195, qtdOcupada: 13930, percentualOcupacao: 0.917 },
      { data: "2026-09-07", origem: "PROJETADO", qtdPosicoes: 15195, qtdOcupada: 13940, percentualOcupacao: 0.917 }
    ]
  },
  {
    cd: 1965,
    categoria: "Mercearia",
    subCategoria: "Papel Higienico",
    historico: [
      { data: "2026-08-11", origem: "REAL", qtdPosicoes: 480, qtdOcupada: 450, percentualOcupacao: 0.938 },
      { data: "2026-08-12", origem: "REAL", qtdPosicoes: 480, qtdOcupada: 452, percentualOcupacao: 0.942 },
      { data: "2026-08-13", origem: "REAL", qtdPosicoes: 480, qtdOcupada: 454, percentualOcupacao: 0.946 },
      { data: "2026-08-14", origem: "REAL", qtdPosicoes: 480, qtdOcupada: 455, percentualOcupacao: 0.948 },
      { data: "2026-08-15", origem: "REAL", qtdPosicoes: 480, qtdOcupada: 455, percentualOcupacao: 0.948 },
      { data: "2026-08-16", origem: "REAL", qtdPosicoes: 480, qtdOcupada: 456, percentualOcupacao: 0.95 },
      { data: "2026-08-17", origem: "REAL", qtdPosicoes: 480, qtdOcupada: 456, percentualOcupacao: 0.95 },
      { data: "2026-08-18", origem: "REAL", qtdPosicoes: 480, qtdOcupada: 456, percentualOcupacao: 0.95 },
      { data: "2026-08-19", origem: "REAL", qtdPosicoes: 480, qtdOcupada: 456, percentualOcupacao: 0.95 },
      { data: "2026-08-20", origem: "REAL", qtdPosicoes: 480, qtdOcupada: 456, percentualOcupacao: 0.95 },
      { data: "2026-08-21", origem: "REAL", qtdPosicoes: 480, qtdOcupada: 456, percentualOcupacao: 0.95 },
      { data: "2026-08-22", origem: "REAL", qtdPosicoes: 480, qtdOcupada: 456, percentualOcupacao: 0.95 },
      { data: "2026-08-23", origem: "REAL", qtdPosicoes: 480, qtdOcupada: 456, percentualOcupacao: 0.95 },
      { data: "2026-08-24", origem: "REAL", qtdPosicoes: 480, qtdOcupada: 456, percentualOcupacao: 0.95 }
    ],
    projecao: [
      { data: "2026-08-25", origem: "PROJETADO", qtdPosicoes: 480, qtdOcupada: 456, percentualOcupacao: 0.95 },
      { data: "2026-08-26", origem: "PROJETADO", qtdPosicoes: 480, qtdOcupada: 456, percentualOcupacao: 0.95 },
      { data: "2026-08-27", origem: "PROJETADO", qtdPosicoes: 480, qtdOcupada: 456, percentualOcupacao: 0.95 },
      { data: "2026-08-28", origem: "PROJETADO", qtdPosicoes: 480, qtdOcupada: 456, percentualOcupacao: 0.95 },
      { data: "2026-08-29", origem: "PROJETADO", qtdPosicoes: 480, qtdOcupada: 456, percentualOcupacao: 0.95 },
      { data: "2026-08-30", origem: "PROJETADO", qtdPosicoes: 480, qtdOcupada: 456, percentualOcupacao: 0.95 },
      { data: "2026-08-31", origem: "PROJETADO", qtdPosicoes: 480, qtdOcupada: 456, percentualOcupacao: 0.95 },
      { data: "2026-09-01", origem: "PROJETADO", qtdPosicoes: 480, qtdOcupada: 456, percentualOcupacao: 0.95 },
      { data: "2026-09-02", origem: "PROJETADO", qtdPosicoes: 480, qtdOcupada: 458, percentualOcupacao: 0.954 },
      { data: "2026-09-03", origem: "PROJETADO", qtdPosicoes: 480, qtdOcupada: 458, percentualOcupacao: 0.954 },
      { data: "2026-09-04", origem: "PROJETADO", qtdPosicoes: 480, qtdOcupada: 460, percentualOcupacao: 0.958 },
      { data: "2026-09-05", origem: "PROJETADO", qtdPosicoes: 480, qtdOcupada: 460, percentualOcupacao: 0.958 },
      { data: "2026-09-06", origem: "PROJETADO", qtdPosicoes: 480, qtdOcupada: 462, percentualOcupacao: 0.963 },
      { data: "2026-09-07", origem: "PROJETADO", qtdPosicoes: 480, qtdOcupada: 462, percentualOcupacao: 0.963 }
    ]
  },
  {
    cd: 1965,
    categoria: "Mercearia",
    subCategoria: "Par",
    historico: [
      { data: "2026-08-11", origem: "REAL", qtdPosicoes: 2182, qtdOcupada: 550, percentualOcupacao: 0.252 },
      { data: "2026-08-12", origem: "REAL", qtdPosicoes: 2182, qtdOcupada: 552, percentualOcupacao: 0.253 },
      { data: "2026-08-13", origem: "REAL", qtdPosicoes: 2182, qtdOcupada: 554, percentualOcupacao: 0.254 },
      { data: "2026-08-14", origem: "REAL", qtdPosicoes: 2182, qtdOcupada: 555, percentualOcupacao: 0.254 },
      { data: "2026-08-15", origem: "REAL", qtdPosicoes: 2182, qtdOcupada: 555, percentualOcupacao: 0.254 },
      { data: "2026-08-16", origem: "REAL", qtdPosicoes: 2182, qtdOcupada: 556, percentualOcupacao: 0.255 },
      { data: "2026-08-17", origem: "REAL", qtdPosicoes: 2182, qtdOcupada: 557, percentualOcupacao: 0.255 },
      { data: "2026-08-18", origem: "REAL", qtdPosicoes: 2182, qtdOcupada: 558, percentualOcupacao: 0.256 },
      { data: "2026-08-19", origem: "REAL", qtdPosicoes: 2182, qtdOcupada: 557, percentualOcupacao: 0.255 },
      { data: "2026-08-20", origem: "REAL", qtdPosicoes: 2182, qtdOcupada: 557, percentualOcupacao: 0.255 },
      { data: "2026-08-21", origem: "REAL", qtdPosicoes: 2182, qtdOcupada: 557, percentualOcupacao: 0.255 },
      { data: "2026-08-22", origem: "REAL", qtdPosicoes: 2182, qtdOcupada: 557, percentualOcupacao: 0.255 },
      { data: "2026-08-23", origem: "REAL", qtdPosicoes: 2182, qtdOcupada: 557, percentualOcupacao: 0.255 },
      { data: "2026-08-24", origem: "REAL", qtdPosicoes: 2182, qtdOcupada: 558, percentualOcupacao: 0.256 }
    ],
    projecao: [
      { data: "2026-08-25", origem: "PROJETADO", qtdPosicoes: 2182, qtdOcupada: 558, percentualOcupacao: 0.256 },
      { data: "2026-08-26", origem: "PROJETADO", qtdPosicoes: 2182, qtdOcupada: 559, percentualOcupacao: 0.256 },
      { data: "2026-08-27", origem: "PROJETADO", qtdPosicoes: 2182, qtdOcupada: 560, percentualOcupacao: 0.257 },
      { data: "2026-08-28", origem: "PROJETADO", qtdPosicoes: 2182, qtdOcupada: 560, percentualOcupacao: 0.257 },
      { data: "2026-08-29", origem: "PROJETADO", qtdPosicoes: 2182, qtdOcupada: 562, percentualOcupacao: 0.258 },
      { data: "2026-08-30", origem: "PROJETADO", qtdPosicoes: 2182, qtdOcupada: 563, percentualOcupacao: 0.258 },
      { data: "2026-08-31", origem: "PROJETADO", qtdPosicoes: 2182, qtdOcupada: 565, percentualOcupacao: 0.259 },
      { data: "2026-09-01", origem: "PROJETADO", qtdPosicoes: 2182, qtdOcupada: 566, percentualOcupacao: 0.259 },
      { data: "2026-09-02", origem: "PROJETADO", qtdPosicoes: 2182, qtdOcupada: 568, percentualOcupacao: 0.26 },
      { data: "2026-09-03", origem: "PROJETADO", qtdPosicoes: 2182, qtdOcupada: 570, percentualOcupacao: 0.261 },
      { data: "2026-09-04", origem: "PROJETADO", qtdPosicoes: 2182, qtdOcupada: 572, percentualOcupacao: 0.262 },
      { data: "2026-09-05", origem: "PROJETADO", qtdPosicoes: 2182, qtdOcupada: 575, percentualOcupacao: 0.264 },
      { data: "2026-09-06", origem: "PROJETADO", qtdPosicoes: 2182, qtdOcupada: 578, percentualOcupacao: 0.265 },
      { data: "2026-09-07", origem: "PROJETADO", qtdPosicoes: 2182, qtdOcupada: 580, percentualOcupacao: 0.266 }
    ]
  },
  {
    cd: 1965,
    categoria: "Mercearia",
    subCategoria: "Pet",
    historico: [
      { data: "2026-08-11", origem: "REAL", qtdPosicoes: 1494, qtdOcupada: 1125, percentualOcupacao: 0.753 },
      { data: "2026-08-12", origem: "REAL", qtdPosicoes: 1494, qtdOcupada: 1128, percentualOcupacao: 0.755 },
      { data: "2026-08-13", origem: "REAL", qtdPosicoes: 1494, qtdOcupada: 1130, percentualOcupacao: 0.756 },
      { data: "2026-08-14", origem: "REAL", qtdPosicoes: 1494, qtdOcupada: 1132, percentualOcupacao: 0.758 },
      { data: "2026-08-15", origem: "REAL", qtdPosicoes: 1494, qtdOcupada: 1135, percentualOcupacao: 0.76 },
      { data: "2026-08-16", origem: "REAL", qtdPosicoes: 1494, qtdOcupada: 1137, percentualOcupacao: 0.761 },
      { data: "2026-08-17", origem: "REAL", qtdPosicoes: 1494, qtdOcupada: 1138, percentualOcupacao: 0.762 },
      { data: "2026-08-18", origem: "REAL", qtdPosicoes: 1494, qtdOcupada: 1139, percentualOcupacao: 0.762 },
      { data: "2026-08-19", origem: "REAL", qtdPosicoes: 1494, qtdOcupada: 1142, percentualOcupacao: 0.764 },
      { data: "2026-08-20", origem: "REAL", qtdPosicoes: 1494, qtdOcupada: 1144, percentualOcupacao: 0.766 },
      { data: "2026-08-21", origem: "REAL", qtdPosicoes: 1494, qtdOcupada: 1146, percentualOcupacao: 0.767 },
      { data: "2026-08-22", origem: "REAL", qtdPosicoes: 1494, qtdOcupada: 1146, percentualOcupacao: 0.767 },
      { data: "2026-08-23", origem: "REAL", qtdPosicoes: 1494, qtdOcupada: 1146, percentualOcupacao: 0.767 },
      { data: "2026-08-24", origem: "REAL", qtdPosicoes: 1494, qtdOcupada: 1146, percentualOcupacao: 0.767 }
    ],
    projecao: [
      { data: "2026-08-25", origem: "PROJETADO", qtdPosicoes: 1494, qtdOcupada: 1146, percentualOcupacao: 0.767 },
      { data: "2026-08-26", origem: "PROJETADO", qtdPosicoes: 1494, qtdOcupada: 1146, percentualOcupacao: 0.767 },
      { data: "2026-08-27", origem: "PROJETADO", qtdPosicoes: 1494, qtdOcupada: 1146, percentualOcupacao: 0.767 },
      { data: "2026-08-28", origem: "PROJETADO", qtdPosicoes: 1494, qtdOcupada: 1146, percentualOcupacao: 0.767 },
      { data: "2026-08-29", origem: "PROJETADO", qtdPosicoes: 1494, qtdOcupada: 1146, percentualOcupacao: 0.767 },
      { data: "2026-08-30", origem: "PROJETADO", qtdPosicoes: 1494, qtdOcupada: 1146, percentualOcupacao: 0.767 },
      { data: "2026-08-31", origem: "PROJETADO", qtdPosicoes: 1494, qtdOcupada: 1146, percentualOcupacao: 0.767 },
      { data: "2026-09-01", origem: "PROJETADO", qtdPosicoes: 1494, qtdOcupada: 1150, percentualOcupacao: 0.77 },
      { data: "2026-09-02", origem: "PROJETADO", qtdPosicoes: 1494, qtdOcupada: 1152, percentualOcupacao: 0.771 },
      { data: "2026-09-03", origem: "PROJETADO", qtdPosicoes: 1494, qtdOcupada: 1155, percentualOcupacao: 0.773 },
      { data: "2026-09-04", origem: "PROJETADO", qtdPosicoes: 1494, qtdOcupada: 1158, percentualOcupacao: 0.775 },
      { data: "2026-09-05", origem: "PROJETADO", qtdPosicoes: 1494, qtdOcupada: 1160, percentualOcupacao: 0.776 },
      { data: "2026-09-06", origem: "PROJETADO", qtdPosicoes: 1494, qtdOcupada: 1162, percentualOcupacao: 0.778 },
      { data: "2026-09-07", origem: "PROJETADO", qtdPosicoes: 1494, qtdOcupada: 1165, percentualOcupacao: 0.78 }
    ]
  }
];

// Color palette mapping for distinct subcategories matching the visual archetype
const SUBCATEGORY_COLORS: Record<string, { color: string; gradient: [string, string] }> = {
  "Bazar": { color: "#f59e0b", gradient: ["#f59e0b", "#d97706"] },
  "Blocado": { color: "#a855f7", gradient: ["#a855f7", "#7e22ce"] },
  "Dinamico": { color: "#0d9488", gradient: ["#0d9488", "#0f766e"] },
  "Dph": { color: "#7c3aed", gradient: ["#7c3aed", "#6d28d9"] },
  "Fefo E Bloqueio": { color: "#e11d48", gradient: ["#e11d48", "#9f1239"] },
  "Liquida": { color: "#059669", gradient: ["#059669", "#047857"] },
  "Liquida 7801": { color: "#65a30d", gradient: ["#65a30d", "#4d7c0f"] },
  "Mercearia Basica": { color: "#06b6d4", gradient: ["#06b6d4", "#0284c7"] },
  "Mercearia Complementar": { color: "#2563eb", gradient: ["#2563eb", "#1d4ed8"] },
  "Papel Higienico": { color: "#8b5cf6", gradient: ["#8b5cf6", "#6d28d9"] },
  "Par": { color: "#f97316", gradient: ["#f97316", "#c2410c"] },
  "Pet": { color: "#ec4899", gradient: ["#ec4899", "#be185d"] }
};

// CD List
const CDS_LIST = [
  { id: 1965, name: "CD 1965 (Osasco)" },
];

// Helper to calculate consecutive date strings (YYYY-MM-DD)
function getNextDateStr(dateStr: string, daysToAdd: number = 1): string {
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(Date.UTC(year, month, day + daysToAdd));
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, "0");
      const d = String(date.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  } catch (e) {
    console.error("Erro ao calcular próxima data:", e);
  }
  return dateStr;
}

// =========================================================================
// 📈 FUNÇÃO CORRIGIDA DE EXTRAÇÃO DE PERCENTUAL
// =========================================================================
const extractPercentage = (item: any): number | null => {
  if (!item || item.percentualOcupacao === undefined || item.percentualOcupacao === null) {
    return null;
  }
  const value = item.percentualOcupacao;
  
  // 🔥 CORREÇÃO: Valores menores que 2 são decimais (0.xxx = 84.8%)
  // Valores maiores ou iguais a 2 já estão em percentual (84.8)
  // Isso garante que 1.1 seja convertido para 110%
  if (value < 2) {
    return Math.round(value * 1000) / 10;
  }
  
  return Math.round(value * 10) / 10;
};

// Global memory cache to persist painel estoque data across tab switches (Stale-While-Revalidate pattern)
let cachedPainelEstoqueDatasets: Record<number, PainelEstoqueSubCategoria[]> | null = null;
let hasLoadedOcupacaoOncePerLogin: boolean = false;

export function resetDashboardOcupacaoCache() {
  cachedPainelEstoqueDatasets = null;
  hasLoadedOcupacaoOncePerLogin = false;
  try {
    sessionStorage.removeItem("logistics_ocupacao_loaded_session");
  } catch {}
}

export default function DashboardOcupacao({
  theme,
  showNotification,
  user,
  onPageChange,
  onThemeToggle,
  onLogout
}: DashboardOcupacaoProps) {
  const isDark = theme === "dark";

  // State
  const [selectedCd, setSelectedCd] = useState<number>(1965);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [projectionMode, setProjectionMode] = useState<"real" | "projecao">("projecao");
  const [categoryChartMode, setCategoryChartMode] = useState<"volume" | "percent">("volume");
  const [isChartMaximized, setIsChartMaximized] = useState<boolean>(false);
  const [searchPlu, setSearchPlu] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Loading state: active only once per login session if cache is not ready
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    try {
      const sessionLoaded = sessionStorage.getItem("logistics_ocupacao_loaded_session");
      if (sessionLoaded === "true" || hasLoadedOcupacaoOncePerLogin) {
        return false;
      }
      return !cachedPainelEstoqueDatasets;
    } catch {
      return !cachedPainelEstoqueDatasets && !hasLoadedOcupacaoOncePerLogin;
    }
  });

  const [painelData, setPainelData] = useState<PainelEstoqueSubCategoria[]>(() => {
    if (cachedPainelEstoqueDatasets && cachedPainelEstoqueDatasets[1965]) {
      return cachedPainelEstoqueDatasets[1965];
    }
    return DEFAULT_PAINEL_ESTOQUE;
  });
  const [latestDateStr, setLatestDateStr] = useState<string>("2026-08-24");

  // Fetch from API: /api/painel-estoque?cd=${selectedCd} with fast caching (Stale-While-Revalidate)
  const fetchPainelEstoque = async (cd: number, silent = false) => {
    const hasData = cachedPainelEstoqueDatasets && cachedPainelEstoqueDatasets[cd];

    if (!silent && !hasData && !hasLoadedOcupacaoOncePerLogin) {
      setIsLoading(true);
    }

    if (hasData) {
      setPainelData(cachedPainelEstoqueDatasets![cd]);
      let maxDate = "2026-08-24";
      cachedPainelEstoqueDatasets![cd].forEach((item: PainelEstoqueSubCategoria) => {
        if (item.historico && item.historico.length > 0) {
          const lastH = item.historico[item.historico.length - 1].data;
          if (lastH > maxDate) maxDate = lastH;
        }
      });
      setLatestDateStr(maxDate);
    }

    try {
      const res = await fetch(`/api/painel-estoque?cd=${cd}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          if (!cachedPainelEstoqueDatasets) {
            cachedPainelEstoqueDatasets = {};
          }
          cachedPainelEstoqueDatasets[cd] = data;
          setPainelData(data);
          let maxDate = "2026-08-24";
          data.forEach((item: PainelEstoqueSubCategoria) => {
            if (item.historico && item.historico.length > 0) {
              const lastH = item.historico[item.historico.length - 1].data;
              if (lastH > maxDate) maxDate = lastH;
            }
          });
          setLatestDateStr(maxDate);
        }
      }
    } catch (e) {
      console.warn("Erro ao buscar dados do painel de estoque, utilizando cache local:", e);
    } finally {
      hasLoadedOcupacaoOncePerLogin = true;
      try {
        sessionStorage.setItem("logistics_ocupacao_loaded_session", "true");
      } catch {}
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const silentFetch = !!(cachedPainelEstoqueDatasets && cachedPainelEstoqueDatasets[selectedCd]) || hasLoadedOcupacaoOncePerLogin;
    fetchPainelEstoque(selectedCd, silentFetch);
  }, [selectedCd]);

  // Extract all unique dates from historico
  const allHistoricalDates = useMemo(() => {
    const datesSet = new Set<string>();
    painelData.forEach(sub => {
      sub.historico?.forEach(h => {
        if (h.data) datesSet.add(h.data);
      });
    });
    return Array.from(datesSet).sort();
  }, [painelData]);

  // Gerar 7 dias consecutivos a partir da data mais recente
  const realDates = useMemo(() => {
    if (!latestDateStr) return allHistoricalDates.slice(-7);
    
    const dates = [];
    const parts = latestDateStr.split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.UTC(year, month, day - i));
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, "0");
      const d = String(date.getUTCDate()).padStart(2, "0");
      dates.push(`${y}-${m}-${d}`);
    }
    
    return dates;
  }, [latestDateStr]);

  // Extract all unique projection dates
  const allProjectedDates = useMemo(() => {
    const datesSet = new Set<string>();
    painelData.forEach(sub => {
      sub.projecao?.forEach(p => {
        if (p.data) datesSet.add(p.data);
      });
    });
    return Array.from(datesSet).sort();
  }, [painelData]);

  // Always guarantees exactly 14 projection days
  const projDates = useMemo(() => {
    const dates = [...allProjectedDates];
    const baseDate = latestDateStr || "2026-08-24";

    if (dates.length === 0) {
      let cur = baseDate;
      for (let i = 1; i <= 14; i++) {
        cur = getNextDateStr(cur, 1);
        dates.push(cur);
      }
    } else {
      while (dates.length < 14) {
        const lastDate = dates[dates.length - 1];
        dates.push(getNextDateStr(lastDate, 1));
      }
    }
    return dates.slice(0, 14);
  }, [allProjectedDates, latestDateStr]);

  // Categories computed for the MOST CURRENT DAY
  const categories: CategoryStat[] = useMemo(() => {
    return painelData.map((sub, idx) => {
      const histItem = sub.historico?.find(h => h.data === latestDateStr) || 
                       sub.historico?.[sub.historico.length - 1] || {
                         data: latestDateStr,
                         origem: "REAL",
                         qtdPosicoes: 1000,
                         qtdOcupada: 500,
                         percentualOcupacao: 0.5
                       };

      const pal = histItem.qtdOcupada;
      const cap = histItem.qtdPosicoes;
      
      // 🔥 CORREÇÃO: Usar a função extractPercentage para obter o percentual
      const pct = extractPercentage(histItem) ?? (cap > 0 ? Math.round((pal / cap) * 1000) / 10 : 0);
      
      const themeColors = SUBCATEGORY_COLORS[sub.subCategoria] || {
        color: ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#3b82f6"][idx % 6],
        gradient: [["#8b5cf6", "#6d28d9"], ["#06b6d4", "#0284c7"], ["#10b981", "#059669"]][idx % 3] as [string, string]
      };

      return {
        id: sub.subCategoria.toLowerCase().replace(/\s+/g, "_"),
        name: sub.subCategoria,
        pallets: pal,
        capacidade: cap,
        ocupacaoPct: pct,
        color: themeColors.color,
        gradient: themeColors.gradient,
        variacao: (histItem.percentualOcupacao || (cap > 0 ? pal / cap : 0)) > 0.7 ? 4.2 : -1.8,
        giro: (histItem.percentualOcupacao || (cap > 0 ? pal / cap : 0)) > 0.75 ? "Alto" : (histItem.percentualOcupacao || (cap > 0 ? pal / cap : 0)) > 0.4 ? "Médio" : "Estável"
      };
    });
  }, [painelData, latestDateStr]);

  // Dynamic PLU List constructed from real subcategories
  const pluList: PluItem[] = useMemo(() => {
    return categories.map((cat, idx) => ({
      plu: `PLU-${19600 + idx * 11}`,
      descricao: `${cat.name} (${cat.pallets.toLocaleString("pt-BR")} plts)`,
      categoria: cat.name,
      cd: selectedCd,
      pallets: cat.pallets,
      capacidadeMax: cat.capacidade
    }));
  }, [categories, selectedCd]);

  // Filtered PLUs based on Selected Category & Search Query
  const filteredPlus = useMemo(() => {
    return pluList.filter(item => {
      if (selectedCategory !== "all" && item.categoria.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
      if (searchPlu.trim()) {
        const query = searchPlu.toLowerCase();
        return item.plu.toLowerCase().includes(query) || item.descricao.toLowerCase().includes(query) || item.categoria.toLowerCase().includes(query);
      }
      return true;
    });
  }, [pluList, selectedCategory, searchPlu]);

  // Aggregated Stats for Cards on the Most Current Day
  const currentStats = useMemo(() => {
    let totalCap = 0;
    let totalOcup = 0;
    let explicitPct: number | null = null;

    if (selectedCategory === "all") {
      categories.forEach(c => {
        totalCap += c.capacidade;
        totalOcup += c.pallets;
      });
    } else {
      const cat = categories.find(c => c.name.toLowerCase() === selectedCategory.toLowerCase());
      if (cat) {
        totalCap = cat.capacidade;
        totalOcup = cat.pallets;
        explicitPct = cat.ocupacaoPct;
      }
    }

    const totalLivre = Math.max(0, totalCap - totalOcup);
    const taxaOcupacao = explicitPct !== null 
      ? explicitPct 
      : (totalCap > 0 ? Math.round((totalOcup / totalCap) * 1000) / 10 : 0);
    const taxaLivre = Math.max(0, Math.round((100 - taxaOcupacao) * 10) / 10);

    return {
      totalCapacidade: totalCap,
      totalOcupado: totalOcup,
      totalLivre,
      taxaOcupacao,
      taxaLivre
    };
  }, [categories, selectedCategory]);

  // Previous day (Yesterday) date from allHistoricalDates
  const yesterdayDateStr = useMemo(() => {
    if (realDates.length >= 2) {
      return realDates[realDates.length - 2];
    }
    if (allHistoricalDates.length >= 2) {
      return allHistoricalDates[allHistoricalDates.length - 2];
    }
    return null;
  }, [realDates, allHistoricalDates]);

  // Aggregated Stats for Yesterday to calculate Day-over-Day variance
  const yesterdayStats = useMemo(() => {
    let yesterdayCap = 0;
    let yesterdayOcup = 0;
    let yesterdayPct: number | null = null;

    const activeSub = selectedCategory === "all"
      ? painelData
      : painelData.filter(s => s.subCategoria.toLowerCase() === selectedCategory.toLowerCase());

    activeSub.forEach(sub => {
      const histItem = yesterdayDateStr 
        ? sub.historico?.find(h => h.data === yesterdayDateStr) 
        : (sub.historico && sub.historico.length >= 2 ? sub.historico[sub.historico.length - 2] : null);
      
      if (histItem) {
        yesterdayCap += histItem.qtdPosicoes;
        yesterdayOcup += histItem.qtdOcupada;
        if (selectedCategory !== "all") {
          const pct = extractPercentage(histItem);
          if (pct !== null) yesterdayPct = pct;
        }
      }
    });

    const yesterdayLivre = Math.max(0, yesterdayCap - yesterdayOcup);
    const taxaOcupacao = yesterdayPct !== null 
      ? yesterdayPct 
      : (yesterdayCap > 0 ? Math.round((yesterdayOcup / yesterdayCap) * 1000) / 10 : 0);
    const taxaLivre = Math.max(0, Math.round((100 - taxaOcupacao) * 10) / 10);

    return {
      yesterdayCap,
      yesterdayOcup,
      yesterdayLivre,
      taxaOcupacao,
      taxaLivre
    };
  }, [painelData, selectedCategory, yesterdayDateStr]);

  // Differences vs Yesterday for all KPI cards
  const diffMetrics = useMemo(() => {
    const yCap = yesterdayStats.yesterdayCap || currentStats.totalCapacidade;
    const yOcup = yesterdayStats.yesterdayOcup || currentStats.totalOcupado;
    const yLivre = yesterdayStats.yesterdayLivre || currentStats.totalLivre;

    const capDiff = currentStats.totalCapacidade - yCap;
    const capDiffPct = yCap > 0 ? ((currentStats.totalCapacidade - yCap) / yCap) * 100 : 0;

    const ocupDiff = currentStats.totalOcupado - yOcup;
    const ocupDiffPct = yOcup > 0 ? ((currentStats.totalOcupado - yOcup) / yOcup) * 100 : 0;

    const livreDiff = currentStats.totalLivre - yLivre;
    const livreDiffPct = yLivre > 0 ? ((currentStats.totalLivre - yLivre) / yLivre) * 100 : 0;

    return {
      capDiff,
      capDiffPct: Math.round(capDiffPct * 10) / 10,
      ocupDiff,
      ocupDiffPct: Math.round(ocupDiffPct * 10) / 10,
      livreDiff,
      livreDiffPct: Math.round(livreDiffPct * 10) / 10,
      yesterdayDateStr
    };
  }, [currentStats, yesterdayStats, yesterdayDateStr]);

  // Real Historical Day-by-Day Series for the 7 Retroactive Days
  const realHistoryMetrics = useMemo(() => {
    const activeSub = selectedCategory === "all"
      ? painelData
      : painelData.filter(s => s.subCategoria.toLowerCase() === selectedCategory.toLowerCase());

    const capPoints: number[] = [];
    const ocupPoints: number[] = [];
    const livrePoints: number[] = [];

    realDates.forEach(date => {
      let capSum = 0;
      let ocupSum = 0;
      activeSub.forEach(s => {
        const found = s.historico?.find(h => h.data === date);
        if (found) {
          capSum += found.qtdPosicoes;
          ocupSum += found.qtdOcupada;
        } else {
          const previous = s.historico?.filter(h => h.data <= date);
          if (previous && previous.length > 0) {
            const lastPrev = previous[previous.length - 1];
            capSum += lastPrev.qtdPosicoes;
            ocupSum += lastPrev.qtdOcupada;
          } else if (s.historico && s.historico.length > 0) {
            capSum += s.historico[0].qtdPosicoes;
            ocupSum += s.historico[0].qtdOcupada;
          }
        }
      });
      capPoints.push(capSum);
      ocupPoints.push(ocupSum);
      livrePoints.push(Math.max(0, capSum - ocupSum));
    });

    if (capPoints.length > 0 && currentStats.totalCapacidade > 0) {
      capPoints[capPoints.length - 1] = currentStats.totalCapacidade;
      ocupPoints[ocupPoints.length - 1] = currentStats.totalOcupado;
      livrePoints[livrePoints.length - 1] = currentStats.totalLivre;
    }

    return {
      capPoints: capPoints.length > 0 ? capPoints : [currentStats.totalCapacidade],
      ocupPoints: ocupPoints.length > 0 ? ocupPoints : [currentStats.totalOcupado],
      livrePoints: livrePoints.length > 0 ? livrePoints : [currentStats.totalLivre]
    };
  }, [painelData, selectedCategory, realDates, currentStats]);

  // Toggle or select category
  const handleCategoryClick = (catName: string) => {
    if (selectedCategory.toLowerCase() === catName.toLowerCase()) {
      setSelectedCategory("all");
      showNotification(`🔄 Filtro removido. Exibindo todas as categorias.`);
    } else {
      setSelectedCategory(catName);
      showNotification(`🎯 Painel filtrado por categoria: ${catName}`);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPainelEstoque(selectedCd);
    setTimeout(() => {
      setIsRefreshing(false);
      showNotification("⚡ Painel de Ocupação sincronizado em tempo real!");
    }, 300);
  };

  // Sparkline Chart Data Generator with real historical data points & real curvature
  const createSparklineData = (points: number[], color: string, gradientStart: string) => ({
    labels: points.map((_, i) => `D${i + 1}`),
    datasets: [
      {
        data: points,
        borderColor: color,
        borderWidth: 2,
        pointRadius: (ctx: any) => {
          return ctx.dataIndex === points.length - 1 ? (isDark ? 4.5 : 3.5) : 0;
        },
        pointBackgroundColor: isDark ? "#ffffff" : color,
        pointBorderColor: isDark ? color : "#ffffff",
        pointBorderWidth: isDark ? 2.5 : 1.5,
        pointHoverRadius: isDark ? 6.5 : 4.5,
        tension: 0.45,
        fill: true,
        backgroundColor: (context: any) => {
          const ctx = context.chart?.ctx;
          if (!ctx) return gradientStart;
          const gradient = ctx.createLinearGradient(0, 0, 0, 36);
          gradient.addColorStop(0, gradientStart);
          gradient.addColorStop(1, "transparent");
          return gradient;
        }
      }
    ]
  });

  const getSparklineOptions = (points: number[]) => {
    const validPts = points && points.length > 0 ? points : [0];
    const minVal = Math.min(...validPts);
    const maxVal = Math.max(...validPts);
    const range = maxVal - minVal;
    const padding = range === 0 ? Math.max(1, maxVal * 0.05) : range * 0.25;

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      layout: {
        padding: { top: 3, bottom: 3, left: 1, right: 2 }
      },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        datalabels: { display: false }
      },
      scales: {
        x: { display: false },
        y: {
          display: false,
          min: Math.max(0, minVal - padding),
          max: maxVal + padding
        }
      }
    };
  };

  const sparklineCapacidade = useMemo(() => {
    return createSparklineData(
      realHistoryMetrics.capPoints,
      "#f97316",
      isDark ? "rgba(249, 115, 22, 0.25)" : "rgba(249, 115, 22, 0.15)"
    );
  }, [realHistoryMetrics.capPoints, isDark]);

  const sparklineOcupado = useMemo(() => {
    return createSparklineData(
      realHistoryMetrics.ocupPoints,
      "#8b5cf6",
      isDark ? "rgba(139, 92, 246, 0.3)" : "rgba(139, 92, 246, 0.15)"
    );
  }, [realHistoryMetrics.ocupPoints, isDark]);

  const sparklineLivre = useMemo(() => {
    return createSparklineData(
      realHistoryMetrics.livrePoints,
      "#06b6d4",
      isDark ? "rgba(6, 182, 212, 0.3)" : "rgba(6, 182, 212, 0.15)"
    );
  }, [realHistoryMetrics.livrePoints, isDark]);

  const sparklineCapOptions = useMemo(() => getSparklineOptions(realHistoryMetrics.capPoints), [realHistoryMetrics.capPoints]);
  const sparklineOcupOptions = useMemo(() => getSparklineOptions(realHistoryMetrics.ocupPoints), [realHistoryMetrics.ocupPoints]);
  const sparklineLivreOptions = useMemo(() => getSparklineOptions(realHistoryMetrics.livrePoints), [realHistoryMetrics.livrePoints]);

  // =========================================================================
  // 📈 PROJECTION CHART: REAL (7 DIAS) OU PROJETADO (14 DIAS)
  // =========================================================================
  const projectionChartData = useMemo(() => {
    const activeSubcategories = selectedCategory === "all"
      ? painelData
      : painelData.filter(s => s.subCategoria.toLowerCase() === selectedCategory.toLowerCase());

    const isReal = projectionMode === "real";
    const targetDates = isReal ? realDates : projDates;

    const occupiedValues = targetDates.map(d => {
      let sum = 0;
      activeSubcategories.forEach(sub => {
        if (isReal) {
          const foundH = sub.historico?.find(h => h.data === d);
          if (foundH) {
            sum += foundH.qtdOcupada;
          } else {
            const lastH = sub.historico?.[sub.historico.length - 1];
            if (lastH) sum += lastH.qtdOcupada;
          }
        } else {
          const foundP = sub.projecao?.find(p => p.data === d);
          if (foundP) {
            sum += foundP.qtdOcupada;
          } else {
            const lastP = sub.projecao?.[sub.projecao.length - 1];
            const lastH = sub.historico?.[sub.historico.length - 1];
            if (lastP) {
              sum += lastP.qtdOcupada;
            } else if (lastH) {
              sum += lastH.qtdOcupada;
            }
          }
        }
      });
      return sum;
    });

    const capacityValues = targetDates.map(d => {
      let capSum = 0;
      activeSubcategories.forEach(sub => {
        if (isReal) {
          const foundH = sub.historico?.find(h => h.data === d);
          capSum += foundH ? foundH.qtdPosicoes : (sub.historico?.[sub.historico.length - 1]?.qtdPosicoes || 0);
        } else {
          const foundP = sub.projecao?.find(p => p.data === d);
          if (foundP) {
            capSum += foundP.qtdPosicoes;
          } else {
            const lastP = sub.projecao?.[sub.projecao.length - 1];
            const lastH = sub.historico?.[sub.historico.length - 1];
            capSum += lastP ? lastP.qtdPosicoes : (lastH ? lastH.qtdPosicoes : 0);
          }
        }
      });
      return capSum;
    });

    // 🔥 CORREÇÃO: Extrair percentual usando a função extractPercentage
    const percentageValues = targetDates.map(d => {
      let totalPercentual = 0;
      let countWithPercentual = 0;
      let totalOccup = 0;
      let totalCap = 0;

      activeSubcategories.forEach(sub => {
        const item = isReal
          ? sub.historico?.find(h => h.data === d) || sub.historico?.[sub.historico.length - 1]
          : sub.projecao?.find(p => p.data === d) || sub.projecao?.[sub.projecao.length - 1];
        
        if (item) {
          const pct = extractPercentage(item);
          
          if (pct !== null) {
            totalPercentual += pct;
            countWithPercentual++;
          }
          
          totalOccup += item.qtdOcupada;
          totalCap += item.qtdPosicoes;
        }
      });

      if (countWithPercentual === activeSubcategories.length && countWithPercentual > 0) {
        const avgPct = totalPercentual / countWithPercentual;
        return Math.round(avgPct * 10) / 10;
      }

      return totalCap > 0 ? Math.round((totalOccup / totalCap) * 1000) / 10 : 0;
    });

    const alertValues = capacityValues.map(c => Math.round(c * 0.85));

    const labels = targetDates.map(d => {
      const parts = d.split("-");
      return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
    });

    if (categoryChartMode === "percent") {
      return {
        labels,
        percentages: percentageValues,
        datasets: [
          {
            type: "line" as const,
            label: isReal ? "Taxa Real de Ocupação (%)" : "Taxa Projetada de Ocupação (%)",
            data: percentageValues,
            percentages: percentageValues,
            borderColor: isReal ? "#8b5cf6" : "#06b6d4",
            backgroundColor: (context: any) => {
              const ctx = context.chart?.ctx;
              if (!ctx) return isReal ? "rgba(139, 92, 246, 0.2)" : "rgba(6, 182, 212, 0.2)";
              const gradient = ctx.createLinearGradient(0, 0, 0, 200);
              gradient.addColorStop(0, isReal ? (isDark ? "rgba(139, 92, 246, 0.35)" : "rgba(139, 92, 246, 0.2)") : (isDark ? "rgba(6, 182, 212, 0.35)" : "rgba(6, 182, 212, 0.2)"));
              gradient.addColorStop(1, "transparent");
              return gradient;
            },
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            pointRadius: isDark ? 5 : 4,
            pointHoverRadius: isDark ? 8 : 6,
            pointBackgroundColor: isDark ? "#ffffff" : (isReal ? "#8b5cf6" : "#06b6d4"),
            pointBorderColor: isDark ? (isReal ? "#c084fc" : "#38bdf8") : "#ffffff",
            pointBorderWidth: isDark ? 2.5 : 1.5,
            pointHoverBackgroundColor: isDark ? "#ffffff" : (isReal ? "#7c3aed" : "#0891b2"),
            pointHoverBorderColor: isDark ? (isReal ? "#f3e8ff" : "#e0f2fe") : "#ffffff",
            pointHoverBorderWidth: isDark ? 4 : 2,
            order: 1
          },
          {
            type: "line" as const,
            label: "Alerta Crítico (85%)",
            data: targetDates.map(() => 85),
            borderColor: isDark ? "rgba(245, 158, 11, 0.75)" : "rgba(245, 158, 11, 0.9)",
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointRadius: 0,
            fill: false,
            order: 2
          },
          {
            type: "line" as const,
            label: "Atenção (75%)",
            data: targetDates.map(() => 75),
            borderColor: isDark ? "rgba(16, 185, 129, 0.6)" : "rgba(16, 185, 129, 0.8)",
            borderWidth: 1,
            borderDash: [3, 3],
            pointRadius: 0,
            fill: false,
            order: 3
          }
        ]
      };
    }

    return {
      labels,
      percentages: percentageValues,
      datasets: [
        {
          type: "line" as const,
          label: isReal ? "Ocupação Real (Pallets)" : "Ocupação Projetada (Pallets)",
          data: occupiedValues,
          percentages: percentageValues,
          borderColor: isReal ? "#8b5cf6" : "#06b6d4",
          backgroundColor: (context: any) => {
            const ctx = context.chart?.ctx;
            if (!ctx) return isReal ? "rgba(139, 92, 246, 0.2)" : "rgba(6, 182, 212, 0.2)";
            const gradient = ctx.createLinearGradient(0, 0, 0, 200);
            if (isReal) {
              gradient.addColorStop(0, isDark ? "rgba(139, 92, 246, 0.35)" : "rgba(139, 92, 246, 0.2)");
            } else {
              gradient.addColorStop(0, isDark ? "rgba(6, 182, 212, 0.35)" : "rgba(6, 182, 212, 0.2)");
            }
            gradient.addColorStop(1, "transparent");
            return gradient;
          },
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
          pointRadius: isDark ? 5 : 4,
          pointHoverRadius: isDark ? 8 : 6,
          pointBackgroundColor: isDark ? "#ffffff" : (isReal ? "#8b5cf6" : "#06b6d4"),
          pointBorderColor: isDark ? (isReal ? "#c084fc" : "#38bdf8") : "#ffffff",
          pointBorderWidth: isDark ? 2.5 : 1.5,
          pointHoverBackgroundColor: isDark ? "#ffffff" : (isReal ? "#7c3aed" : "#0891b2"),
          pointHoverBorderColor: isDark ? (isReal ? "#f3e8ff" : "#e0f2fe") : "#ffffff",
          pointHoverBorderWidth: isDark ? 4 : 2,
          order: 1
        },
        {
          type: "bar" as const,
          label: "Capacidade Total (Pallets)",
          data: capacityValues,
          backgroundColor: isDark ? "rgba(71, 85, 105, 0.25)" : "rgba(203, 213, 225, 0.55)",
          borderColor: isDark ? "rgba(100, 116, 139, 0.4)" : "rgba(148, 163, 184, 0.6)",
          borderWidth: 1,
          borderRadius: 6,
          barPercentage: 0.45,
          categoryPercentage: 0.7,
          order: 2
        },
        {
          type: "line" as const,
          label: "Alerta Crítico (85%)",
          data: alertValues,
          borderColor: isDark ? "rgba(245, 158, 11, 0.65)" : "rgba(245, 158, 11, 0.8)",
          borderWidth: 1.5,
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false,
          order: 0
        }
      ]
    };
  }, [painelData, selectedCategory, projectionMode, realDates, projDates, isDark, categoryChartMode]);

  // Detailed Day-by-Day breakdown for the active mode (Used in Maximized modal)
  const activeTimelineDetails = useMemo(() => {
    const isReal = projectionMode === "real";
    const targetDates = isReal ? realDates : projDates;

    const rows = targetDates.map((dateStr) => {
      let ocupadaSum = 0;
      let capSum = 0;
      let directPct: number | null = null;
      const activeSubs = selectedCategory === "all"
        ? painelData
        : painelData.filter(s => s.subCategoria.toLowerCase() === selectedCategory.toLowerCase());

      activeSubs.forEach(sub => {
        if (isReal) {
          const item = sub.historico?.find(h => h.data === dateStr);
          if (item) {
            ocupadaSum += item.qtdOcupada;
            capSum += item.qtdPosicoes;
            if (activeSubs.length === 1) {
              directPct = extractPercentage(item);
            }
          } else {
            const lastH = sub.historico?.[sub.historico.length - 1];
            if (lastH) {
              ocupadaSum += lastH.qtdOcupada;
              capSum += lastH.qtdPosicoes;
              if (activeSubs.length === 1) {
                directPct = extractPercentage(lastH);
              }
            }
          }
        } else {
          const item = sub.projecao?.find(p => p.data === dateStr);
          if (item) {
            ocupadaSum += item.qtdOcupada;
            capSum += item.qtdPosicoes;
            if (activeSubs.length === 1) {
              directPct = extractPercentage(item);
            }
          } else {
            const lastP = sub.projecao?.[sub.projecao.length - 1];
            const lastH = sub.historico?.[sub.historico.length - 1];
            if (lastP) {
              ocupadaSum += lastP.qtdOcupada;
              capSum += lastP.qtdPosicoes;
              if (activeSubs.length === 1) {
                directPct = extractPercentage(lastP);
              }
            } else if (lastH) {
              ocupadaSum += lastH.qtdOcupada;
              capSum += lastH.qtdPosicoes;
              if (activeSubs.length === 1) {
                directPct = extractPercentage(lastH);
              }
            }
          }
        }
      });

      if (capSum === 0) {
        activeSubs.forEach(sub => {
          const lastH = sub.historico?.[sub.historico.length - 1];
          if (lastH) capSum += lastH.qtdPosicoes;
        });
        if (capSum === 0) capSum = 1;
      }

      const pct = directPct !== null
        ? directPct
        : Math.round((ocupadaSum / capSum) * 1000) / 10;
      const livre = Math.max(0, capSum - ocupadaSum);

      const dParts = dateStr.split("-");
      const dObj = new Date(Number(dParts[0]), Number(dParts[1]) - 1, Number(dParts[2]));
      const weekday = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][dObj.getDay()] || "";

      return {
        date: dateStr,
        displayDate: `${dParts[2]}/${dParts[1]}`,
        weekday,
        ocupada: ocupadaSum,
        capacidade: capSum,
        livre,
        pct,
        status: pct >= 85 ? "Crítico" : pct >= 75 ? "Atenção" : "Normal"
      };
    });

    const totalOcup = rows.reduce((acc, r) => acc + r.ocupada, 0);
    const totalCap = rows.reduce((acc, r) => acc + r.capacidade, 0);
    const avgOcup = rows.length > 0 ? Math.round(totalOcup / rows.length) : 0;
    const avgCap = rows.length > 0 ? Math.round(totalCap / rows.length) : 0;
    const avgPct = avgCap > 0 ? Math.round((avgOcup / avgCap) * 1000) / 10 : 0;
    const maxOcup = rows.reduce((m, r) => Math.max(m, r.ocupada), 0);
    const minOcup = rows.reduce((m, r) => Math.min(m, r.ocupada || m), rows[0]?.ocupada || 0);

    return {
      rows,
      avgOcup,
      avgCap,
      avgPct,
      maxOcup,
      minOcup
    };
  }, [painelData, selectedCategory, projectionMode, realDates, projDates]);

  const projectionChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 20,
        bottom: 5,
        left: 5,
        right: 15
      }
    },
    interaction: {
      mode: "index" as const,
      intersect: false
    },
    plugins: {
      legend: {
        position: "top" as const,
        align: "end" as const,
        labels: {
          color: isDark ? "#94a3b8" : "#64748b",
          font: { size: 9, family: "monospace", weight: "bold" },
          boxWidth: 10,
          usePointStyle: false
        }
      },
      tooltip: {
        backgroundColor: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
        titleColor: isDark ? "#f8fafc" : "#0f172a",
        bodyColor: isDark ? "#cbd5e1" : "#334155",
        borderColor: isDark ? "#334155" : "#e2e8f0",
        borderWidth: 1,
        padding: 8,
        titleFont: { size: 10, weight: "bold" },
        bodyFont: { size: 10 },
        callbacks: {
          label: (item: any) => {
            if (item.raw === null || item.raw === undefined) return "";
            if (categoryChartMode === "percent") {
              return ` ${item.dataset.label}: ${item.raw}%`;
            }
            if (item.datasetIndex === 0) {
              const pcts = (item.dataset as any).percentages;
              let pctStr = "";
              if (pcts && pcts[item.dataIndex] !== undefined) {
                const p = pcts[item.dataIndex];
                pctStr = Number.isInteger(p) ? `${p}%` : `${p.toFixed(1)}%`;
              } else {
                const cap = item.chart.data.datasets[1]?.data[item.dataIndex] || 1;
                pctStr = cap > 0 ? `${((item.raw / cap) * 100).toFixed(1)}%` : "0%";
              }
              return ` ${item.dataset.label}: ${item.raw.toLocaleString("pt-BR")} plts (${pctStr})`;
            }
            return ` ${item.dataset.label}: ${item.raw.toLocaleString("pt-BR")} plts`;
          }
        }
      },
      datalabels: {
        display: (context: any) => {
          return context.datasetIndex === 0;
        },
        align: "top" as const,
        anchor: "end" as const,
        offset: 4,
        color: isDark ? "#ffffff" : "#0f172a",
        font: {
          size: 10,
          weight: "bold" as const,
          family: "monospace"
        },
        formatter: (_value: any, context: any) => {
          const dataIndex = context.dataIndex;
          if (categoryChartMode === "percent") {
            const val = context.dataset.data[dataIndex];
            return `${Number.isInteger(val) ? val : val.toFixed(1)}%`;
          }
          const pcts = (context.dataset as any).percentages;
          if (pcts && pcts[dataIndex] !== undefined) {
            const p = pcts[dataIndex];
            return `${Number.isInteger(p) ? p : p.toFixed(1)}%`;
          }
          const occ = context.dataset.data[dataIndex];
          const cap = context.chart.data.datasets[1]?.data[dataIndex] || 1;
          if (cap > 0 && typeof occ === "number") {
            const pct = (occ / cap) * 100;
            return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`;
          }
          return "";
        },
        backgroundColor: isDark ? "rgba(15, 23, 42, 0.88)" : "rgba(255, 255, 255, 0.95)",
        borderRadius: 4,
        padding: {
          top: 1.5,
          bottom: 1.5,
          left: 4,
          right: 4
        },
        borderWidth: 1,
        borderColor: isDark ? "rgba(139, 92, 246, 0.5)" : "rgba(139, 92, 246, 0.35)"
      }
    },
    scales: {
      x: {
        grid: { color: isDark ? "rgba(51, 65, 85, 0.25)" : "rgba(226, 232, 240, 0.6)" },
        ticks: { color: isDark ? "#94a3b8" : "#64748b", font: { size: 9, family: "monospace" } }
      },
      y: {
        grace: "12%",
        min: 0,
        max: categoryChartMode === "percent" ? 100 : undefined,
        grid: { color: isDark ? "rgba(51, 65, 85, 0.25)" : "rgba(226, 232, 240, 0.6)" },
        ticks: {
          color: isDark ? "#94a3b8" : "#64748b",
          font: { size: 9, family: "monospace" },
          callback: (val: any) => categoryChartMode === "percent" ? `${val}%` : `${(val / 1000).toFixed(0)}k`
        }
      }
    }
  }), [isDark, categoryChartMode]);

  // Donut Chart Data (Apenas Ocupado x Livre por CD ou Categoria selecionada)
  const donutChartData = useMemo(() => {
    const activeColor = selectedCategory !== "all"
      ? (SUBCATEGORY_COLORS[selectedCategory]?.color || "#8b5cf6")
      : (currentStats.taxaOcupacao >= 85 ? "#f43f5e" : currentStats.taxaOcupacao >= 75 ? "#f59e0b" : "#8b5cf6");

    const trackColor = isDark ? "rgba(30, 41, 59, 0.75)" : "rgba(226, 232, 240, 0.85)";
    const hoverColor = selectedCategory !== "all"
      ? (SUBCATEGORY_COLORS[selectedCategory]?.color || "#7c3aed")
      : (currentStats.taxaOcupacao >= 85 ? "#e11d48" : currentStats.taxaOcupacao >= 75 ? "#d97706" : "#7c3aed");

    return {
      labels: ["Ocupado", "Livre"],
      datasets: [
        {
          data: [currentStats.totalOcupado, currentStats.totalLivre],
          backgroundColor: [
            activeColor,
            trackColor
          ],
          hoverBackgroundColor: [
            hoverColor,
            isDark ? "rgba(51, 65, 85, 0.9)" : "rgba(203, 213, 225, 1)"
          ],
          borderWidth: 0,
          cutout: "75%",
          borderRadius: 4,
          spacing: 2
        }
      ]
    };
  }, [currentStats, selectedCategory, isDark]);

  const donutChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
        titleColor: isDark ? "#f8fafc" : "#0f172a",
        bodyColor: isDark ? "#cbd5e1" : "#334155",
        borderColor: isDark ? "#334155" : "#e2e8f0",
        borderWidth: 1,
        padding: 8,
        callbacks: {
          label: (item: any) => {
            const isOcupado = item.dataIndex === 0;
            const pct = isOcupado ? currentStats.taxaOcupacao : currentStats.taxaLivre;
            return ` ${item.label}: ${item.raw.toLocaleString("pt-BR")} plts (${pct}%)`;
          }
        }
      },
      datalabels: { display: false }
    }
  }), [isDark, currentStats]);

  // Mini Donut Chart Options for the KPI card
  const miniDonutChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: "72%",
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
        titleColor: isDark ? "#f8fafc" : "#0f172a",
        bodyColor: isDark ? "#cbd5e1" : "#334155",
        borderColor: isDark ? "#334155" : "#e2e8f0",
        borderWidth: 1,
        padding: 6,
        bodyFont: { size: 9, family: "monospace" },
        callbacks: {
          label: (item: any) => {
            const isOcupado = item.dataIndex === 0;
            const pct = isOcupado ? currentStats.taxaOcupacao : currentStats.taxaLivre;
            return ` ${item.label}: ${item.raw.toLocaleString("pt-BR")} plts (${pct}%)`;
          }
        }
      },
      datalabels: { display: false }
    }
  }), [isDark, currentStats]);

  // Agendas da Semana Bar Chart Data
  const agendasChartData = useMemo(() => {
    const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    const baseMult = selectedCd === 1965 ? 1.0 : selectedCd === 941 ? 0.85 : selectedCd === 7801 ? 0.7 : 0.9;
    const baseValues = [1420, 1980, 2450, 2100, 1850, 950, 420];
    const data = baseValues.map(v => Math.round(v * baseMult * (selectedCategory !== "all" ? 0.35 : 1)));

    return {
      labels: days,
      datasets: [
        {
          label: "Agendas (Pallets)",
          data,
          backgroundColor: (context: any) => {
            const ctx = context.chart?.ctx;
            if (!ctx) return "#8b5cf6";
            const gradient = ctx.createLinearGradient(0, 0, 0, 120);
            gradient.addColorStop(0, "#8b5cf6");
            gradient.addColorStop(1, "#6366f1");
            return gradient;
          },
          borderRadius: 6,
          borderSkipped: false
        }
      ]
    };
  }, [selectedCd, selectedCategory]);

  const agendasChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
        titleColor: isDark ? "#f8fafc" : "#0f172a",
        bodyColor: isDark ? "#cbd5e1" : "#334155",
        borderColor: isDark ? "#334155" : "#e2e8f0",
        borderWidth: 1,
        padding: 8,
        callbacks: {
          label: (item: any) => ` ${item.raw.toLocaleString("pt-BR")} pallets agendados`
        }
      },
      datalabels: { display: false }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: isDark ? "#94a3b8" : "#64748b", font: { size: 9, family: "monospace" } }
      },
      y: {
        grid: { color: isDark ? "rgba(51, 65, 85, 0.2)" : "rgba(226, 232, 240, 0.6)" },
        ticks: {
          color: isDark ? "#94a3b8" : "#64748b",
          font: { size: 9, family: "monospace" },
          callback: (val: any) => `${(val / 1000).toFixed(0)}k`
        }
      }
    }
  };

  // 📊 Gráfico Ocupação por Categoria (Data & Options)
  const categoryChartData = useMemo(() => {
    const labels = categories.map(c => c.name);

    if (categoryChartMode === "percent") {
      const pcts = categories.map(c => c.ocupacaoPct);
      const bgColors = categories.map(c => {
        const isDimmed = selectedCategory !== "all" && c.name.toLowerCase() !== selectedCategory.toLowerCase();
        if (isDimmed) return isDark ? "rgba(100, 116, 139, 0.2)" : "rgba(203, 213, 225, 0.35)";
        if (c.ocupacaoPct >= 85) return "rgba(244, 63, 94, 0.85)";
        if (c.ocupacaoPct >= 75) return "rgba(245, 158, 11, 0.85)";
        return "rgba(16, 185, 129, 0.85)";
      });

      return {
        labels,
        datasets: [
          {
            type: "bar" as const,
            label: "Taxa de Ocupação (%)",
            data: pcts,
            backgroundColor: bgColors,
            borderRadius: 6,
            barPercentage: 0.65,
            categoryPercentage: 0.85
          }
        ]
      };
    }

    const ocupData = categories.map(c => c.pallets);
    const capData = categories.map(c => c.capacidade);

    const ocupColors = categories.map(c => {
      const isDimmed = selectedCategory !== "all" && c.name.toLowerCase() !== selectedCategory.toLowerCase();
      if (isDimmed) return isDark ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.25)";
      return c.color || "#8b5cf6";
    });

    const capColors = categories.map(() => {
      return isDark ? "rgba(51, 65, 85, 0.35)" : "rgba(226, 232, 240, 0.75)";
    });

    return {
      labels,
      datasets: [
        {
          type: "bar" as const,
          label: "Paletes Ocupados",
          data: ocupData,
          backgroundColor: ocupColors,
          borderRadius: 6,
          barPercentage: 0.75,
          categoryPercentage: 0.8,
          order: 1
        },
        {
          type: "bar" as const,
          label: "Capacidade Total",
          data: capData,
          backgroundColor: capColors,
          borderColor: isDark ? "rgba(100, 116, 139, 0.4)" : "rgba(148, 163, 184, 0.6)",
          borderWidth: 1,
          borderRadius: 6,
          barPercentage: 0.75,
          categoryPercentage: 0.8,
          order: 2
        }
      ]
    };
  }, [categories, categoryChartMode, selectedCategory, isDark]);

  const categoryChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      onClick: (_: any, elements: any[]) => {
        if (elements && elements.length > 0) {
          const index = elements[0].index;
          const cat = categories[index];
          if (cat) {
            handleCategoryClick(cat.name);
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: "top" as const,
          align: "end" as const,
          labels: {
            color: isDark ? "#94a3b8" : "#64748b",
            font: { size: 10, family: "monospace", weight: "bold" as const },
            boxWidth: 10,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
          titleColor: isDark ? "#f8fafc" : "#0f172a",
          bodyColor: isDark ? "#cbd5e1" : "#334155",
          borderColor: isDark ? "#334155" : "#e2e8f0",
          borderWidth: 1,
          padding: 10,
          cornerRadius: 10,
          callbacks: {
            label: (item: any) => {
              if (categoryChartMode === "percent") {
                return ` Taxa: ${item.raw}%`;
              }
              return ` ${item.dataset.label}: ${item.raw.toLocaleString("pt-BR")} plts`;
            },
            afterBody: (tooltipItems: any[]) => {
              if (!tooltipItems.length) return "";
              const idx = tooltipItems[0].dataIndex;
              const cat = categories[idx];
              if (!cat) return "";
              const free = Math.max(0, cat.capacidade - cat.pallets);
              return `\nTaxa de Ocupação: ${cat.ocupacaoPct}%\nPosições Livres: ${free.toLocaleString("pt-BR")} plts\n(Clique na barra para filtrar)`;
            }
          }
        },
        datalabels: { display: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: isDark ? "#94a3b8" : "#64748b",
            font: { size: 9, family: "monospace", weight: "bold" as const },
            maxRotation: 45,
            minRotation: 20
          }
        },
        y: {
          grid: { color: isDark ? "rgba(51, 65, 85, 0.2)" : "rgba(226, 232, 240, 0.6)" },
          ticks: {
            color: isDark ? "#94a3b8" : "#64748b",
            font: { size: 9, family: "monospace" },
            callback: (val: any) => categoryChartMode === "percent" ? `${val}%` : `${(val / 1000).toFixed(0)}k`
          }
        }
      }
    };
  }, [categories, categoryChartMode, isDark, handleCategoryClick]);

  return (
    <div className={`relative flex flex-col w-full h-full flex-1 min-h-0 font-sans overflow-hidden ${isDark ? "text-slate-100" : "text-slate-800"}`}>
      
      {/* Luz ambiente de fundo no modo dark */}
      {isDark && (
        <>
          <div className="absolute -top-24 left-1/4 w-96 h-96 bg-violet-600/[0.06] rounded-full blur-3xl pointer-events-none -z-10" />
          <div className="absolute top-1/3 -right-24 w-96 h-96 bg-cyan-500/[0.04] rounded-full blur-3xl pointer-events-none -z-10" />
          <div className="absolute -bottom-24 left-1/3 w-96 h-96 bg-indigo-600/[0.04] rounded-full blur-3xl pointer-events-none -z-10" />
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0 w-full h-full min-h-0 overflow-y-auto lg:overflow-hidden p-1 sm:p-2">
        
        {/* BARRA SUPERIOR DE FILTROS & STATUS */}
        <div className="flex items-center justify-between gap-2 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              isDark 
                ? "bg-gradient-to-b from-[#131a2e] to-[#0b101d] border-[#222d48] text-white shadow-[0_2px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]" 
                : "bg-white border-slate-200/90 text-slate-900 shadow-xs"
            }`}>
              <div className="relative flex items-center justify-center">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <Building className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <select
                value={selectedCd}
                onChange={(e) => setSelectedCd(Number(e.target.value))}
                className="bg-transparent font-bold text-xs outline-hidden cursor-pointer tracking-tight"
              >
                {CDS_LIST.map((cd) => (
                  <option 
                    key={cd.id} 
                    value={cd.id} 
                    className={isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"}
                  >
                    {cd.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedCategory !== "all" && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-bold shadow-xs">
                <span>Filtro: {selectedCategory}</span>
                <button
                  onClick={() => handleCategoryClick("all")}
                  className="p-0.5 hover:bg-violet-500/20 rounded-md cursor-pointer transition-colors"
                  title="Remover filtro"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-mono font-medium ${
              isDark ? "bg-[#0d1220]/80 border-slate-800/80 text-slate-400" : "bg-white/80 border-slate-200 text-slate-600"
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Online • Atualizado às {new Date().toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Atualizar dados em tempo real"
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                isDark 
                  ? "bg-gradient-to-b from-[#131a2e] to-[#0b101d] border-[#222d48] text-slate-300 hover:text-white hover:border-violet-500/50 hover:shadow-[0_0_15px_rgba(139,92,246,0.25)]" 
                  : "bg-white border-slate-200 text-slate-700 hover:text-slate-950 hover:border-slate-300 hover:shadow-xs"
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-violet-400" : ""}`} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="w-full flex-1 min-h-[350px] flex flex-col items-center justify-center p-8 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-white/40 dark:bg-slate-900/20 my-auto">
            <RefreshCw className="w-8 h-8 text-violet-500 animate-spin mb-3" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">
              Sincronizando com a API...
            </p>
          </div>
        ) : (
        <div className="flex flex-col gap-2.5 flex-1 min-h-0">
          
          {/* 🔝 4 CARDS NO TOPO COM DESIGN DE ALTA PRECISÃO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
            
            {/* CARD 1: CAPACIDADE TOTAL */}
            <div className={`p-3 rounded-2xl border relative overflow-hidden flex flex-col justify-between transition-all duration-300 group hover:-translate-y-0.5 ${
              isDark 
                ? "bg-gradient-to-b from-[#13192c]/95 via-[#0d1221]/95 to-[#080b15]/95 backdrop-blur-xl border-[#1e2744] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:border-amber-500/40 hover:shadow-[0_12px_36px_-6px_rgba(245,158,11,0.15)]" 
                : "bg-white border-slate-200/90 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)] hover:border-slate-300 hover:shadow-md"
            }`}>
              {/* Hairline Glow Accent */}
              <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />
              
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[9px] font-mono uppercase tracking-wider font-bold ${isDark ? "text-amber-400/90" : "text-amber-600"}`}>
                  Capacidade Total
                </span>
                <div className="p-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400">
                  <Building className="w-3 h-3" />
                </div>
              </div>

              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? "text-white drop-shadow-xs" : "text-slate-950"}`}>
                  {currentStats.totalCapacidade.toLocaleString("pt-BR")}
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-medium">pallets</span>
              </div>

              <div className="flex items-center justify-between gap-2 mt-1.5">
                <div className={`shrink-0 flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold border ${
                  diffMetrics.capDiffPct > 0
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                    : diffMetrics.capDiffPct < 0
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-slate-500/10 border-slate-500/20 text-slate-400"
                }`}>
                  {diffMetrics.capDiffPct > 0 ? `▲ +${diffMetrics.capDiffPct}%` : diffMetrics.capDiffPct < 0 ? `▼ ${diffMetrics.capDiffPct}%` : "0.0%"}
                  <span className="text-[8px] opacity-70 font-normal ml-0.5">vs ontem</span>
                </div>
                <div className="flex-1 h-7 sm:h-8 min-w-0">
                  <Line data={sparklineCapacidade} options={sparklineCapOptions as any} />
                </div>
              </div>
            </div>

            {/* CARD 2: OCUPAÇÃO ATUAL */}
            <div className={`p-3 rounded-2xl border relative overflow-hidden flex flex-col justify-between transition-all duration-300 group hover:-translate-y-0.5 ${
              isDark 
                ? "bg-gradient-to-b from-[#13192c]/95 via-[#0d1221]/95 to-[#080b15]/95 backdrop-blur-xl border-[#1e2744] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:border-violet-500/40 hover:shadow-[0_12px_36px_-6px_rgba(139,92,246,0.18)]" 
                : "bg-white border-slate-200/90 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)] hover:border-slate-300 hover:shadow-md"
            }`}>
              {/* Hairline Glow Accent */}
              <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-violet-400/80 to-transparent" />

              <div className="flex items-center justify-between mb-1">
                <span className={`text-[9px] font-mono uppercase tracking-wider font-bold ${isDark ? "text-violet-400/90" : "text-violet-600"}`}>
                  Ocupação Atual
                </span>
                <div className="p-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-500 dark:text-violet-400">
                  <TrendingUp className="w-3 h-3" />
                </div>
              </div>

              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? "text-white drop-shadow-xs" : "text-slate-950"}`}>
                  {currentStats.totalOcupado.toLocaleString("pt-BR")}
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-medium">pallets</span>
              </div>

              <div className="flex items-center justify-between gap-2 mt-1.5">
                <div className={`shrink-0 flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold border ${
                  diffMetrics.ocupDiffPct > 0
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                    : diffMetrics.ocupDiffPct < 0
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-slate-500/10 border-slate-500/20 text-slate-400"
                }`}>
                  {diffMetrics.ocupDiffPct > 0 ? `▲ +${diffMetrics.ocupDiffPct}%` : diffMetrics.ocupDiffPct < 0 ? `▼ ${diffMetrics.ocupDiffPct}%` : "0.0%"}
                  <span className="text-[8px] opacity-70 font-normal ml-0.5">vs ontem</span>
                </div>
                <div className="flex-1 h-7 sm:h-8 min-w-0">
                  <Line data={sparklineOcupado} options={sparklineOcupOptions as any} />
                </div>
              </div>
            </div>

            {/* CARD 3: POSIÇÕES LIVRES */}
            <div className={`p-3 rounded-2xl border relative overflow-hidden flex flex-col justify-between transition-all duration-300 group hover:-translate-y-0.5 ${
              isDark 
                ? "bg-gradient-to-b from-[#13192c]/95 via-[#0d1221]/95 to-[#080b15]/95 backdrop-blur-xl border-[#1e2744] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:border-cyan-500/40 hover:shadow-[0_12px_36px_-6px_rgba(6,182,212,0.18)]" 
                : "bg-white border-slate-200/90 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)] hover:border-slate-300 hover:shadow-md"
            }`}>
              {/* Hairline Glow Accent */}
              <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/75 to-transparent" />

              <div className="flex items-center justify-between mb-1">
                <span className={`text-[9px] font-mono uppercase tracking-wider font-bold ${isDark ? "text-cyan-400/90" : "text-cyan-600"}`}>
                  Posições Livres
                </span>
                <div className="p-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 dark:text-cyan-400">
                  <Layers className="w-3 h-3" />
                </div>
              </div>

              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? "text-white drop-shadow-xs" : "text-slate-950"}`}>
                  {currentStats.totalLivre.toLocaleString("pt-BR")}
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-medium">pallets</span>
              </div>

              <div className="flex items-center justify-between gap-2 mt-1.5">
                <div className={`shrink-0 flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold border ${
                  diffMetrics.livreDiffPct > 0
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                    : diffMetrics.livreDiffPct < 0
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-slate-500/10 border-slate-500/20 text-slate-400"
                }`}>
                  {diffMetrics.livreDiffPct > 0 ? `▲ +${diffMetrics.livreDiffPct}%` : diffMetrics.livreDiffPct < 0 ? `▼ ${diffMetrics.livreDiffPct}%` : "0.0%"}
                  <span className="text-[8px] opacity-70 font-normal ml-0.5">vs ontem</span>
                </div>
                <div className="flex-1 h-7 sm:h-8 min-w-0">
                  <Line data={sparklineLivre} options={sparklineLivreOptions as any} />
                </div>
              </div>
            </div>

            {/* CARD 4: OCUPAÇÃO COM GRÁFICO DE ROSCA */}
            <div className={`p-3 rounded-2xl border relative overflow-hidden flex flex-col justify-between transition-all duration-300 group hover:-translate-y-0.5 ${
              isDark 
                ? "bg-gradient-to-b from-[#13192c]/95 via-[#0d1221]/95 to-[#080b15]/95 backdrop-blur-xl border-[#1e2744] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:border-indigo-500/40 hover:shadow-[0_12px_36px_-6px_rgba(99,102,241,0.18)]" 
                : "bg-white border-slate-200/90 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)] hover:border-slate-300 hover:shadow-md"
            }`}>
              {/* Hairline Glow Accent */}
              <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-400/75 to-transparent" />

              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[9px] font-mono uppercase tracking-wider font-bold ${isDark ? "text-indigo-400/90" : "text-indigo-600"}`}>
                  Ocupação
                </span>
              </div>

              <div className="relative w-16 h-16 sm:w-[70px] sm:h-[70px] mx-auto flex items-center justify-center my-auto">
                <Doughnut data={donutChartData} options={miniDonutChartOptions as any} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className={`text-xs sm:text-sm font-black leading-none ${isDark ? "text-white drop-shadow-xs" : "text-slate-950"}`}>
                    {currentStats.taxaOcupacao}%
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* LAYOUT INFERIOR */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch flex-1 min-h-0">
            
            {/* COLUNA ESQUERDA */}
            <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-2.5 min-h-0">
              
              {/* OCUPAÇÃO POR CATEGORIA */}
              <div className={`p-3 sm:p-3.5 rounded-2xl border flex flex-col justify-between flex-1 min-h-0 transition-all duration-300 relative overflow-hidden ${
                isDark 
                  ? "bg-gradient-to-b from-[#13192c]/95 via-[#0d1221]/95 to-[#080b15]/95 backdrop-blur-xl border-[#1e2744] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.08)]" 
                  : "bg-white border-slate-200/90 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)]"
              }`}>
                {/* Hairline top glow */}
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" />

                <div className="flex flex-col min-h-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
                        <Package className="w-3.5 h-3.5 shrink-0" />
                      </div>
                      <h3 className={`text-xs font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
                        Ocupação por Categoria
                      </h3>
                    </div>

                    {selectedCategory !== "all" && (
                      <button
                        onClick={() => handleCategoryClick("all")}
                        className="px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 border border-violet-500/30 transition-all cursor-pointer shadow-xs"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  <p className={`text-[9px] font-medium mt-1 shrink-0 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    {categories.length} subcategorias no CD {selectedCd} • Clique para filtrar
                  </p>

                  <div className="w-full h-px bg-slate-200 dark:bg-[#1a233b] my-2 shrink-0" />

                  <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 pr-1 max-h-[190px] sm:max-h-[220px] 2xl:max-h-[280px]">
                    {categories.map((cat) => {
                      const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
                      const pctFormatted = Number.isInteger(cat.ocupacaoPct) ? `${cat.ocupacaoPct}%` : `${cat.ocupacaoPct.toFixed(1)}%`;
                      
                      return (
                        <div
                          key={cat.id}
                          onClick={() => handleCategoryClick(cat.name)}
                          className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                            isSelected
                              ? "bg-gradient-to-r from-violet-600/20 via-indigo-600/15 to-transparent border-violet-500/80 ring-1 ring-violet-500/40 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                              : isDark
                              ? "bg-[#11172a]/80 border-[#1c2642] hover:border-slate-500/60 hover:bg-[#16203a] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
                              : "bg-slate-50/90 border-slate-200/90 hover:border-slate-300 hover:bg-slate-100/80"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ 
                                  backgroundColor: cat.color,
                                  boxShadow: `0 0 8px ${cat.color}90`
                                }}
                              />
                              <span className={`font-bold text-[11px] truncate ${isDark ? "text-white" : "text-slate-950"}`}>
                                {cat.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 font-mono shrink-0 text-[10px]">
                              <span className={`font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                                {cat.pallets.toLocaleString("pt-BR")}
                              </span>
                              <span
                                className={`font-bold px-1.5 py-0.2 rounded-md ${
                                  cat.ocupacaoPct >= 85
                                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                    : cat.ocupacaoPct >= 75
                                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                    : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                }`}
                              >
                                {pctFormatted}
                              </span>
                            </div>
                          </div>

                          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-[#070b16] overflow-hidden border border-slate-300/60 dark:border-slate-800/60 p-[1px]">
                            <div
                              className="h-full rounded-full transition-all duration-500 shadow-xs"
                              style={{
                                width: `${Math.min(100, Math.max(1, cat.ocupacaoPct))}%`,
                                backgroundColor: cat.color,
                                boxShadow: `0 0 8px ${cat.color}80`
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={`pt-2 mt-2 border-t text-[9px] font-mono flex items-center justify-between shrink-0 ${
                  isDark ? "border-[#1a233b] text-slate-400" : "border-slate-200 text-slate-600"
                }`}>
                  <span>Total: {categories.length} subcategorias</span>
                  <span className="font-bold text-violet-400">CD {selectedCd}</span>
                </div>
              </div>

              {/* AGENDAS DA SEMANA */}
              <div className={`p-3 sm:p-3.5 rounded-2xl border flex flex-col justify-between shrink-0 h-[175px] sm:h-[190px] transition-all duration-300 relative overflow-hidden ${
                isDark 
                  ? "bg-gradient-to-b from-[#13192c]/95 via-[#0d1221]/95 to-[#080b15]/95 backdrop-blur-xl border-[#1e2744] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.08)]" 
                  : "bg-white border-slate-200/90 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)]"
              }`}>
                {/* Hairline top glow */}
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

                <div className="flex items-center justify-between mb-1 shrink-0">
                  <div>
                    <h3 className={`text-xs font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
                      Agendas da Semana
                    </h3>
                    <span className={`text-[9px] font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      Previsão de Recebimento de Carga (Pallets)
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-bold text-cyan-400 px-1.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                    7 Dias
                  </span>
                </div>

                <div className="h-24 sm:h-26 relative w-full flex-1 min-h-0">
                  <Bar data={agendasChartData} options={agendasChartOptions as any} />
                </div>
              </div>

            </div>

            {/* COLUNA DIREITA */}
            <div className="lg:col-span-8 xl:col-span-8 flex flex-col gap-2.5 min-h-0">
              
              {/* PROJEÇÃO / HISTÓRICO DE ESTOQUE */}
              <div className={`p-3 sm:p-3.5 rounded-2xl border flex flex-col justify-between shrink-0 transition-all duration-300 relative overflow-hidden ${
                isDark 
                  ? "bg-gradient-to-b from-[#13192c]/95 via-[#0d1221]/95 to-[#080b15]/95 backdrop-blur-xl border-[#1e2744] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.08)]" 
                  : "bg-white border-slate-200/90 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)]"
              }`}>
                {/* Hairline top glow */}
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-violet-400/70 to-transparent" />

                <div className="flex flex-wrap items-center justify-between gap-2 mb-1 shrink-0">
                  <div>
                    <h3 className={`text-xs font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
                      {projectionMode === "real" ? `Histórico Real de Estoque (${realDates.length} Dias)` : "Projeção Futura de Estoque (14 Dias)"}
                    </h3>
                    <span className={`text-[9px] block font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      {projectionMode === "real"
                        ? `${realDates.length}D Retro (${realDates[0]?.split("-").reverse().slice(0, 2).join("/")} a ${realDates[realDates.length - 1]?.split("-").reverse().slice(0, 2).join("/")})`
                        : `14D Proj (${projDates[0]?.split("-").reverse().slice(0, 2).join("/")} a ${projDates[projDates.length - 1]?.split("-").reverse().slice(0, 2).join("/")})`
                      } • {categoryChartMode === "percent" ? "Exibição em Taxa (%)" : "Exibição em Volume (Pallets)"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className={`inline-flex items-center p-1 rounded-xl border text-[10px] font-mono font-bold ${
                      isDark ? "bg-[#0a0e1c] border-[#1d2744]" : "bg-slate-100 border-slate-200"
                    }`}>
                      <button
                        onClick={() => {
                          setProjectionMode("real");
                          showNotification(`📊 Visualizando Histórico Real de ${realDates.length} Dias`);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                          projectionMode === "real"
                            ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_2px_8px_rgba(124,58,237,0.4)]"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Real ({realDates.length}D)
                      </button>
                      <button
                        onClick={() => {
                          setProjectionMode("projecao");
                          showNotification("📈 Visualizando Projeção Futura de 14 Dias");
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                          projectionMode === "projecao"
                            ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_2px_8px_rgba(6,182,212,0.4)]"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Projetado (14D)
                      </button>
                    </div>

                    <div className={`inline-flex items-center p-1 rounded-xl border text-[10px] font-mono font-bold ${
                      isDark ? "bg-[#0a0e1c] border-[#1d2744]" : "bg-slate-100 border-slate-200"
                    }`}>
                      <button
                        onClick={() => {
                          setCategoryChartMode("volume");
                          showNotification("📦 Exibição do gráfico em Volume (Pallets)");
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                          categoryChartMode === "volume"
                            ? "bg-slate-800 text-white shadow-xs"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Pallets
                      </button>
                      <button
                        onClick={() => {
                          setCategoryChartMode("percent");
                          showNotification("📊 Exibição do gráfico em Taxa de Ocupação (%)");
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                          categoryChartMode === "percent"
                            ? "bg-slate-800 text-white shadow-xs"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Taxa (%)
                      </button>
                    </div>

                    <button
                      onClick={() => setIsChartMaximized(true)}
                      title="Maximizar Gráfico"
                      className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                        isDark 
                          ? "bg-[#0a0e1c] border-[#1d2744] text-slate-400 hover:text-white hover:border-violet-500/50 hover:shadow-[0_0_12px_rgba(139,92,246,0.3)]" 
                          : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:shadow-xs"
                      }`}
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="h-44 sm:h-48 relative w-full mt-1">
                  <Chart type="bar" data={projectionChartData as any} options={projectionChartOptions as any} />
                </div>
              </div>

              {/* TABELA ITENS */}
              <div className={`p-3 sm:p-3.5 rounded-2xl border flex-1 flex flex-col justify-between min-h-0 transition-all duration-300 relative overflow-hidden ${
                isDark 
                  ? "bg-gradient-to-b from-[#13192c]/95 via-[#0d1221]/95 to-[#080b15]/95 backdrop-blur-xl border-[#1e2744] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.08)]" 
                  : "bg-white border-slate-200/90 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)]"
              }`}>
                {/* Hairline top glow */}
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />

                <div className="flex flex-col min-h-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
                    <div>
                      <h3 className={`text-xs font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
                        Itens e Subcategorias em Estoque
                      </h3>
                      <span className={`text-[9px] font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        {filteredPlus.length} itens no CD {selectedCd} {selectedCategory !== "all" ? `• Filtrado por ${selectedCategory}` : ""}
                      </span>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={searchPlu}
                        onChange={(e) => setSearchPlu(e.target.value)}
                        placeholder="Buscar PLU ou categoria..."
                        className={`pl-8 pr-2.5 py-1 rounded-xl border text-[11px] font-medium transition-all w-40 sm:w-52 outline-hidden ${
                          isDark 
                            ? "bg-[#090d18] border-[#1f2842] text-white placeholder-slate-500 focus:border-violet-500 focus:shadow-[0_0_10px_rgba(139,92,246,0.25)]" 
                            : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:bg-white focus:shadow-xs"
                        }`}
                      />
                    </div>
                  </div>

                  <div className={`overflow-x-auto overflow-y-auto border rounded-xl flex-1 max-h-[170px] sm:max-h-[190px] 2xl:max-h-[240px] ${
                    isDark ? "border-[#1c2642] bg-[#090d18]/60" : "border-slate-200 bg-slate-50/50"
                  }`}>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className={`uppercase text-[9px] font-mono font-bold sticky top-0 z-10 border-b ${
                        isDark ? "bg-[#141c30] text-slate-200 border-[#1f2842]" : "bg-slate-100 text-slate-900 border-slate-200"
                      }`}>
                        <tr>
                          <th className="py-2 px-3">PLU / CÓDIGO</th>
                          <th className="py-2 px-3">CATEGORIA</th>
                          <th className="py-2 px-3 text-right">PALLETS</th>
                          <th className="py-2 px-3 text-right">CAPACIDADE</th>
                          <th className="py-2 px-3 text-center">TAXA DE OCUPAÇÃO</th>
                          <th className="py-2 px-3 text-right">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/50 dark:divide-[#18223a] font-mono">
                        {filteredPlus.map((item) => {
                          const isSelected = selectedCategory.toLowerCase() === item.categoria.toLowerCase();
                          const itemColor = SUBCATEGORY_COLORS[item.categoria]?.color || "#8b5cf6";
                          const itemCap = item.capacidadeMax || currentStats.totalCapacidade;
                          const pctValue = itemCap > 0 ? (item.pallets / itemCap) * 100 : 0;
                          const pctFormatted = Number.isInteger(pctValue) ? `${pctValue}%` : `${pctValue.toFixed(1)}%`;
                          const statusLabel = pctValue >= 85 ? "Crítico" : pctValue >= 75 ? "Atenção" : "Normal";
                          const statusDot = pctValue >= 85 ? "bg-rose-500 shadow-[0_0_6px_#f43f5e]" : pctValue >= 75 ? "bg-amber-500 shadow-[0_0_6px_#f59e0b]" : "bg-emerald-500 shadow-[0_0_6px_#10b981]";
                          const statusBadge = pctValue >= 85 
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/30" 
                            : pctValue >= 75 
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30" 
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";

                          return (
                            <tr
                              key={item.plu}
                              onClick={() => handleCategoryClick(item.categoria)}
                              className={`cursor-pointer transition-colors duration-150 ${
                                isSelected
                                  ? "bg-violet-600/15 dark:bg-violet-500/20"
                                  : "hover:bg-slate-100/60 dark:hover:bg-[#151e36]"
                              }`}
                            >
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ 
                                      backgroundColor: itemColor,
                                      boxShadow: `0 0 6px ${itemColor}90`
                                    }}
                                  />
                                  <span className={`font-bold block font-mono text-[11px] truncate ${isDark ? "text-white" : "text-slate-950"}`}>
                                    {item.plu}
                                  </span>
                                </div>
                              </td>

                              <td className="py-2 px-3">
                                <span className={`text-[10px] font-medium truncate block max-w-[140px] ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                  {item.categoria}
                                </span>
                              </td>

                              <td className="py-2 px-3 text-right">
                                <span className="font-bold text-violet-600 dark:text-violet-400 block font-mono text-[11px]">
                                  {item.pallets.toLocaleString("pt-BR")} plts
                                </span>
                              </td>

                              <td className={`py-2 px-3 text-right text-[10px] ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                                {itemCap.toLocaleString("pt-BR")} plts
                              </td>

                              <td className="py-2 px-3 text-center">
                                <div className="inline-flex items-center gap-2">
                                  <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-[#070b16] overflow-hidden hidden sm:block border border-slate-300/40 dark:border-slate-800/60 p-[1px]">
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{
                                        width: `${Math.min(100, Math.max(2, pctValue))}%`,
                                        backgroundColor: itemColor,
                                        boxShadow: `0 0 6px ${itemColor}80`
                                      }}
                                    />
                                  </div>
                                  <span className={`font-bold text-[10px] ${isDark ? "text-white" : "text-slate-950"}`}>
                                    {pctFormatted}
                                  </span>
                                </div>
                              </td>

                              <td className="py-2 px-3 text-right">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusBadge}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                                  {statusLabel}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={`pt-2 mt-2 border-t text-[9px] font-mono flex items-center justify-between shrink-0 ${
                  isDark ? "border-[#1a233b] text-slate-400" : "border-slate-200 text-slate-600"
                }`}>
                  <span>{filteredPlus.length} itens listados</span>
                  {selectedCategory !== "all" ? (
                    <button
                      onClick={() => handleCategoryClick("all")}
                      className="text-violet-400 font-bold hover:underline cursor-pointer"
                    >
                      Limpar filtro ({selectedCategory})
                    </button>
                  ) : (
                    <span>CD {selectedCd}</span>
                  )}
                </div>
              </div>

            </div>

          </div>

        </div>
        )}

      </div>

      {/* MODAL MAXIMIZADO */}
      <AnimatePresence>
        {isChartMaximized && (
          <motion.div
            key="maximized-chart-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsChartMaximized(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.2 }}
              className={`w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl border p-5 sm:p-6 shadow-2xl flex flex-col gap-4 ${
                isDark 
                  ? "bg-gradient-to-b from-[#111628] to-[#0c101d] border-[#1f2842] text-white shadow-[0_8px_40px_rgba(0,0,0,0.8)]" 
                  : "bg-white border-slate-200 text-slate-950 shadow-2xl"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-violet-500" />
                    <h2 className={`text-base sm:text-lg font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
                      {projectionMode === "real" ? `Histórico Real de Ocupação (${realDates.length} Dias)` : "Projeção Futura de Estoque (14 Dias)"}
                    </h2>
                  </div>
                  <p className={`text-xs font-medium mt-0.5 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    CD {selectedCd} • {selectedCategory === "all" ? "Todas as Categorias" : `Categoria: ${selectedCategory}`} • Janela de {activeTimelineDetails.rows[0]?.displayDate} a {activeTimelineDetails.rows[activeTimelineDetails.rows.length - 1]?.displayDate}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`inline-flex items-center p-0.5 rounded-xl border ${
                    isDark ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-200"
                  }`}>
                    <button
                      onClick={() => setProjectionMode("real")}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        projectionMode === "real"
                          ? "bg-violet-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Real ({realDates.length} Dias)
                    </button>
                    <button
                      onClick={() => setProjectionMode("projecao")}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        projectionMode === "projecao"
                          ? "bg-cyan-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Projetado (14 Dias)
                    </button>
                  </div>

                  <button
                    onClick={() => setIsChartMaximized(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer"
                    title="Minimizar Gráfico"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Minimizar</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-3 rounded-xl border ${isDark ? "bg-[#141a2e] border-[#1e2740]" : "bg-slate-50 border-slate-200"}`}>
                  <span className={`text-[9px] uppercase font-mono font-bold block ${isDark ? "text-slate-400" : "text-slate-600"}`}>Média no Período</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-lg font-black ${isDark ? "text-white" : "text-slate-950"}`}>{activeTimelineDetails.avgOcup.toLocaleString("pt-BR")}</span>
                    <span className="text-[10px] text-slate-400 font-mono">plts</span>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border ${isDark ? "bg-[#141a2e] border-[#1e2740]" : "bg-slate-50 border-slate-200"}`}>
                  <span className={`text-[9px] uppercase font-mono font-bold block ${isDark ? "text-slate-400" : "text-slate-600"}`}>Capacidade Média</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-lg font-black ${isDark ? "text-white" : "text-slate-950"}`}>{activeTimelineDetails.avgCap.toLocaleString("pt-BR")}</span>
                    <span className="text-[10px] text-slate-400 font-mono">plts</span>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border ${isDark ? "bg-[#141a2e] border-[#1e2740]" : "bg-slate-50 border-slate-200"}`}>
                  <span className={`text-[9px] uppercase font-mono font-bold block ${isDark ? "text-slate-400" : "text-slate-600"}`}>Taxa Média</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-lg font-black ${
                      activeTimelineDetails.avgPct >= 85 ? "text-rose-500" : activeTimelineDetails.avgPct >= 75 ? "text-amber-500" : "text-emerald-500"
                    }`}>{activeTimelineDetails.avgPct}%</span>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border ${isDark ? "bg-[#141a2e] border-[#1e2740]" : "bg-slate-50 border-slate-200"}`}>
                  <span className={`text-[9px] uppercase font-mono font-bold block ${isDark ? "text-slate-400" : "text-slate-600"}`}>Pico Máximo</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-lg font-black text-violet-400">{activeTimelineDetails.maxOcup.toLocaleString("pt-BR")}</span>
                    <span className="text-[10px] text-slate-400 font-mono">plts</span>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border ${isDark ? "bg-[#0b0e17] border-[#1a2136]" : "bg-slate-50/70 border-slate-200"}`}>
                <div className="w-full h-72 sm:h-80 relative">
                  <Chart type="bar" data={projectionChartData as any} options={projectionChartOptions as any} />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <h4 className={`text-xs font-bold uppercase tracking-wider font-mono ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Detalhamento Diário ({projectionMode === "real" ? `${realDates.length} Dias Retroativos` : "14 Dias de Projeção"})
                </h4>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className={`uppercase text-[9px] font-mono font-bold border-b ${
                      isDark ? "bg-[#141b2e] text-slate-100 border-slate-800" : "bg-slate-100 text-slate-900 border-slate-200"
                    }`}>
                      <tr>
                        <th className="py-2.5 px-3">Data</th>
                        <th className="py-2.5 px-3">Dia</th>
                        <th className="py-2.5 px-3 text-right">Capacidade Total</th>
                        <th className="py-2.5 px-3 text-right">Capacidade Ocupado</th>
                        <th className="py-2.5 px-3 text-right">Capacidade Livre</th>
                        <th className="py-2.5 px-3 text-center">Ocupação (%)</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-mono">
                      {activeTimelineDetails.rows.map((row) => (
                        <tr key={row.date} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-violet-500 dark:text-violet-400">
                            {row.displayDate}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                            {row.weekday}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 font-semibold">
                            {row.capacidade.toLocaleString("pt-BR")} plts
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-violet-600 dark:text-violet-400">
                            {row.ocupada.toLocaleString("pt-BR")} plts
                          </td>
                          <td className="py-2.5 px-3 text-right text-cyan-600 dark:text-cyan-400 font-medium">
                            {row.livre.toLocaleString("pt-BR")} plts
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className={`font-black ${
                                row.pct >= 85 ? "text-rose-500" : row.pct >= 75 ? "text-amber-500" : "text-emerald-500"
                              }`}>
                                {row.pct}%
                              </span>
                              <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden hidden sm:block">
                                <div
                                  className={`h-full rounded-full ${
                                    row.pct >= 85 ? "bg-rose-500" : row.pct >= 75 ? "bg-amber-500" : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${Math.min(100, row.pct)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                              row.status === "Crítico"
                                ? "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                                : row.status === "Atenção"
                                ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                                : "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                            }`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}