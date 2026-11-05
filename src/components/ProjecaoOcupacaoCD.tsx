import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  RotateCcw,
  Save,
  Info,
  X,
} from "lucide-react";

interface ProjecaoOcupacaoCDProps {
  theme?: "light" | "dark";
  showNotification?: (msg: string) => void;
  onPageChange?: (page: string) => void;
}

// ---------------------------------------------------------------------------
// Constantes e Parâmetros (Idênticos ao modelo de inteligência do anexo)
// ---------------------------------------------------------------------------
const HOJE = new Date(2026, 9, 30); // 30 de Outubro de 2026
const FATOR_CX_PALLET = 40;
const PALLET_POR_VEICULO = 26;
const CDS = ["CD 01", "CD 02", "CD 03"] as const;
const CATS: Record<string, number> = {
  Mercearia: 14000,
  Bebidas: 9000,
  Perecíveis: 4500,
  Bazar: 6000,
  "Higiene e Limpeza": 7000,
};
const CD_MULT: Record<string, number> = {
  "CD 01": 1.0,
  "CD 02": 0.8,
  "CD 03": 0.6,
};
const RANGE_INI = new Date(2026, 7, 1);
const RANGE_FIM = new Date(2026, 11, 31);
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];
const WD = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const STORAGE_KEY = "proj-ocup-cd-ajustes-v2";
const EDIT_FIELDS = ["receb", "fat", "fechado"] as const;

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const addD = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const nf = (n: number | null | undefined): string =>
  n == null || isNaN(n) ? "—" : Math.round(n).toLocaleString("pt-BR");

