import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw,
  Building2,
  CalendarDays,
  Layers3,
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
  Truck,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Edit3,
} from "lucide-react";
import { Capacidade, Filters } from "../types";
import EditCapacityModal from "./EditCapacityModal";

const API_BASE_URL = '/api';
const CAPACIDADES_ENDPOINT = '/capacidades';

const CATEGORIAS_POR_CD: Record<string, string[]> = {
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

function getWeekOfMonth(day: number): number {
  return Math.ceil(day / 7);
}

function number(n: number | null | undefined): string {
  if (n === null || n === undefined) return "--";
  return n.toLocaleString("pt-BR");
}

function amount(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const val = typeof v === "number" ? v : Number(v);
  return Number.isNaN(val) ? 0 : val;
}

function dateLabel(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  const [y, m, d] = parts;
  const dt = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
  const wd = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][dt.getDay()] || "";
  return `${d}/${m}/${y} (${wd})`;
}

const th = "px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 select-none";
const td = "px-4 py-3 text-sm text-slate-700 dark:text-slate-200";
const selectClass = "w-full rounded-xl bg-slate-500/5 dark:bg-slate-500/10 hover:bg-slate-500/10 dark:hover:bg-slate-500/15 px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 transition-colors cursor-pointer border-0";

interface CapacidadesProps {
  activeTab: "inbound" | "outbound";
  user: any;
  showNotification: (msg: string) => void;
  onOpenMetasModal?: () => void;
  onTabChange: (tab: "inbound" | "outbound") => void;
  theme?: "light" | "dark";
}

export default function Capacidades({
  activeTab,
  user,
  showNotification,
  onTabChange,
  theme = "dark",
}: CapacidadesProps) {
  const [records, setRecords] = useState<Capacidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ cd: "all", mes: "all", categoria: "all" });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(undefined);
  const [saving, setSaving] = useState(false);

  const isInbound = activeTab === "inbound";

  const fetchCapacidades = useCallback(async (silent: boolean = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
      const response = await fetch(`${API_BASE_URL}${CAPACIDADES_ENDPOINT}`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setRecords(data);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar dados.");
      if (!silent) {
        setRecords([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.token]);

  useEffect(() => {
    fetchCapacidades();
  }, [fetchCapacidades]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchCapacidades(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchCapacidades]);

  const options = useMemo(() => {
    const cds = new Set<string>();
    const meses = new Set<string>();
    const categorias = new Set<string>();

    records.forEach(item => {
      if (item.cd !== undefined && item.cd !== null) cds.add(String(item.cd));
      if (item.dataMovimentacao) meses.add(item.dataMovimentacao.substring(0, 7));
      if (item.categoria) categorias.add(item.categoria);
    });

    return {
      cds: Array.from(cds).sort((a, b) => Number(a) - Number(b)),
      meses: Array.from(meses).sort(),
      categorias: Array.from(categorias).sort(),
    };
  }, [records]);

  const categories = useMemo(() => {
    if (filters.cd === "all") {
      return options.categorias;
    }
    return CATEGORIAS_POR_CD[filters.cd] || options.categorias;
  }, [filters.cd, options.categorias]);

  const filtered = useMemo(() => {
    return records.filter(item => {
      const mCd = filters.cd === "all" || String(item.cd) === filters.cd;
      const mMes = filters.mes === "all" || item.dataMovimentacao.startsWith(filters.mes);
      const mCat = filters.categoria === "all" || item.categoria === filters.categoria;
      return mCd && mMes && mCat;
    });
  }, [records, filters]);

  const summary = useMemo(() => {
    let normal = 0;
    let extra = 0;
    let fracionado = 0;
    let fechado = 0;

    filtered.forEach(item => {
      normal += amount(item.capacidadeInbound);
      extra += amount(item.recebimentoRemunerado);
      fracionado += amount(item.capacidadeOutboundFracionado);
      fechado += amount(item.capacidadeOutboundFechado);
    });

    return { normal, extra, fracionado, fechado };
  }, [filtered]);

  const months = useMemo(() => {
    const monthsMap: Record<string, Capacidade[]> = {};
    filtered.forEach(item => {
      const k = item.dataMovimentacao.substring(0, 7);
      if (!monthsMap[k]) monthsMap[k] = [];
      monthsMap[k].push(item);
    });

    const mn: Record<string, string> = {
      "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
      "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
      "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro"
    };

    return Object.keys(monthsMap).sort().map(k => {
      const items = [...monthsMap[k]].sort((a, b) => a.dataMovimentacao.localeCompare(b.dataMovimentacao));
      const y = k.substring(0, 4);
      const mon = k.substring(5, 7);
      const title = `${mn[mon] || "Mês"} de ${y}`;

      const uniqueCds = Array.from(new Set(items.map(x => x.cd).filter(Boolean)));
      const uniqueCats = Array.from(new Set(items.map(x => x.categoria).filter(Boolean)));

      const cd = uniqueCds.length === 1 ? `CD ${uniqueCds[0]}` : "Vários CDs";
      const category = uniqueCats.length === 1 ? uniqueCats[0] : "Múltiplas";

      const inbound = items.reduce((acc, curr) => acc + amount(curr.capacidadeInbound) + amount(curr.recebimentoRemunerado), 0);
      const frac = items.reduce((acc, curr) => acc + amount(curr.capacidadeOutboundFracionado), 0);
      const fech = items.reduce((acc, curr) => acc + amount(curr.capacidadeOutboundFechado), 0);

      return {
        key: k,
        title,
        cd,
        category,
        inbound,
        frac,
        fech,
        items,
      };
    });
  }, [filtered]);

  const openEdit = (item: Capacidade) => {
    if (!user || user.role !== "admin") {
      showNotification("❌ Apenas administradores podem editar!");
      return;
    }
    setEditTarget({
      id: item.id,
      dateStr: dateLabel(item.dataMovimentacao),
      capacidadeInbound: item.capacidadeInbound,
      recebimentoRemunerado: item.recebimentoRemunerado,
      capacidadeOutboundFracionado: item.capacidadeOutboundFracionado,
      capacidadeOutboundFechado: item.capacidadeOutboundFechado,
      cd: item.cd,
      categoria: item.categoria,
      raw: item,
    });
    setEditing(true);
  };

  const save = async (payload: any) => {
    if (!user || user.role !== "admin") {
      showNotification("❌ Apenas administradores podem editar!");
      return;
    }
    setSaving(true);
    try {
      let rawItem = payload.raw;
      if (!rawItem && payload.id) {
        rawItem = records.find(i => i.id === payload.id);
      }
      if (!rawItem && editTarget?.raw) {
        rawItem = editTarget.raw;
      }
      if (!rawItem) {
        showNotification("❌ Dados do registro ausentes.");
        return;
      }

      const dataMovimentacao = rawItem.dataMovimentacao;
      const parts = dataMovimentacao.split("-");
      const ano = parseInt(parts[0], 10);
      const mes = parseInt(parts[1], 10);
      const dia = parseInt(parts[2], 10);
      const semana = getWeekOfMonth(dia);

      const body: any = {
        id: rawItem.id,
        dataMovimentacao: dataMovimentacao,
        cd: rawItem.cd,
        categoria: rawItem.categoria,
        semana: semana,
        ano: ano,
        mes: mes,
        dia: dia,
      };

      if (activeTab === "inbound") {
        body.capacidadeInbound = payload.capacidadeInbound !== undefined && payload.capacidadeInbound !== null
          ? Number(payload.capacidadeInbound)
          : rawItem.capacidadeInbound || 0;
        body.recebimentoRemunerado = payload.recebimentoRemunerado !== undefined && payload.recebimentoRemunerado !== null
          ? Number(payload.recebimentoRemunerado)
          : rawItem.recebimentoRemunerado || null;
        body.capacidadeOutboundFracionado = rawItem.capacidadeOutboundFracionado || 0;
        body.capacidadeOutboundFechado = rawItem.capacidadeOutboundFechado || 0;
      } else {
        body.capacidadeInbound = rawItem.capacidadeInbound || 0;
        body.capacidadeOutboundFracionado = payload.capacidadeOutboundFracionado !== undefined && payload.capacidadeOutboundFracionado !== null
          ? Number(payload.capacidadeOutboundFracionado)
          : rawItem.capacidadeOutboundFracionado || 0;
        body.capacidadeOutboundFechado = payload.capacidadeOutboundFechado !== undefined && payload.capacidadeOutboundFechado !== null
          ? Number(payload.capacidadeOutboundFechado)
          : rawItem.capacidadeOutboundFechado || 0;
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user?.token) {
        headers["Authorization"] = `Bearer ${user.token}`;
      }

      const res = await fetch(`${API_BASE_URL}${CAPACIDADES_ENDPOINT}/${rawItem.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status} - ${errorText}`);
      }

      showNotification("✅ Capacidade atualizada!");
      setEditing(false);
      setEditTarget(undefined);
      await fetchCapacidades(true);
    } catch (err: any) {
      showNotification(`❌ Erro ao salvar: ${err.message || "Erro desconhecido"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 space-y-6 text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        
        {/* CABEÇALHO SÉRIO E DISCRETO */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Planejamento operacional
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Capacidades logísticas
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Consulta e manutenção das capacidades por centro de distribuição.
            </p>
          </div>
          <button 
            type="button" 
            onClick={() => void fetchCapacidades(true)} 
            disabled={refreshing || loading} 
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-500/10 hover:bg-slate-500/15 text-slate-700 dark:text-slate-200 px-3.5 text-xs font-semibold disabled:opacity-50 cursor-pointer transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> 
            <span>Atualizar dados</span>
          </button>
        </header>

        {/* SEÇÃO DE FILTROS SEM BORDAS */}
        <section className="rounded-2xl bg-white/70 dark:bg-slate-900/60 p-4 sm:p-5 shadow-xs backdrop-blur-md transition-colors">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                <Building2 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" /> Centro de distribuição
              </span>
              <select 
                className={selectClass} 
                value={filters.cd} 
                onChange={e => { 
                  const cd = e.target.value; 
                  setFilters(f => ({ ...f, cd, categoria: f.categoria === "all" || cd === "all" || (CATEGORIAS_POR_CD[cd] ?? []).includes(f.categoria) ? f.categoria : "all" })); 
                }}
              >
                <option value="all">Todos os CDs</option>
                {options.cds.map(cd => <option key={cd} value={cd}>CD {cd}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                <CalendarDays className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" /> Competência
              </span>
              <select 
                className={selectClass} 
                value={filters.mes} 
                onChange={e => setFilters(f => ({ ...f, mes: e.target.value }))}
              >
                <option value="all">Todos os meses</option>
                {options.meses.map(m => { 
                  const [y, mo] = m.split("-").map(Number); 
                  return <option key={m} value={m}>{new Date(y, mo - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</option>; 
                })}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                <Layers3 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" /> Categoria
              </span>
              <select 
                className={selectClass} 
                value={filters.categoria} 
                onChange={e => setFilters(f => ({ ...f, categoria: e.target.value }))}
              >
                <option value="all">Todas as categorias</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </label>
          </div>
        </section>

        {/* CONTAINER PRINCIPAL SEM BORDAS VINCULADAS */}
        <section className="rounded-2xl bg-white/70 dark:bg-slate-900/60 p-5 sm:p-6 shadow-xs backdrop-blur-md transition-colors space-y-6">
          
          {/* TAB BAR (SEGMENTED CONTROL MODERNO SEM BORDAS) & STATUS */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex p-1 rounded-xl bg-slate-500/10 dark:bg-slate-500/15" role="tablist" aria-label="Tipo de operação">
              {(["inbound", "outbound"] as const).map(tab => (
                <button 
                  key={tab} 
                  type="button" 
                  role="tab" 
                  aria-selected={activeTab === tab} 
                  onClick={() => onTabChange(tab)} 
                  className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    activeTab === tab 
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs" 
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  {tab === "inbound" ? <ArrowDownToLine className="h-3.5 w-3.5" /> : <ArrowUpFromLine className="h-3.5 w-3.5" />}
                  <span>{tab === "inbound" ? "Inbound" : "Outbound"}</span>
                </button>
              ))}
            </div>
            
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {number(filtered.length)} registros · {months.length} meses
            </span>
          </div>

          {/* GRID DE KPIs / MÉTRICAS LIMPAS SEM LINHAS DIVISÓRIAS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {(isInbound ? [
              { label: "Capacidade regular", value: summary.normal, icon: Package },
              { label: "Capacidade remunerada", value: summary.extra, icon: Truck },
              { label: "Capacidade total", value: summary.normal + summary.extra, icon: ArrowDownToLine },
              { label: "Dias / registros", value: filtered.length, icon: CalendarDays },
            ] : [
              { label: "Fracionado", value: summary.fracionado, icon: Package },
              { label: "Fechado", value: summary.fechado, icon: Truck },
              { label: "Capacidade total", value: summary.fracionado + summary.fechado, icon: ArrowUpFromLine },
              { label: "Dias / registros", value: filtered.length, icon: CalendarDays },
            ]).map(metric => (
              <div 
                key={metric.label} 
                className="p-4 rounded-xl bg-slate-500/[0.04] dark:bg-slate-500/[0.08] hover:bg-slate-500/[0.07] dark:hover:bg-slate-500/[0.12] transition-colors"
              >
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <metric.icon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                  <span>{metric.label}</span>
                </div>
                <div className="mt-2 font-mono text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
                  {number(metric.value)}
                </div>
              </div>
            ))}
          </div>

          {/* BANNER DE ERRO / AVISO */}
          {error && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
                {records.length > 0 ? " · Exibindo últimos dados carregados." : ""}
              </span>
              <button onClick={() => void fetchCapacidades()} className="font-semibold underline cursor-pointer hover:opacity-80">
                Tentar novamente
              </button>
            </div>
          )}

          {/* TABELA TOTALMENTE SEM BORDAS */}
          <div className="max-h-[620px] overflow-auto">
            {loading && records.length === 0 ? (
              <div className="py-20 text-center text-sm text-slate-500 dark:text-slate-400">
                Carregando capacidades...
              </div>
            ) : months.length === 0 ? (
              <div className="py-20 text-center text-sm text-slate-500 dark:text-slate-400">
                Nenhum registro encontrado para os filtros selecionados.
              </div>
            ) : (
              <table className="w-full min-w-[820px] text-left border-separate border-spacing-y-1">
                <thead className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
                  <tr>
                    <th className={`${th} text-left rounded-l-xl`}>Período / data</th>
                    <th className={`${th} text-left`}>CD</th>
                    <th className={`${th} text-left`}>Categoria</th>
                    {isInbound ? (
                      <th className={`${th} text-right`}>Capacidade inbound</th>
                    ) : (
                      <>
                        <th className={`${th} text-right`}>Fracionado</th>
                        <th className={`${th} text-right`}>Fechado</th>
                      </>
                    )}
                    <th className={`${th} w-20 text-center rounded-r-xl`}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map(month => (
                    <React.Fragment key={month.key}>
                      
                      {/* LINHA CONSOLIDADA DO MÊS (SEM BORDA, COM FUNDO SUAVE) */}
                      <tr 
                        onClick={() => setExpanded(prev => ({ ...prev, [month.key]: !prev[month.key] }))} 
                        aria-expanded={!!expanded[month.key]} 
                        className="cursor-pointer bg-slate-500/[0.05] dark:bg-slate-500/[0.10] hover:bg-slate-500/[0.10] dark:hover:bg-slate-500/[0.16] transition-colors"
                      >
                        <td className={`${td} font-semibold text-slate-900 dark:text-slate-100 rounded-l-xl`}>
                          <span className="flex items-center gap-2">
                            {expanded[month.key] ? (
                              <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                            )}
                            <span>{month.title}</span>
                            <span className="ml-1 rounded-md bg-slate-500/10 dark:bg-slate-500/20 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                              {month.items.length}
                            </span>
                          </span>
                        </td>
                        <td className={`${td} font-medium text-slate-600 dark:text-slate-300`}>{month.cd}</td>
                        <td className={`${td} font-medium text-slate-600 dark:text-slate-300`}>{month.category}</td>
                        {isInbound ? (
                          <td className={`${td} text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100`}>
                            {number(month.inbound)}
                          </td>
                        ) : (
                          <>
                            <td className={`${td} text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100`}>
                              {number(month.frac)}
                            </td>
                            <td className={`${td} text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100`}>
                              {number(month.fech)}
                            </td>
                          </>
                        )}
                        <td className={`${td} text-center text-xs text-slate-400 dark:text-slate-500 rounded-r-xl`}>
                          Detalhar
                        </td>
                      </tr>

                      {/* DIAS EXPANDIDOS DO MÊS (SEM BORDAS, FLUTUAÇÃO LIMPA) */}
                      {expanded[month.key] && month.items.map(item => {
                        const extra = amount(item.recebimentoRemunerado);
                        return (
                          <tr 
                            key={item.id} 
                            className="hover:bg-slate-500/[0.04] dark:hover:bg-slate-500/[0.08] transition-colors"
                          >
                            <td className={`${td} pl-10 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400 rounded-l-xl`}>
                              {dateLabel(item.dataMovimentacao)}
                            </td>
                            <td className={td}>
                              <span className="px-2 py-0.5 rounded-md font-mono text-xs bg-slate-500/10 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 font-medium">
                                {item.cd}
                              </span>
                            </td>
                            <td className={`${td} text-slate-600 dark:text-slate-300`}>
                              {item.categoria}
                            </td>
                            {isInbound ? (
                              <td className={`${td} text-right font-mono tabular-nums text-slate-900 dark:text-slate-100`}>
                                <div className="font-medium">{number(amount(item.capacidadeInbound) + extra)}</div>
                                {extra > 0 && (
                                  <div 
                                    className="mt-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400" 
                                    title={`Regular: ${number(item.capacidadeInbound)} | Remunerada: ${number(extra)}`}
                                  >
                                    +{number(extra)} remunerada
                                  </div>
                                )}
                              </td>
                            ) : (
                              <>
                                <td className={`${td} text-right font-mono tabular-nums text-slate-900 dark:text-slate-100`}>
                                  {number(item.capacidadeOutboundFracionado)}
                                </td>
                                <td className={`${td} text-right font-mono tabular-nums text-slate-900 dark:text-slate-100`}>
                                  {number(item.capacidadeOutboundFechado)}
                                </td>
                              </>
                            )}
                            <td className={`${td} text-center rounded-r-xl`}>
                              <button 
                                type="button" 
                                title={user?.role === "admin" ? "Editar capacidade" : "Somente administradores podem editar"} 
                                aria-label={`Editar ${dateLabel(item.dataMovimentacao)} CD ${item.cd}`} 
                                disabled={user?.role !== "admin" || saving} 
                                onClick={() => openEdit(item)} 
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-500/10 dark:hover:bg-slate-500/20 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* RODAPÉ LIMPO E CONSOLIDADO */}
          <footer className="flex flex-wrap items-center justify-between gap-2 pt-3 text-xs text-slate-500 dark:text-slate-400">
            <span>Valores consolidados conforme os filtros aplicados.</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Total {isInbound ? "inbound" : "outbound"}: 
              <strong className="ml-1.5 font-mono text-sm text-slate-900 dark:text-slate-100 font-bold">
                {number(isInbound ? summary.normal + summary.extra : summary.fracionado + summary.fechado)}
              </strong>
            </span>
          </footer>
        </section>
      </div>

      {/* MODAL DE EDIÇÃO */}
      <EditCapacityModal 
        isOpen={editing} 
        onClose={() => { if (!saving) { setEditing(false); setEditTarget(undefined); } }} 
        onSave={save} 
        editMode={activeTab} 
        targetDay={editTarget} 
      />
    </div>
  );
}