const pf = (n: number | null | undefined): string =>
  n == null || isNaN(n)
    ? "—"
    : (n * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";

const HOJE_ISO = iso(HOJE);

// Gerador pseudo-aleatório determinístico idêntico ao anexo
function rng(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface BaseDia {
  iso: string;
  receb: number;
  fat: number;
  fechado: number;
  bloq: number;
  real: number | null;
}

interface BaseItem {
  cap: number;
  occ0: number;
  dias: BaseDia[];
}

// Inicializa a BASE com exata fidelidade algorítmica ao anexo HTML
const BASE: Record<string, BaseItem> = {};
for (const cd of CDS) {
  for (const cat in CATS) {
    const r = rng(`${cd}|${cat}`);
    const cap = Math.round((CATS[cat] * CD_MULT[cd]) / 10) * 10;
    let occ = cap * (0.8 + r() * 0.08);
    const occ0 = occ;
    const dias: BaseDia[] = [];
    for (let d = new Date(RANGE_INI); d <= RANGE_FIM; d = addD(d, 1)) {
      const wd = d.getDay();
      const peso = wd === 0 ? 0.25 : wd === 6 ? 0.6 : 1.0;
      const palR = cap * 0.065 * peso * (0.85 + r() * 0.3);
      const drift = occ / cap > 0.9 ? 1.08 : occ / cap < 0.78 ? 0.92 : 1.0;
      const palF = cap * 0.065 * peso * (0.85 + r() * 0.3) * drift;
      const totalFatCx = Math.round(palF * FATOR_CX_PALLET);
      const fatFrac = Math.round(totalFatCx * 0.6);
      const fatFech = totalFatCx - fatFrac;
      const k = iso(d);
      const passado = k < HOJE_ISO;
      const realOcc = occ + palR * (0.95 + r() * 0.1) - palF * (0.95 + r() * 0.1);
      dias.push({
        iso: k,
        receb: Math.max(0, Math.round(palR / PALLET_POR_VEICULO)),
        fat: fatFrac,
        fechado: fatFech,
        bloq: Math.round(cap * (0.015 + r() * 0.02)),
        real: passado ? Math.round(realOcc) : null,
      });
      if (passado) occ = realOcc;
      else occ = occ + palR - palF;
    }
    BASE[`${cd}|${cat}`] = { cap, occ0: Math.round(occ0), dias };
  }
}

interface DayAggregate {
  iso: string;
  receb: number;
  palRec: number;
  fat: number;
  fechado: number;
  palFat: number;
  bloq: number;
  real: number | null;
  temReal: boolean;
  proj: number;
  pctProj: number;
  pctReal: number | null;
  mod: { receb?: boolean; fat?: boolean; fechado?: boolean };
}

export default function ProjecaoOcupacaoCD({
  theme = "dark",
  showNotification,
}: ProjecaoOcupacaoCDProps) {
  const isDark = theme === "dark";

  // Estados com exatos rótulos e valores default do anexo
  const [visao, setVisao] = useState<"semana" | "mes">("semana");
  const [mes, setMes] = useState<number>(HOJE.getMonth()); // Outubro = 9
  const [cd, setCd] = useState<string>("CD 01");
  const [cat, setCat] = useState<string>("Mercearia");

  // Ajustes manuais de simulação do usuário (localStorage)
  const [ajustes, setAjustes] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [pendente, setPendente] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>("");
  // Estado de destaque sincronizado bidirecional entre Gráfico e Tabela
  const [selectedIso, setSelectedIso] = useState<string | null>(null);

  // Cálculo de período idêntico ao anexo:
  // if (visao==='semana'){ const ini=addD(HOJE,-((HOJE.getDay()+6)%7)); return [ini, addD(ini,6)] }
  // return [new Date(ano, mes, 1), new Date(ano, mes+1, 0)]
  const [iniDate, fimDate] = useMemo(() => {
    if (visao === "semana") {
      const ini = addD(HOJE, -((HOJE.getDay() + 6) % 7));
      return [ini, addD(ini, 6)];
    }
    return [new Date(2026, mes, 1), new Date(2026, mes + 1, 0)];
  }, [visao, mes]);

  const editavel = cd !== "__all" && cat !== "__all";

  // Série operacional consolidada (inteligência matemática exata do anexo)
  const { capTotal, serieAgg } = useMemo(() => {
    const cds = cd === "__all" ? CDS : [cd];
    const cats = cat === "__all" ? Object.keys(CATS) : [cat];
    let cap = 0;
    let occ0 = 0;
    const agg: Record<number, {
      iso: string;
      receb: number;
      fat: number;
      fechado: number;
      bloq: number;
      real: number;
      temReal: boolean;
      mod: { receb?: boolean; fat?: boolean; fechado?: boolean };
    }> = {};

    for (const c of cds) {
      for (const ct of cats) {
        const b = BASE[`${c}|${ct}`];
        if (!b) continue;
        cap += b.cap;
        occ0 += b.occ0;
        b.dias.forEach((d, i) => {
          if (!agg[i]) {
            agg[i] = {
              iso: d.iso,
              receb: 0,
              fat: 0,
              fechado: 0,
              bloq: 0,
              real: 0,
              temReal: false,
              mod: {},
            };
          }
          const fut = d.iso > HOJE_ISO;
          for (const f of EDIT_FIELDS) {
            const k = `${c}|${ct}|${d.iso}|${f}`;
            const aj = fut && k in ajustes;
            agg[i][f] += aj ? ajustes[k] : d[f];
            if (aj) agg[i].mod[f] = true;
          }
          agg[i].bloq += d.bloq;
          if (d.real != null) {
            agg[i].real += d.real;
            agg[i].temReal = true;
          }
        });
      }
    }

    const totalDays = Object.keys(agg).length;
    const processed: DayAggregate[] = [];
    let prev = occ0;

    for (let i = 0; i < totalDays; i++) {
      const a = agg[i];
      const palRec = a.receb * PALLET_POR_VEICULO;
      const palFat = (a.fat + a.fechado) / FATOR_CX_PALLET;
      const proj = prev + palRec - palFat;
      const pctProj = cap > 0 ? proj / cap : 0;
      const real = a.temReal ? a.real : null;
      const pctReal = real != null && cap > 0 ? real / cap : null;

      processed.push({
        iso: a.iso,
        receb: a.receb,
        palRec,
        fat: a.fat,
        fechado: a.fechado,
        palFat,
        bloq: a.bloq,
        real,
        temReal: a.temReal,
        proj,
        pctProj,
        pctReal,
        mod: a.mod,
      });

      prev = real != null ? real : proj;
    }

    return { capTotal: cap, serieAgg: processed };
  }, [cd, cat, ajustes]);

  // Linhas visíveis no período
  const rowsVisiveis = useMemo(() => {
    const a = iso(iniDate);
    const z = iso(fimDate);
    return serieAgg.filter((d) => d.iso >= a && d.iso <= z);
  }, [serieAgg, iniDate, fimDate]);

  const selectedRow = useMemo(
    () => rowsVisiveis.find((r) => r.iso === selectedIso) || null,
    [rowsVisiveis, selectedIso]
  );

  // KPIs com os exatos rótulos e subtextos do anexo
  const kpis = useMemo(() => {
    const ultReal = [...serieAgg]
      .reverse()
      .find((d) => d.real != null && d.iso <= iso(fimDate));
    const lastRow = rowsVisiveis[rowsVisiveis.length - 1];

    const pa = ultReal && capTotal > 0 ? ultReal.real! / capTotal : null;
    const pp = lastRow && capTotal > 0 ? lastRow.pctProj : null;

    return {
      cap: capTotal,
      capNote: `Posição ${HOJE_ISO.slice(8)}/${HOJE_ISO.slice(5, 7)}`,
      ocu: ultReal ? ultReal.real : null,
      ocuNote: ultReal
        ? `realizado em ${ultReal.iso.slice(8)}/${ultReal.iso.slice(5, 7)}`
        : "sem realizado",
      proj: lastRow ? lastRow.proj : 0,
      projNote: lastRow
        ? `projetado para ${lastRow.iso.slice(8)}/${lastRow.iso.slice(5, 7)}`
        : "—",
      pa,
      pp,
    };
  }, [serieAgg, rowsVisiveis, capTotal, fimDate]);

  // Subtítulo do período (exatamente como no anexo)
  const periodoTexto = useMemo(() => {
    const fmt = (d: Date) =>
      `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    const baseTexto = visao === "semana" ? "Semana atual" : `Mês de ${MESES[mes]}`;
    return `${baseTexto} · ${fmt(iniDate)} a ${fmt(fimDate)} · realizado até ${fmt(addD(HOJE, -1))}`;
  }, [visao, mes, iniDate, fimDate]);

  // Edição
  const handleInputChange = (kIso: string, f: "receb" | "fat" | "fechado", valStr: string) => {
    if (!editavel || kIso <= HOJE_ISO) return;
    const v = Math.max(0, Math.round(Number(valStr) || 0));
    setAjustes((prev) => ({
      ...prev,
      [`${cd}|${cat}|${kIso}|${f}`]: v,
    }));
    setPendente(true);
    setSaveStatus("Alterações não salvas");
  };

  // Salvar (exato como no anexo)
  const handleSalvar = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ajustes));
      setPendente(false);
      const h = new Date();
      const hora = `${String(h.getHours()).padStart(2, "0")}:${String(h.getMinutes()).padStart(2, "0")}`;
      setSaveStatus(`Salvo às ${hora}`);
      if (showNotification) {
        showNotification("Projeção salva com sucesso!");
      }
    } catch {
      setSaveStatus("Não foi possível salvar neste navegador");
    }
  };

  // Desfazer ajustes desta visão (exato como no anexo)
  const handleReset = () => {
    const a = iso(iniDate);
    const z = iso(fimDate);
    let n = 0;
    const novoAjustes = { ...ajustes };
    for (const k of Object.keys(novoAjustes)) {
      const p = k.split("|");
      if (p[0] === cd && p[1] === cat && p[2] >= a && p[2] <= z) {
        delete novoAjustes[k];
        n++;
      }
    }
    setAjustes(novoAjustes);
    if (n) {
      setPendente(true);
      setSaveStatus("Alterações não salvas");
    }
  };

  // Status de ocupação (p-ok, p-warn, p-bad)
  const getPillClass = (p: number) => {
    if (p >= 0.95) {
      return isDark
        ? "bg-rose-500/15 text-rose-300 font-semibold"
        : "bg-rose-50 text-rose-700 font-semibold";
    }
    if (p >= 0.9) {
      return isDark
        ? "bg-amber-500/15 text-amber-300 font-semibold"
        : "bg-amber-50 text-amber-700 font-semibold";
    }
    return isDark
      ? "bg-emerald-500/15 text-emerald-300 font-semibold"
      : "bg-emerald-50 text-emerald-700 font-semibold";
  };

  const getPillColor = (p: number | null) => {
    if (p == null) return isDark ? "#94a3b8" : "#64748b";
    if (p >= 0.95) return isDark ? "#fb7185" : "#b4372b";
    if (p >= 0.9) return isDark ? "#fbbf24" : "#b07a0a";
    return isDark ? "#34d399" : "#2f7d4f";
  };

  // Gráfico SVG Ocupação dia a dia (reprodução exata da lógica de curvas e rótulos do anexo)
  const chartRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const chartData = useMemo(() => {
    if (rowsVisiveis.length === 0) return null;
    const n = rowsVisiveis.length;
    const vals = rowsVisiveis
      .flatMap((r) => [r.pctProj, r.pctReal])
      .filter((v): v is number => v != null);

    let lo = Math.floor((Math.min(...vals) * 100 - 6) / 5) * 5;
    let hi = Math.max(100, Math.ceil((Math.max(...vals) * 100) / 5) * 5);
    lo = Math.max(0, lo);

    const W = Math.max(n > 16 ? 960 : 720, 680);
    const H = 165;
    const m = { l: 40, r: 16, t: 14, b: 24 };
    const iw = W - m.l - m.r;
    const ih = H - m.t - m.b;

    const x = (i: number) => m.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
    const y = (v: number) => m.t + ih - (((v * 100 - lo) / (hi - lo || 1)) * ih);

    const step = hi - lo > 30 ? 10 : 5;
    const gridLines = [];
    for (let t = lo; t <= hi; t += step) {
      gridLines.push({ t, y: y(t / 100) });
    }

    const path = (key: "pctProj" | "pctReal") => {
      let d = "";
      let on = false;
      rowsVisiveis.forEach((r, i) => {
        const v = r[key];
        if (v == null) {
          on = false;
          return;
        }
        d += `${on ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
        on = true;
      });
      return d;
    };

    const denso = n > 16;
    const fmtL = (v: number) =>
      (v * 100).toLocaleString("pt-BR", {
        minimumFractionDigits: denso ? 0 : 1,
        maximumFractionDigits: denso ? 0 : 1,
      }) + "%";

    const hojeIdx = rowsVisiveis.findIndex((r) => r.iso === HOJE_ISO);
    const selIdx = selectedIso ? rowsVisiveis.findIndex((r) => r.iso === selectedIso) : -1;

    return {
      W,
      H,
      m,
      iw,
      ih,
      x,
      y,
      lo,
      hi,
      gridLines,
      pathProj: path("pctProj"),
      pathReal: path("pctReal"),
      hojeIdx,
      selIdx,
      denso,
      fmtL,
    };
  }, [rowsVisiveis, selectedIso]);

  // Seleção e sincronização bidirecional elegante entre Tabela e Gráfico
  const handleSelectDay = useCallback(
    (isoStr: string, fromChart = false) => {
      setSelectedIso((prev) => {
        const next = prev === isoStr ? null : isoStr;
        if (next) {
          if (fromChart) {
            // Rola suavemente a tabela para a linha selecionada sem quebrar a visão
            setTimeout(() => {
              const el = document.getElementById(`row-${isoStr}`);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }
            }, 30);
          } else if (chartRef.current && chartData) {
            // Rola o gráfico horizontalmente caso esteja em overflow
            const idx = rowsVisiveis.findIndex((r) => r.iso === isoStr);
            if (idx >= 0) {
              const ptX = chartData.x(idx);
              chartRef.current.scrollTo({
                left: Math.max(0, ptX - chartRef.current.clientWidth / 2),
                behavior: "smooth",
              });
            }
          }
        }
        return next;
      });
    },
    [rowsVisiveis, chartData]
  );

  // Tooltip flutuante inteligente (ao passar o mouse ou fixado no item selecionado quando não houver hover)
  const activeTooltip = useMemo(() => {
    if (hoveredIndex !== null && tooltipPos && rowsVisiveis[hoveredIndex]) {
      return {
        x: tooltipPos.x,
        y: tooltipPos.y,
        row: rowsVisiveis[hoveredIndex],
        isSelected: rowsVisiveis[hoveredIndex].iso === selectedIso,
      };
    }
    if (selectedIso && chartData) {
      const idx = rowsVisiveis.findIndex((r) => r.iso === selectedIso);
      if (idx >= 0) {
        const row = rowsVisiveis[idx];
        const ptX = chartData.x(idx);
        const ptY = chartData.y(Math.max(row.pctProj, row.pctReal ?? 0));
        return {
          x: ptX,
          y: ptY,
          row,
          isSelected: true,
        };
      }
    }
    return null;
  }, [hoveredIndex, tooltipPos, selectedIso, chartData, rowsVisiveis]);

  // Totais do rodapé
  const footerTotals = useMemo(() => {
    if (rowsVisiveis.length === 0) return null;
    const sumReceb = rowsVisiveis.reduce((t, r) => t + r.receb, 0);
    const sumPalRec = rowsVisiveis.reduce((t, r) => t + r.palRec, 0);
    const sumFat = rowsVisiveis.reduce((t, r) => t + r.fat, 0);
    const sumFechado = rowsVisiveis.reduce((t, r) => t + r.fechado, 0);
    const sumPalFat = rowsVisiveis.reduce((t, r) => t + r.palFat, 0);
    const last = rowsVisiveis[rowsVisiveis.length - 1];

    return {
      receb: nf(sumReceb),
      palRec: nf(sumPalRec),
      fat: nf(sumFat),
      fechado: nf(sumFechado),
      palFat: nf(sumPalFat),
      lastProj: nf(last?.proj),
      lastPctProj: pf(last?.pctProj),
      lastRawPct: last?.pctProj ?? 0,
    };
  }, [rowsVisiveis]);

  return (
    <div
      className={`w-full min-h-screen transition-colors duration-200 ${
        isDark ? "bg-[#070b14] text-slate-100" : "bg-[#f8fafc] text-slate-900"
      } p-4 md:p-6 lg:p-8 flex flex-col gap-6`}
    >
      {/* ------------------------------------------------------------- */}
      {/* CABEÇALHO: Exatos Rótulos do Anexo com Enquadramento Executivo*/}
      {/* ------------------------------------------------------------- */}
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 border-b pb-5 border-slate-200/80 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Projeção de Ocupação do CD
            </h1>
            <span className="inline-block font-mono text-[11px] tracking-wider uppercase border border-dashed border-slate-400 dark:border-slate-600 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-sm">
              dados de exemplo
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {periodoTexto}
          </p>
        </div>

        {/* Filtros: Visão, Mês, CD, Categoria (Rótulos e Opções Exatas) */}
        <div className="flex flex-wrap items-end gap-2.5 sm:gap-3 text-xs">
          {/* Visão */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-500">
              Visão
            </span>
            <div
              className={`inline-flex rounded-lg p-0.5 border ${
                isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}
            >
              <button
                type="button"
                onClick={() => setVisao("semana")}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  visao === "semana"
                    ? isDark
                      ? "bg-slate-800 text-slate-50 shadow-xs font-semibold"
                      : "bg-slate-900 text-white shadow-xs font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Semana atual
              </button>
              <button
                type="button"
                onClick={() => setVisao("mes")}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  visao === "mes"
                    ? isDark
                      ? "bg-slate-800 text-slate-50 shadow-xs font-semibold"
                      : "bg-slate-900 text-white shadow-xs font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Mês fechado
              </button>
            </div>
          </div>

          {/* Mês */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="sel-mes"
              className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-500"
            >
              Mês
            </label>
            <select
              id="sel-mes"
              disabled={visao === "semana"}
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className={`h-9 px-3 rounded-lg border font-medium outline-hidden transition-colors ${
                visao === "semana" ? "opacity-45 cursor-not-allowed" : "cursor-pointer"
              } ${
                isDark
                  ? "bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700 focus:border-amber-500/50"
                  : "bg-white border-slate-200 text-slate-800 hover:border-slate-300 focus:border-amber-600"
              }`}
            >
              {[7, 8, 9, 10, 11].map((m) => (
                <option key={m} value={m}>
                  {MESES[m].charAt(0).toUpperCase() + MESES[m].slice(1)} 2026
                </option>
              ))}
            </select>
          </div>

          {/* CD */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="sel-cd"
              className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-500"
            >
              CD
            </label>
            <select
              id="sel-cd"
              value={cd}
              onChange={(e) => setCd(e.target.value)}
              className={`h-9 px-3 rounded-lg border font-medium outline-hidden cursor-pointer transition-colors ${
                isDark
                  ? "bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700 focus:border-amber-500/50"
                  : "bg-white border-slate-200 text-slate-800 hover:border-slate-300 focus:border-amber-600"
              }`}
            >
              <option value="__all">Todos os CDs</option>
              {CDS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Categoria */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="sel-cat"
              className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-500"
            >
              Categoria
            </label>
            <select
              id="sel-cat"
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className={`h-9 px-3 rounded-lg border font-medium outline-hidden cursor-pointer transition-colors ${
                isDark
                  ? "bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700 focus:border-amber-500/50"
                  : "bg-white border-slate-200 text-slate-800 hover:border-slate-300 focus:border-amber-600"
              }`}
            >
              <option value="__all">Todas as categorias</option>
              {Object.keys(CATS).map((ct) => (
                <option key={ct} value={ct}>
                  {ct}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* FAIXA DE 5 INDICADORES: Exatos Rótulos e Cálculos do Anexo   */}
      {/* ------------------------------------------------------------- */}
      <section
        aria-label="Resumo"
        className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 rounded-2xl border shadow-xs overflow-hidden ${
          isDark
            ? "bg-slate-900/60 border-slate-800/80 divide-slate-800/80"
            : "bg-white border-slate-200/90 divide-slate-200/90"
        } divide-y md:divide-y-0 md:divide-x`}
      >
        {/* KPI 1: Qtd capacidade */}
        <div className="p-4 sm:p-5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Qtd capacidade
          </span>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {nf(kpis.cap)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {kpis.capNote}
            </div>
          </div>
        </div>

        {/* KPI 2: Qtd ocupada */}
        <div className="p-4 sm:p-5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Qtd ocupada
          </span>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {nf(kpis.ocu)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {kpis.ocuNote}
            </div>
          </div>
        </div>

        {/* KPI 3: Qtd projetada */}
        <div className="p-4 sm:p-5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Qtd projetada
          </span>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {nf(kpis.proj)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {kpis.projNote}
            </div>
          </div>
        </div>

        {/* KPI 4: % ocupação atual */}
        <div className="p-4 sm:p-5 flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            % ocupação atual
          </span>
          <div className="mt-2">
            <div
              className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums"
              style={{ color: getPillColor(kpis.pa) }}
            >
              {pf(kpis.pa)}
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (kpis.pa || 0) * 100)}%`,
                  backgroundColor: getPillColor(kpis.pa),
                }}
              />
            </div>
          </div>
        </div>

        {/* KPI 5: % ocupação projetada */}
        <div className="p-4 sm:p-5 flex flex-col justify-between col-span-2 md:col-span-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            % ocupação projetada
          </span>
          <div className="mt-2">
            <div
              className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums"
              style={{ color: getPillColor(kpis.pp) }}
            >
              {pf(kpis.pp)}
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (kpis.pp || 0) * 100)}%`,
                  backgroundColor: getPillColor(kpis.pp),
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* PAINEL 1: Ocupação dia a dia (Gráfico SVG)                   */}
      {/* ------------------------------------------------------------- */}
      <section
        id="grafico"
        aria-label="Ocupação dia a dia"
        className={`rounded-2xl border p-4 shadow-xs ${
          isDark
            ? "bg-slate-900/60 border-slate-800/80"
            : "bg-white border-slate-200/90"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Ocupação dia a dia
            </h2>
            {selectedRow && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>
                  {selectedRow.iso.slice(8)}/{selectedRow.iso.slice(5, 7)} · Proj. {pf(selectedRow.pctProj)}
                  {selectedRow.pctReal != null && ` · Real ${pf(selectedRow.pctReal)}`}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedIso(null)}
                  className="ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Remover destaque"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>

          {/* Legenda com cores idênticas ao anexo (âmbar/ouro projetada e azul/ciano realizada) */}
          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="h-1 w-4 rounded-xs bg-[#c27c0e] dark:bg-[#e9a53a]" />
              <span>Projetada (%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1 w-4 rounded-xs bg-[#1f6f8b] dark:bg-[#5fb3cf]" />
              <span>Realizada (%)</span>
            </div>
          </div>
        </div>

        {/* Gráfico SVG com curvas, pontos e rótulos diretos */}
        <div ref={chartRef} className="relative overflow-x-auto select-none pt-2 pb-1">
          {chartData && (
            <svg
              viewBox={`0 0 ${chartData.W} ${chartData.H}`}
              className="w-full min-w-[650px] overflow-visible"
              role="img"
              aria-label="Ocupação projetada e realizada por dia"
            >
              {/* Linhas de Grade e Eixo Y */}
              {chartData.gridLines.map((gl) => (
                <g key={gl.t}>
                  <line
                    x1={chartData.m.l}
                    x2={chartData.W - chartData.m.r}
                    y1={gl.y}
                    y2={gl.y}
                    stroke={isDark ? "#232928" : "#eceeeb"}
                    strokeWidth="1"
                  />
                  <text
                    x={chartData.m.l - 8}
                    y={gl.y + 4}
                    textAnchor="end"
                    fontSize="11"
                    fill={isDark ? "#9aa5a1" : "#5f6a66"}
                    fontFamily="monospace"
                  >
                    {gl.t}%
                  </text>
                </g>
              ))}

              {/* Faixa sutil de destaque da coluna selecionada */}
              {chartData.selIdx >= 0 && (
                <g>
                  <rect
                    x={chartData.x(chartData.selIdx) - (chartData.denso ? 12 : 18)}
                    y={chartData.m.t}
                    width={chartData.denso ? 24 : 36}
                    height={chartData.ih}
                    rx="6"
                    fill={isDark ? "rgba(245, 158, 11, 0.08)" : "rgba(245, 158, 11, 0.09)"}
                    stroke={isDark ? "rgba(245, 158, 11, 0.25)" : "rgba(217, 119, 6, 0.25)"}
                    strokeWidth="1"
                  />
                  <line
                    x1={chartData.x(chartData.selIdx)}
                    x2={chartData.x(chartData.selIdx)}
                    y1={chartData.m.t}
                    y2={chartData.m.t + chartData.ih}
                    stroke={isDark ? "#f59e0b" : "#d97706"}
                    strokeWidth="1.5"
                    strokeDasharray="2 3"
                    opacity="0.85"
                  />
                </g>
              )}

              {/* Rótulos do Eixo X */}
              {rowsVisiveis.map((r, i) => {
                const isHoje = r.iso === HOJE_ISO;
                const isSelected = i === chartData.selIdx;
                return (
                  <g
                    key={`lbl-${r.iso}`}
                    onClick={() => handleSelectDay(r.iso, true)}
                    className="cursor-pointer"
                  >
                    {isSelected && (
                      <rect
                        x={chartData.x(i) - (chartData.denso ? 13 : 16)}
                        y={chartData.H - 22}
                        width={chartData.denso ? 26 : 32}
                        height={16}
                        rx="4"
                        fill={isDark ? "rgba(245, 158, 11, 0.2)" : "rgba(245, 158, 11, 0.18)"}
                      />
                    )}
                    <text
                      x={chartData.x(i)}
                      y={chartData.H - 10}
                      textAnchor="middle"
                      fontSize={chartData.denso ? 10 : 11}
                      fill={
                        isSelected
                          ? isDark
                            ? "#fbbf24"
                            : "#b45309"
                          : isHoje
                          ? isDark
                            ? "#e7ebe9"
                            : "#1d2321"
                          : isDark
                          ? "#9aa5a1"
                          : "#5f6a66"
                      }
                      fontWeight={isSelected ? "700" : isHoje ? "600" : "400"}
                    >
                      {r.iso.slice(8)}/{r.iso.slice(5, 7)}
                    </text>
                  </g>
                );
              })}

              {/* Linha divisória vertical "HOJE" */}
              {chartData.hojeIdx >= 0 && (
                <g>
                  <line
                    x1={chartData.x(chartData.hojeIdx)}
                    x2={chartData.x(chartData.hojeIdx)}
                    y1={chartData.m.t}
                    y2={chartData.m.t + chartData.ih}
                    stroke={isDark ? "#9aa5a1" : "#5f6a66"}
                    strokeWidth="1"
                    strokeDasharray="2 3"
                  />
                  <text
                    x={chartData.x(chartData.hojeIdx) + 4}
                    y={chartData.m.t + 10}
                    fontSize="10"
                    fill={isDark ? "#9aa5a1" : "#5f6a66"}
                    fontFamily="monospace"
                  >
                    HOJE
                  </text>
                </g>
              )}

              {/* Curvas Projetada e Realizada */}
              {chartData.pathProj && (
                <path
                  d={chartData.pathProj}
                  fill="none"
                  stroke={isDark ? "#e9a53a" : "#c27c0e"}
                  strokeWidth="2.25"
                  strokeLinejoin="round"
                />
              )}
              {chartData.pathReal && (
                <path
                  d={chartData.pathReal}
                  fill="none"
                  stroke={isDark ? "#5fb3cf" : "#1f6f8b"}
                  strokeWidth="2.25"
                  strokeLinejoin="round"
                />
              )}

              {/* Círculos nos pontos com halo suave de destaque */}
              {rowsVisiveis.map((r, i) => {
                const isSelected = i === chartData.selIdx;
                return (
                  <g
                    key={`pts-${r.iso}`}
                    onClick={() => handleSelectDay(r.iso, true)}
                    className="cursor-pointer"
                  >
                    {isSelected && (
                      <circle
                        cx={chartData.x(i)}
                        cy={chartData.y(r.pctProj)}
                        r={chartData.denso ? 7.5 : 9.5}
                        fill="none"
                        stroke={isDark ? "#e9a53a" : "#c27c0e"}
                        strokeWidth="1.75"
                        strokeOpacity="0.8"
                        className="animate-pulse"
                      />
                    )}
                    <circle
                      cx={chartData.x(i)}
                      cy={chartData.y(r.pctProj)}
                      r={isSelected ? (chartData.denso ? 3.8 : 4.8) : (chartData.denso ? 2.2 : 3.2)}
                      fill={isDark ? "#e9a53a" : "#c27c0e"}
                    />
                    {r.pctReal != null && (
                      <>
                        {isSelected && (
                          <circle
                            cx={chartData.x(i)}
                            cy={chartData.y(r.pctReal)}
                            r={chartData.denso ? 7.5 : 9.5}
                            fill="none"
                            stroke={isDark ? "#5fb3cf" : "#1f6f8b"}
                            strokeWidth="1.75"
                            strokeOpacity="0.8"
                            className="animate-pulse"
                          />
                        )}
                        <circle
                          cx={chartData.x(i)}
                          cy={chartData.y(r.pctReal)}
                          r={isSelected ? (chartData.denso ? 4.0 : 5.0) : (chartData.denso ? 2.4 : 3.4)}
                          fill={isDark ? "#5fb3cf" : "#1f6f8b"}
                        />
                      </>
                    )}
                  </g>
                );
              })}

              {/* Rótulos de porcentagem impressos nos pontos (exatamente como no anexo) */}
              {rowsVisiveis.map((r, i) => {
                const temReal = r.pctReal != null;
                const projAcima = !temReal || r.pctProj >= r.pctReal;
                const n = rowsVisiveis.length;
                const anchor = i === 0 ? "start" : i === n - 1 ? "end" : "middle";
                const strokeColor = isDark ? "#1c2120" : "#ffffff";

                return (
                  <g key={`rot-${r.iso}`}>
                    {/* Rótulo Projetado */}
                    <text
                      x={chartData.x(i)}
                      y={chartData.y(r.pctProj) + (projAcima ? -6 : 13)}
                      textAnchor={anchor}
                      fontSize={chartData.denso ? 9 : 9.5}
                      fontWeight="600"
                      fill={isDark ? "#e9a53a" : "#c27c0e"}
                      stroke={strokeColor}
                      strokeWidth="2.5"
                      paintOrder="stroke"
                    >
                      {chartData.fmtL(r.pctProj)}
                    </text>

                    {/* Rótulo Realizado */}
                    {temReal && (
                      <text
                        x={chartData.x(i)}
                        y={chartData.y(r.pctReal!) + (!projAcima ? -6 : 13)}
                        textAnchor={anchor}
                        fontSize={chartData.denso ? 9 : 9.5}
                        fontWeight="600"
                        fill={isDark ? "#5fb3cf" : "#1f6f8b"}
                        stroke={strokeColor}
                        strokeWidth="2.5"
                        paintOrder="stroke"
                      >
                        {chartData.fmtL(r.pctReal!)}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Hit areas transparentes para seleção e Tooltip */}
              {rowsVisiveis.map((r, i) => {
                const bw =
                  rowsVisiveis.length > 1
                    ? chartData.iw / (rowsVisiveis.length - 1)
                    : chartData.iw;
                return (
                  <rect
                    key={`hit-${r.iso}`}
                    x={chartData.x(i) - bw / 2}
                    y={chartData.m.t}
                    width={bw}
                    height={chartData.ih}
                    fill="transparent"
                    className="cursor-pointer"
                    onClick={() => handleSelectDay(r.iso, true)}
                    onMouseEnter={(e) => {
                      setHoveredIndex(i);
                      const rect = e.currentTarget.getBoundingClientRect();
                      const parentRect = chartRef.current?.getBoundingClientRect();
                      if (parentRect) {
                        setTooltipPos({
                          x: rect.left + rect.width / 2 - parentRect.left,
                          y: chartData.y(Math.max(r.pctProj, r.pctReal || 0)),
                        });
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredIndex(null);
                      setTooltipPos(null);
                    }}
                  />
                );
              })}
            </svg>
          )}

          {/* Tooltip flutuante inteligente */}
          {activeTooltip && (
            <div
              className={`absolute pointer-events-none -translate-x-1/2 -translate-y-full mb-3 px-3 py-1.5 rounded-lg shadow-lg text-xs tabular-nums z-30 transition-all duration-150 border ${
                activeTooltip.isSelected
                  ? isDark
                    ? "bg-slate-900/95 border-amber-500/50 text-slate-100 shadow-amber-500/10 font-medium backdrop-blur-xs"
                    : "bg-white/95 border-amber-500/40 text-slate-900 shadow-amber-500/10 font-medium backdrop-blur-xs"
                  : isDark
                  ? "bg-[#e7ebe9] text-[#141817] font-medium border-transparent"
                  : "bg-[#1d2321] text-[#f3f4f2] font-medium border-transparent"
              }`}
              style={{
                left: `${activeTooltip.x}px`,
                top: `${Math.max(activeTooltip.y, 25)}px`,
              }}
            >
              <div className="flex items-center gap-1.5">
                {activeTooltip.isSelected && (
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                )}
                <span>
                  {activeTooltip.row.iso.slice(8)}/
                  {activeTooltip.row.iso.slice(5, 7)} · proj.{" "}
                  {pf(activeTooltip.row.pctProj)}
                  {activeTooltip.row.pctReal != null
                    ? ` · real ${pf(activeTooltip.row.pctReal)}`
                    : ""}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* PAINEL 2: Sequência diária (Tabela Operacional)               */}
      {/* ------------------------------------------------------------- */}
      <section
        id="sequencia"
        aria-label="Sequência diária"
        className={`rounded-2xl border p-5 shadow-xs ${
          isDark
            ? "bg-slate-900/60 border-slate-800/80"
            : "bg-white border-slate-200/90"
        }`}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Sequência diária
            </h2>
            {selectedRow && (
              <button
                type="button"
                onClick={() => setSelectedIso(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
                title="Limpar seleção"
              >
                <span>Foco: {selectedRow.iso.slice(8)}/{selectedRow.iso.slice(5, 7)}</span>
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Pallets, exceto recebimento (veículos) e faturamento frac. (caixas) · clique na linha para sincronizar com o gráfico
          </span>
        </div>

        {/* Mensagem de Dica com o exato texto do anexo */}
        {!editavel && (
          <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
            <Info className="h-4 w-4 shrink-0" />
            <span>
              Para editar, selecione um CD e uma categoria específicos. Com &quot;Todos&quot; a tabela mostra a soma. A edição vale a partir de amanhã (D+1); até hoje fica o realizado.
            </span>
          </div>
        )}

        {/* Tabela Operacional sem bordas duras, com excelente legibilidade e tamanho ampliado */}
        <div className="overflow-x-auto rounded-xl">
          <table className="w-full text-sm text-left border-separate border-spacing-y-2 min-w-[1100px]">
            <thead>
              <tr className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4 text-right">
                  Recebimento
                  <br />
                  (veículo)
                  <span className="block text-[10px] font-semibold lowercase tracking-normal text-amber-600 dark:text-amber-400 mt-0.5">
                    editável
                  </span>
                </th>
                <th className="py-3 px-4 text-right">
                  Pallet proj.
                  <br />
                  recebimento
                </th>
                <th className="py-3 px-4 text-right">
                  Faturamento
                  <br />
                  frac. (cx)
                  <span className="block text-[10px] font-semibold lowercase tracking-normal text-amber-600 dark:text-amber-400 mt-0.5">
                    editável
                  </span>
                </th>
                <th className="py-3 px-4 text-right">
                  Fechado
                  <br />
                  (cx)
                  <span className="block text-[10px] font-semibold lowercase tracking-normal text-amber-600 dark:text-amber-400 mt-0.5">
                    editável
                  </span>
                </th>
                <th className="py-3 px-4 text-right">
                  Pallet proj.
                  <br />
                  faturamento
                </th>
                <th className="py-3 px-4 text-right">Bloqueado</th>
                <th className="py-3 px-4 text-right">Qtd ocupada</th>
                <th className="py-3 px-4 text-right">
                  Qtd ocupada
                  <br />
                  projetada
                </th>
                <th className="py-3 px-4 text-right">
                  % ocupação
                  <br />
                  projetada
                </th>
              </tr>
            </thead>
            <tbody>
              {rowsVisiveis.map((r) => {
                const isHoje = r.iso === HOJE_ISO;
                const isPassado = r.iso < HOJE_ISO;
                const isFuturo = r.iso > HOJE_ISO;
                const isSelected = r.iso === selectedIso;
                const [, m, dd] = r.iso.split("-").map(Number);
                const dt = new Date(r.iso + "T12:00:00");
                const wd = WD[dt.getDay()];

                return (
                  <tr
                    key={r.iso}
                    id={`row-${r.iso}`}
                    onClick={(e) => {
                      const tag = (e.target as HTMLElement).tagName;
                      if (tag === "INPUT" || tag === "BUTTON") return;
                      handleSelectDay(r.iso, false);
                    }}
                    className={`transition-all duration-200 cursor-pointer select-none group rounded-xl ${
                      isSelected
                        ? isDark
                          ? "bg-amber-500/15 ring-2 ring-amber-400/60 shadow-md font-semibold"
                          : "bg-amber-50 ring-2 ring-amber-400/70 shadow-md font-semibold text-slate-950"
                        : isHoje
                        ? isDark
                          ? "bg-slate-800/90 font-semibold shadow-xs"
                          : "bg-slate-100 font-semibold text-slate-950 shadow-xs"
                        : isDark
                        ? "bg-slate-900/50 hover:bg-slate-800/50"
                        : "bg-slate-50/80 hover:bg-slate-100/80"
                    }`}
                    title={isSelected ? "Clique para remover o destaque" : "Clique para destacar no gráfico"}
                  >
                    {/* Data */}
                    <td className="py-3.5 px-4 first:rounded-l-xl whitespace-nowrap">
                      <div className="inline-flex items-center">
                        {isSelected && (
                          <span
                            className="inline-block w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400 mr-2.5 shadow-xs ring-2 ring-amber-500/30 dark:ring-amber-400/30 animate-pulse"
                            title="Em destaque"
                          />
                        )}
                        <span className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mr-2.5 tracking-wider">
                          {wd}
                        </span>
                        <span className={`text-sm font-bold ${isSelected ? "text-amber-700 dark:text-amber-300 font-extrabold" : "text-slate-800 dark:text-slate-200"}`}>
                          {String(dd).padStart(2, "0")}/{String(m).padStart(2, "0")}
                        </span>
                        {isHoje && (
                          <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400">
                            hoje
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Recebimento (veículo) */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {isFuturo && editavel ? (
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          onClick={(e) => e.stopPropagation()}
                          value={Math.round(r.receb)}
                          onChange={(e) => handleInputChange(r.iso, "receb", e.target.value)}
                          className={`w-24 text-right px-3 py-1.5 rounded-lg text-sm font-mono font-semibold outline-hidden transition-all ${
                            r.mod.receb
                              ? isDark
                                ? "bg-amber-500/25 text-amber-200 ring-2 ring-amber-500/60 font-bold"
                                : "bg-amber-100 text-amber-900 ring-2 ring-amber-400 font-bold"
                              : isDark
                              ? "bg-slate-800 text-slate-100 border border-slate-700/80 focus:ring-2 focus:ring-amber-500"
                              : "bg-white text-slate-900 border border-slate-300 focus:ring-2 focus:ring-amber-500"
                          }`}
                        />
                      ) : (
                        <span className="tabular-nums font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {nf(r.receb)}
                        </span>
                      )}
                    </td>

                    {/* Pallet proj. recebimento */}
                    <td className="py-3.5 px-4 text-right tabular-nums font-mono text-sm font-medium text-slate-700 dark:text-slate-300">
                      {nf(r.palRec)}
                    </td>

                    {/* Faturamento frac. (cx) */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {isFuturo && editavel ? (
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          onClick={(e) => e.stopPropagation()}
                          value={Math.round(r.fat)}
                          onChange={(e) => handleInputChange(r.iso, "fat", e.target.value)}
                          className={`w-28 text-right px-3 py-1.5 rounded-lg text-sm font-mono font-semibold outline-hidden transition-all ${
                            r.mod.fat
                              ? isDark
                                ? "bg-amber-500/25 text-amber-200 ring-2 ring-amber-500/60 font-bold"
                                : "bg-amber-100 text-amber-900 ring-2 ring-amber-400 font-bold"
                              : isDark
                              ? "bg-slate-800 text-slate-100 border border-slate-700/80 focus:ring-2 focus:ring-amber-500"
                              : "bg-white text-slate-900 border border-slate-300 focus:ring-2 focus:ring-amber-500"
                          }`}
                        />
                      ) : (
                        <span className="tabular-nums font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {nf(r.fat)}
                        </span>
                      )}
                    </td>

                    {/* Fechado (cx) */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {isFuturo && editavel ? (
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          onClick={(e) => e.stopPropagation()}
                          value={Math.round(r.fechado)}
                          onChange={(e) => handleInputChange(r.iso, "fechado", e.target.value)}
                          className={`w-28 text-right px-3 py-1.5 rounded-lg text-sm font-mono font-semibold outline-hidden transition-all ${
                            r.mod.fechado
                              ? isDark
                                ? "bg-amber-500/25 text-amber-200 ring-2 ring-amber-500/60 font-bold"
                                : "bg-amber-100 text-amber-900 ring-2 ring-amber-400 font-bold"
                              : isDark
                              ? "bg-slate-800 text-slate-100 border border-slate-700/80 focus:ring-2 focus:ring-amber-500"
                              : "bg-white text-slate-900 border border-slate-300 focus:ring-2 focus:ring-amber-500"
                          }`}
                        />
                      ) : (
                        <span className="tabular-nums font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {nf(r.fechado)}
                        </span>
                      )}
                    </td>

                    {/* Pallet proj. faturamento */}
                    <td className="py-3.5 px-4 text-right tabular-nums font-mono text-sm font-medium text-slate-700 dark:text-slate-300">
                      {nf(r.palFat)}
                    </td>

                    {/* Bloqueado */}
                    <td className="py-3.5 px-4 text-right tabular-nums font-mono text-sm font-medium text-slate-500 dark:text-slate-400">
                      {nf(r.bloq)}
                    </td>

                    {/* Qtd ocupada */}
                    <td className="py-3.5 px-4 text-right tabular-nums font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                      {r.real != null ? nf(r.real) : "—"}
                    </td>

                    {/* Qtd ocupada projetada */}
                    <td
                      className={`py-3.5 px-4 text-right tabular-nums font-mono font-bold text-sm ${
                        isPassado
                          ? "text-slate-400 dark:text-slate-500"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {nf(r.proj)}
                    </td>

                    {/* % ocupação projetada */}
                    <td className="py-3.5 px-4 text-right last:rounded-r-xl whitespace-nowrap">
                      <span
                        className={`inline-flex items-center justify-center min-w-[70px] px-3 py-1 rounded-lg text-xs font-bold tabular-nums transition-all ${
                          isSelected ? "ring-2 ring-amber-500/50 shadow-xs" : ""
                        } ${getPillClass(r.pctProj)}`}
                      >
                        {pf(r.pctProj)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Linha Total / fim com os exatos valores e rótulos */}
            {footerTotals && (
              <tfoot>
                <tr
                  className={`font-bold rounded-xl text-sm ${
                    isDark ? "bg-slate-800 text-slate-100" : "bg-slate-100 text-slate-900"
                  }`}
                >
                  <td className="py-4 px-4 first:rounded-l-xl">Total / fim</td>
                  <td className="py-4 px-4 text-right font-mono tabular-nums">{footerTotals.receb}</td>
                  <td className="py-4 px-4 text-right font-mono tabular-nums">{footerTotals.palRec}</td>
                  <td className="py-4 px-4 text-right font-mono tabular-nums">{footerTotals.fat}</td>
                  <td className="py-4 px-4 text-right font-mono tabular-nums">{footerTotals.fechado}</td>
                  <td className="py-4 px-4 text-right font-mono tabular-nums">{footerTotals.palFat}</td>
                  <td className="py-4 px-4 text-right font-mono text-slate-400">—</td>
                  <td className="py-4 px-4 text-right font-mono text-slate-400">—</td>
                  <td className="py-4 px-4 text-right font-mono tabular-nums text-amber-600 dark:text-amber-400">
                    {footerTotals.lastProj}
                  </td>
                  <td className="py-4 px-4 text-right last:rounded-r-xl">
                    <span
                      className={`inline-flex items-center justify-center min-w-[70px] px-3 py-1 rounded-lg text-xs font-bold tabular-nums ${getPillClass(
                        footerTotals.lastRawPct
                      )}`}
                    >
                      {footerTotals.lastPctProj}
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Rodapé: Exatas Fórmulas Provisórias e Botões do Anexo */}
        <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <p className="leading-relaxed max-w-3xl text-[11px]">
            Fórmulas provisórias: pallet proj. receb. = veículos × 26 pallets/veículo · pallet proj. fat. = (faturamento frac. + fechado cx) ÷ 40 cx/pallet · ocupada proj. = ocupada do dia anterior (real ou projetada) + pallet proj. receb. − pallet proj. fat.
          </p>

          <div className="flex items-center gap-3 shrink-0">
            {saveStatus && (
              <span
                className={`text-[11px] font-medium ${
                  pendente
                    ? "text-amber-600 dark:text-amber-400 font-semibold"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {saveStatus}
              </span>
            )}

            <button
              type="button"
              onClick={handleReset}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-colors ${
                isDark
                  ? "border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700/60"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <RotateCcw className="h-3 w-3" />
              Desfazer ajustes desta visão
            </button>

            <button
              type="button"
              disabled={!pendente}
              onClick={handleSalvar}
              className={`inline-flex items-center gap-1.5 h-8 px-4 rounded-lg font-medium text-xs transition-all ${
                pendente
                  ? isDark
                    ? "bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold shadow-xs cursor-pointer"
                    : "bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-xs cursor-pointer"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60"
              }`}
            >
              <Save className="h-3.5 w-3.5" />
              Salvar
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
