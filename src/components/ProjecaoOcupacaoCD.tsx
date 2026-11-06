import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Lock, RotateCcw, Save, Trash2, Plus, X } from "lucide-react";
import { apiFetch } from "../services/api";

// ---------------------------------------------------------------------------
// Projeção de Ocupação do CD (S&OP) — API /api/sop do backend gestao-ppcp.
// Regras (definidas pelo planejamento):
//  · dia com foto de ocupação = realizado: a tabela mostra só o real; o gráfico mostra real e projetado;
//  · hoje mostra a projeção (o realizado de hoje é lançado amanhã, em Administração > Lançar realizado);
//  · nada que já aconteceu pode ser alterado: planejado só de amanhã em diante, realizado uma única vez;
//  · na simulação a tabela é só leitura; a simulação é ajustada pelos parâmetros, variações e posições.
// ---------------------------------------------------------------------------

interface ProjecaoOcupacaoCDProps {
  theme?: "light" | "dark";
  showNotification?: (msg: string) => void;
  onPageChange?: (page: string) => void;
}

type Tipo = "REALIZADO" | "PROJETADO" | "SEM_DADOS";

interface FluxoDia {
  fluxo: string;
  nome: string;
  demandaInbound: number | null;
  remunerada: number | null;
  backlog: number | null;
  palletsIn: number | null;
  demandaFracionada: number | null;
  demandaFechada: number | null;
  palletsOut: number | null;
  ajustados: string[];
}

interface Dia {
  data: string;
  tipo: Tipo;
  veiculos: number | null;
  demandaInbound: number | null;
  remunerada: number | null;
  backlog: number | null;
  palletsIn: number | null;
  caixasFracionadas: number | null;
  caixasFechadas: number | null;
  palletsOut: number | null;
  capacidade: number | null;
  bloqueado: number | null;
  ocupacao: number | null;
  ocupacaoReal: number | null;
  ocupacaoProjetada: number | null;
  percentual: number | null;
  percentualReal: number | null;
  percentualProjetado: number | null;
  realizadoLancado: boolean;
  fluxos: FluxoDia[];
  planejado: {
    veiculos: number | null;
    palletsIn: number | null;
    caixasFracionadas: number | null;
    caixasFechadas: number | null;
  } | null;
  realizado: { veiculos: number | null; pallets: number | null; caixasFracionadas: number | null; caixasFechadas: number | null } | null;
}

interface Resumo {
  capacidade: number | null;
  bloqueado: number | null;
  ocupacaoAtual: number | null;
  dataOcupacaoAtual: string | null;
  percentualAtual: number | null;
  ocupacaoFinal: number | null;
  dataFinal: string | null;
  percentualFinal: number | null;
  picoProjetado: { data: string; percentual: number } | null;
}

interface Projecao {
  categoria: string;
  nomeCategoria: string;
  hoje: string;
  ultimaDataRealizada: string | null;
  resumo: Resumo;
  dias: Dia[];
  avisos: string[];
}

interface Comparativo {
  resumo: {
    ocupacaoFinalBase: number | null;
    ocupacaoFinalSimulada: number | null;
    percentualFinalBase: number | null;
    percentualFinalSimulado: number | null;
    picoBase: { percentual: number } | null;
    picoSimulado: { percentual: number } | null;
    diasCriticosBase: number;
    diasCriticosSimulado: number;
  };
  base: Projecao;
  simulada: Projecao;
}

interface Categoria {
  codigo: string;
  nome: string;
  fluxos: { codigo: string; nome: string }[];
}

interface ParametroFluxo {
  fluxo: string;
  nome: string;
  percentualRecebimento: number;
  palletsPorVeiculo: number;
  percentualExpedicao: number;
  caixasPalletFracionado: number;
  caixasPalletFechado: number;
}

interface SimulacaoResumo {
  id: number;
  nome: string;
}

interface Variacao {
  campo: string;
  inicio: string;
  fim: string;
  percentual: number;
}

interface Extra {
  categoria: string;
  aPartirDe: string;
  posicoes: number;
}

interface SimulacaoDetalhe {
  id: number;
  nome: string;
  descricao: string | null;
  definicao: {
    parametrosGerais?: unknown;
    parametrosFluxo?: Record<string, Record<string, number | null>>;
    ajustesFluxo?: unknown[];
    ajustesCapacidade?: unknown[];
    variacoes?: Variacao[];
    capacidadeExtra?: Extra[];
  };
}

type Pendente = Record<string, number | null | string>;

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const WD = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const CAMPO_FLUXO: Record<string, string> = {
  veic: "demandaInbound",
  remun: "remunerada",
  backlog: "backlog",
  frac: "demandaFracionada",
  fech: "demandaFechada",
};
const PAR_CAMPOS = ["percentualRecebimento", "palletsPorVeiculo", "percentualExpedicao", "caixasPalletFracionado", "caixasPalletFechado"] as const;
const PCT_CAMPOS = new Set<string>(["percentualRecebimento", "percentualExpedicao"]);

const COLS: { k: string; t: string; ed?: boolean }[] = [
  { k: "veic", t: "Veículos (agenda / real)", ed: true },
  { k: "remun", t: "Remunerado (veíc.)", ed: true },
  { k: "backlog", t: "Backlog (veíc.)", ed: true },
  { k: "pin", t: "Pallets recebidos" },
  { k: "frac", t: "Caixas fracionadas", ed: true },
  { k: "fech", t: "Caixas fechadas", ed: true },
  { k: "pout", t: "Pallets expedidos" },
  { k: "cap", t: "Capacidade útil" },
  { k: "bloq", t: "Bloqueado" },
  { k: "real", t: "Qtd ocupada real" },
  { k: "proj", t: "Qtd ocupada projetada" },
  { k: "pct", t: "% ocupação" },
];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addD = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dm = (s?: string | null) => (s ? `${s.slice(8)}/${s.slice(5, 7)}` : "—");
const nf = (n: number | null | undefined) => (n == null || isNaN(n) ? "—" : Math.round(n).toLocaleString("pt-BR"));
const pf = (n: number | null | undefined) =>
  n == null || isNaN(n) ? "—" : `${(n * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const num = (v: string): number | null => (v.trim() === "" ? null : Math.max(0, Number(v.replace(",", "."))));
const corPct = (p: number | null | undefined) => (p == null ? "#94a3b8" : p >= 0.95 ? "#dc2626" : p >= 0.9 ? "#d97706" : "#16a34a");

async function chamar<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await apiFetch(`/api/sop${path}`, init);
  if (r.status === 403) throw new Error("Sem permissão: faça login para salvar.");
  if (!r.ok) {
    let msg = `${r.status} ${r.statusText}`;
    try {
      const j = await r.json();
      msg = j.detail || j.title || msg;
    } catch {
      /* corpo vazio */
    }
    throw new Error(msg);
  }
  return (r.status === 204 ? null : await r.json()) as T;
}

export default function ProjecaoOcupacaoCD({ theme = "dark", showNotification }: ProjecaoOcupacaoCDProps) {
  const isDark = theme === "dark";
  const hojeLocal = iso(new Date());

  const [visao, setVisao] = useState<"semana" | "mes">("semana");
  const [mes, setMes] = useState(hojeLocal.slice(0, 7));
  const [cat, setCat] = useState("COMPLEMENTAR");
  const [sim, setSim] = useState("");
  const [fluxo, setFluxo] = useState("TOTAL");

  const [cats, setCats] = useState<Categoria[]>([]);
  const [params, setParams] = useState<ParametroFluxo[]>([]);
  const [sims, setSims] = useState<SimulacaoResumo[]>([]);
  const [proj, setProj] = useState<Projecao | null>(null);
  const [comp, setComp] = useState<Comparativo | null>(null);
  const [simDef, setSimDef] = useState<SimulacaoDetalhe | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [recarregar, setRecarregar] = useState(0);

  const [pendFluxo, setPendFluxo] = useState<Record<string, Pendente>>({});
  const [salvando, setSalvando] = useState(false);

  const hoje = proj?.hoje || hojeLocal;
  const amanha = iso(addD(parse(hoje), 1));
  const catInfo = cats.find((c) => c.codigo === cat);
  const fluxosCat = cat === "TODAS" || !catInfo ? [] : catInfo.fluxos.map((f) => f.codigo);
  const fluxoEdicao = fluxosCat.length === 1 ? fluxosCat[0] : fluxo !== "TOTAL" ? fluxo : null;

  const periodo = useMemo((): [string, string] => {
    if (visao === "semana") {
      const h = parse(hoje);
      const ini = addD(h, -((h.getDay() + 6) % 7));
      return [iso(ini), iso(addD(ini, 6))];
    }
    const [y, m] = mes.split("-").map(Number);
    return [iso(new Date(y, m - 1, 1)), iso(new Date(y, m, 0))];
  }, [visao, mes, hoje]);

  const notificar = useCallback((msg: string) => showNotification?.(msg), [showNotification]);

  // ------------------------------------------------------------- carga
  useEffect(() => {
    (async () => {
      try {
        const [c, p, s] = await Promise.all([
          chamar<Categoria[]>("/categorias"),
          chamar<{ fluxos: ParametroFluxo[] }>("/parametros"),
          chamar<SimulacaoResumo[]>("/simulacoes"),
        ]);
        setCats(c);
        setParams(p.fluxos);
        setSims(s);
      } catch (e: any) {
        setErro(e.message);
      }
    })();
  }, []);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setCarregando(true);
      setErro(null);
      const q = `categoria=${cat}&inicio=${periodo[0]}&fim=${periodo[1]}`;
      try {
        let p: Projecao;
        if (sim) {
          const [c, d] = await Promise.all([
            chamar<Comparativo>(`/simulacoes/${sim}/projecao?${q}`),
            chamar<SimulacaoDetalhe>(`/simulacoes/${sim}`),
          ]);
          if (cancelado) return;
          setComp(c);
          setSimDef(d);
          p = c.simulada;
        } else {
          p = await chamar<Projecao>(`/projecao?${q}`);
          if (cancelado) return;
          setComp(null);
          setSimDef(null);
        }
        setProj(p);
      } catch (e: any) {
        if (!cancelado) setErro(e.message);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [cat, sim, periodo, recarregar]);

  const temPendente = Object.keys(pendFluxo).length > 0;
  const trocar = (acao: () => void) => {
    if (temPendente && !window.confirm("Há alterações não salvas. Descartar?")) return;
    setPendFluxo({});
    acao();
  };

  // ------------------------------------------------------------- valores da tabela
  const valores = (d: Dia) => {
    const realPassado = d.tipo === "REALIZADO" && d.data !== hoje;
    if (realPassado) {
      return {
        veic: d.veiculos, remun: null, backlog: null, pin: d.palletsIn, frac: d.caixasFracionadas, fech: d.caixasFechadas,
        pout: d.palletsOut, cap: d.capacidade, bloq: d.bloqueado, real: d.ocupacaoReal, proj: null, pct: d.percentual,
        aj: [] as string[],
      };
    }
    const f = fluxoEdicao ? d.fluxos.find((x) => x.fluxo === fluxoEdicao) : undefined;
    const src = f
      ? { veic: f.demandaInbound, remun: f.remunerada, backlog: f.backlog, pin: f.palletsIn, frac: f.demandaFracionada,
          fech: f.demandaFechada, pout: f.palletsOut, aj: f.ajustados || [] }
      : { veic: d.demandaInbound, remun: d.remunerada, backlog: d.backlog, pin: d.palletsIn, frac: d.caixasFracionadas,
          fech: d.caixasFechadas, pout: d.palletsOut, aj: Array.from(new Set(d.fluxos.flatMap((x) => x.ajustados || []))) };
    if (d.tipo === "REALIZADO" && !f) {
      // hoje: planejado do dia (o realizado entra amanhã)
      Object.assign(src, {
        veic: d.planejado?.veiculos ?? null, pin: d.planejado?.palletsIn ?? null,
        frac: d.planejado?.caixasFracionadas ?? null, fech: d.planejado?.caixasFechadas ?? null,
      });
    }
    return { ...src, cap: d.capacidade, bloq: d.bloqueado, real: d.ocupacaoReal, proj: d.ocupacaoProjetada, pct: d.percentualProjetado };
  };

  const editavel = (d: Dia, ed?: boolean) =>
    !!ed && !sim && cat !== "TODAS" && d.tipo !== "REALIZADO" && d.data > hoje && !!fluxoEdicao;

  const editarFluxo = (d: Dia, campo: string, valor: number | null) => {
    if (!fluxoEdicao) return;
    const chave = `${fluxoEdicao}|${d.data}`;
    setPendFluxo((p) => {
      let atual = p[chave];
      if (!atual) {
        const f = d.fluxos.find((x) => x.fluxo === fluxoEdicao);
        atual = { fluxo: fluxoEdicao, data: d.data };
        for (const k of Object.values(CAMPO_FLUXO)) atual[k] = f && (f.ajustados || []).includes(k) ? (f as any)[k] : null;
      }
      return { ...p, [chave]: { ...atual, [campo]: valor } };
    });
  };

  const salvarPlanejado = async () => {
    setSalvando(true);
    try {
      await chamar("/lancamentos/fluxos", { method: "PUT", body: JSON.stringify(Object.values(pendFluxo)) });
      setPendFluxo({});
      notificar("✅ Planejado salvo");
      setRecarregar((n) => n + 1);
    } catch (e: any) {
      setErro(e.message);
      notificar(`❌ ${e.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const desfazer = async () => {
    if (!fluxoEdicao || !proj) return;
    const dias = proj.dias.filter((d) => d.tipo !== "REALIZADO" && d.data > hoje);
    if (!dias.length) return;
    if (!window.confirm(`Remover os ajustes planejados de ${fluxoEdicao} entre ${dm(dias[0].data)} e ${dm(dias[dias.length - 1].data)}?`)) return;
    try {
      await chamar("/lancamentos/fluxos", { method: "PUT", body: JSON.stringify(dias.map((d) => ({ fluxo: fluxoEdicao, data: d.data }))) });
      setPendFluxo({});
      setRecarregar((n) => n + 1);
    } catch (e: any) {
      setErro(e.message);
    }
  };

  // ------------------------------------------------------------- simulação
  const novaSimulacao = async () => {
    const nome = window.prompt("Nome da simulação:", `Simulação ${new Date().toLocaleDateString("pt-BR")}`);
    if (!nome) return;
    try {
      const s = await chamar<SimulacaoResumo>("/simulacoes", { method: "POST", body: JSON.stringify({ nome, definicao: {} }) });
      setSims(await chamar<SimulacaoResumo[]>("/simulacoes"));
      setSim(String(s.id));
    } catch (e: any) {
      setErro(e.message);
    }
  };

  // ------------------------------------------------------------- estilos
  const painel = `rounded-2xl border shadow-xs ${isDark ? "bg-slate-900/60 border-slate-800/80" : "bg-white border-slate-200/90"}`;
  const campo = `h-9 px-3 rounded-lg border font-medium outline-hidden transition-colors ${
    isDark ? "bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700" : "bg-white border-slate-200 text-slate-800 hover:border-slate-300"
  }`;
  const rotulo = "text-[10px] uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-500";
  const inputCel = `w-full min-w-[78px] rounded-md border px-2 py-1 text-right tabular-nums outline-hidden ${
    isDark ? "bg-slate-950 border-amber-700/50 text-slate-100" : "bg-white border-amber-300 text-slate-900"
  }`;
  const btn = `inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer ${
    isDark ? "border-slate-700 hover:bg-slate-800" : "border-slate-200 hover:bg-slate-50"
  }`;
  const btnPrimario = `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer ${
    isDark ? "bg-slate-100 text-slate-900 hover:bg-white" : "bg-slate-900 text-white hover:bg-slate-800"
  }`;

  const meses = useMemo(() => {
    const base = new Date(parse(hoje).getFullYear(), parse(hoje).getMonth() - 4, 1);
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
      return { v: iso(d).slice(0, 7), t: `${MESES[d.getMonth()][0].toUpperCase()}${MESES[d.getMonth()].slice(1)} ${d.getFullYear()}` };
    });
  }, [hoje]);

  const r = proj?.resumo;
  const ultimo = proj?.dias[proj.dias.length - 1];
  const dicas: string[] = [];
  if (cat === "TODAS") dicas.push('Com "Todas as categorias" a tabela mostra a soma e não é editável.');
  else if (sim) dicas.push("Simulação: a tabela mostra a projeção simulada, sem edição. Ajuste a simulação no painel abaixo.");
  else {
    if (fluxosCat.length > 1 && fluxo === "TOTAL") dicas.push("Para editar, escolha o fluxo (Limpeza ou Perfumaria).");
    dicas.push('O que já aconteceu não pode ser alterado: o planejado é editável de amanhã em diante. Hoje mostra a sua projeção; o realizado é lançado em Administração > Lançar realizado.');
  }
  dicas.push(...(proj?.avisos || []));

  return (
    <div
      className={`w-full min-h-full transition-colors duration-200 ${
        isDark ? "bg-[#070b14] text-slate-100" : "bg-[#f8fafc] text-slate-900"
      } p-4 md:p-6 lg:p-8 flex flex-col gap-6`}
    >
      {/* CABEÇALHO E FILTROS */}
      <header className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5 border-b pb-5 border-slate-200/80 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Projeção de Ocupação do CD</h1>
            {sim && (
              <span className="rounded-sm border border-violet-500 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-violet-500">
                simulação
              </span>
            )}
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {visao === "semana" ? "Semana atual" : `Mês de ${MESES[parse(periodo[0]).getMonth()]}`} · {dm(periodo[0])} a {dm(periodo[1])} · CD 1965
            {proj ? ` · ${proj.nomeCategoria} · realizado até ${dm(proj.ultimaDataRealizada)}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2.5 sm:gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <span className={rotulo}>Visão</span>
            <div className={`inline-flex rounded-lg p-0.5 border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
              {(["semana", "mes"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => trocar(() => setVisao(v))}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                    visao === v
                      ? isDark ? "bg-slate-800 text-slate-50 font-semibold" : "bg-slate-900 text-white font-semibold"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {v === "semana" ? "Semana atual" : "Mês"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="sop-mes" className={rotulo}>Mês</label>
            <select id="sop-mes" disabled={visao === "semana"} value={mes} onChange={(e) => trocar(() => setMes(e.target.value))}
              className={`${campo} ${visao === "semana" ? "opacity-45 cursor-not-allowed" : "cursor-pointer"}`}>
              {meses.map((m) => <option key={m.v} value={m.v}>{m.t}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="sop-cd" className={rotulo}>CD</label>
            <select id="sop-cd" disabled className={`${campo} opacity-80`}><option>1965</option></select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="sop-cat" className={rotulo}>Categoria</label>
            <select id="sop-cat" value={cat} onChange={(e) => { const v = e.target.value; trocar(() => { setCat(v); setFluxo("TOTAL"); }); }} className={`${campo} cursor-pointer`}>
              <option value="TODAS">Todas as categorias</option>
              {cats.map((c) => <option key={c.codigo} value={c.codigo}>{c.nome}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="sop-sim" className={rotulo}>Cenário</label>
            <select id="sop-sim" value={sim}
              onChange={(e) => {
                const v = e.target.value;
                trocar(() => (v === "__nova" ? void novaSimulacao() : setSim(v)));
              }}
              className={`${campo} cursor-pointer`}>
              <option value="">Base oficial</option>
              {sims.map((s) => <option key={s.id} value={String(s.id)}>Simulação: {s.nome}</option>)}
              <option value="__nova">+ Nova simulação…</option>
            </select>
          </div>
        </div>
      </header>

      {erro && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-start justify-between gap-3">
          <span>Erro: {erro}</span>
          <button type="button" onClick={() => setErro(null)} aria-label="Fechar" className="cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* INDICADORES */}
      <section aria-label="Resumo" className={`grid shrink-0 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 overflow-hidden ${painel}`}>
        <Kpi titulo="Qtd capacidade" valor={nf(r?.capacidade)} nota={r ? `útil (− ${nf(r.bloqueado)} bloqueadas) em ${dm(r.dataFinal)}` : ""} />
        <Kpi titulo="Qtd ocupada" valor={nf(r?.ocupacaoAtual)} nota={r?.dataOcupacaoAtual ? `realizado em ${dm(r.dataOcupacaoAtual)}` : "sem realizado"} />
        <Kpi titulo="Qtd projetada" valor={nf(r?.ocupacaoFinal)}
          nota={r ? `${ultimo?.tipo === "REALIZADO" ? "realizado em" : sim ? "simulado para" : "projetado para"} ${dm(r.dataFinal)}` : ""} />
        <Kpi titulo="% ocupação atual" valor={pf(r?.percentualAtual)} cor={corPct(r?.percentualAtual)} barra={r?.percentualAtual} />
        <Kpi titulo="% ocupação projetada" valor={pf(r?.percentualFinal)} cor={corPct(r?.percentualFinal)} barra={r?.percentualFinal}
          nota={comp ? `base oficial: ${pf(comp.base.resumo.percentualFinal)}` : r?.picoProjetado ? `pico ${pf(r.picoProjetado.percentual)} em ${dm(r.picoProjetado.data)}` : ""} />
      </section>

      {/* GRÁFICO */}
      <section className={`${painel} p-4 sm:p-5`}>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold">Ocupação dia a dia</h2>
          <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
            <Legenda cor={isDark ? "#60a5fa" : "#2563eb"} texto="Realizada (%)" />
            <Legenda cor={isDark ? "#f59e0b" : "#d97706"} texto={sim ? "Simulada (%)" : "Projetada (%)"} />
            {sim && <Legenda cor="#94a3b8" texto="Base oficial (%)" tracejada />}
          </div>
        </div>
        {proj && proj.dias.length > 0 ? (
          <Grafico dias={proj.dias} base={comp?.base.dias} hoje={hoje} isDark={isDark} simulacao={!!sim} />
        ) : (
          <p className="py-10 text-center text-sm text-slate-500">{carregando ? "Carregando…" : "Sem dados no período."}</p>
        )}
      </section>

      {/* SEQUÊNCIA DIÁRIA */}
      <section className={`${painel} p-4 sm:p-5`}>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold">Sequência diária</h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">Pallets, exceto veículos e caixas · dias realizados mostram só o real</span>
        </div>

        {fluxosCat.length > 1 && catInfo && (
          <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
            <span className={rotulo}>Fluxo</span>
            <div className={`inline-flex rounded-lg p-0.5 border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
              {[{ codigo: "TOTAL", nome: `Total ${catInfo.nome}` }, ...catInfo.fluxos].map((f) => (
                <button key={f.codigo} type="button" onClick={() => setFluxo(f.codigo)}
                  className={`px-3 py-1.5 rounded-md font-medium cursor-pointer ${
                    fluxo === f.codigo ? (isDark ? "bg-slate-800 text-white font-semibold" : "bg-slate-900 text-white font-semibold") : "text-slate-500"
                  }`}>
                  {f.nome}
                </button>
              ))}
            </div>
            <span className="text-slate-500">Veículos, caixas e pallets do fluxo escolhido; capacidade e ocupação da categoria.</span>
          </div>
        )}

        {dicas.length > 0 && (
          <div className={`mb-3 rounded-lg border px-3 py-2 text-xs ${isDark ? "border-amber-700/40 bg-amber-950/30 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
            {dicas.join(" · ")}
          </div>
        )}

        <div className={`overflow-x-auto rounded-lg border ${isDark ? "border-slate-800" : "border-slate-200"}`}>
          <table className="w-full min-w-[1180px] text-xs tabular-nums">
            <thead>
              <tr className={isDark ? "bg-slate-900" : "bg-slate-50"}>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Data</th>
                {COLS.map((c) => (
                  <th key={c.k}
                    className={`px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider ${
                      c.ed && cat !== "TODAS" && !sim ? (isDark ? "bg-amber-950/30 text-amber-200" : "bg-amber-50 text-amber-900") : "text-slate-500"
                    }`}>
                    {c.t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proj?.dias.map((d) => {
                const v: any = valores(d);
                const ehHoje = d.data === hoje;
                const realPassado = d.tipo === "REALIZADO" && !ehHoje;
                return (
                  <tr key={d.data}
                    className={`border-t ${isDark ? "border-slate-800/70" : "border-slate-100"} ${
                      ehHoje ? (isDark ? "bg-sky-950/40" : "bg-sky-50") : d.data < hoje ? (isDark ? "bg-slate-900/40" : "bg-slate-50/60") : ""
                    }`}>
                    <td className="px-3 py-1.5 text-left whitespace-nowrap">
                      <span className="mr-1.5 text-[11px] text-slate-500">{WD[parse(d.data).getDay()]}</span>
                      <span className={ehHoje ? "font-semibold" : ""}>{dm(d.data)}{ehHoje ? " · hoje" : ""}</span>
                      {realPassado && <span className="ml-1.5 text-[9px] font-semibold uppercase tracking-wider text-sky-500">real</span>}
                      {d.data < hoje && <Lock className="ml-1 inline h-3 w-3 text-slate-400" />}
                    </td>
                    {COLS.map((c) => {
                      if (editavel(d, c.ed)) {
                        const campoApi = CAMPO_FLUXO[c.k];
                        const pend = pendFluxo[`${fluxoEdicao}|${d.data}`];
                        const temPend = !!pend && campoApi in pend;
                        const val = temPend ? pend[campoApi] : v[c.k];
                        const ajustado = (v.aj as string[]).includes(campoApi);
                        return (
                          <td key={c.k} className={`px-1.5 py-1 ${isDark ? "bg-amber-950/20" : "bg-amber-50/60"}`}>
                            <input type="number" min={0} step="any" inputMode="decimal" aria-label={`${c.t} ${d.data}`}
                              value={val == null ? "" : String(Math.round(Number(val) * 100) / 100)}
                              onChange={(e) => editarFluxo(d, campoApi, num(e.target.value))}
                              className={`${inputCel} ${ajustado ? "font-semibold" : ""} ${temPend ? "ring-2 ring-amber-500/60" : ""}`} />
                          </td>
                        );
                      }
                      if (c.k === "pct") {
                        return (
                          <td key={c.k} className="px-3 py-1.5 text-right">
                            {v.pct == null ? "—" : (
                              <span className="inline-block min-w-[58px] rounded-full px-2 py-0.5 text-center font-semibold"
                                style={{ color: corPct(v.pct), backgroundColor: `${corPct(v.pct)}22` }}>
                                {pf(v.pct)}
                              </span>
                            )}
                          </td>
                        );
                      }
                      return (
                        <td key={c.k} className={`px-3 py-1.5 text-right ${realPassado && ["remun", "backlog", "proj"].includes(c.k) ? "text-slate-400" : ""}`}>
                          {nf(v[c.k])}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!sim && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span>Veículos = agenda útil × % recebimento (+ remunerado + backlog) · ocupação = dia anterior (real, se houver) + recebidos − expedidos. Campo vazio volta ao calculado.</span>
            <div className="flex items-center gap-2">
              {Object.keys(pendFluxo).length > 0 && <span className="font-semibold text-amber-600">Alterações não salvas</span>}
              <button type="button" className={btn} onClick={desfazer} disabled={cat === "TODAS" || !fluxoEdicao}>
                <RotateCcw className="h-3.5 w-3.5" /> Desfazer ajustes desta visão
              </button>
              <button type="button" className={btnPrimario} onClick={salvarPlanejado} disabled={!Object.keys(pendFluxo).length || salvando}>
                <Save className="h-3.5 w-3.5" /> Salvar
              </button>
            </div>
          </div>
        )}
      </section>

      {/* SIMULAÇÃO */}
      {sim && simDef && comp && (
        <PainelSimulacao
          key={simDef.id}
          isDark={isDark}
          painel={painel}
          campo={campo}
          btn={btn}
          btnPrimario={btnPrimario}
          simDef={simDef}
          comp={comp}
          params={cat === "TODAS" ? params : params.filter((p) => fluxosCat.includes(p.fluxo))}
          cats={cats}
          categoriaAtual={cat}
          amanha={amanha}
          periodo={periodo}
          onSalvo={async () => {
            setSims(await chamar<SimulacaoResumo[]>("/simulacoes"));
            setRecarregar((n) => n + 1);
            notificar("✅ Simulação salva");
          }}
          onExcluido={async () => {
            setSims(await chamar<SimulacaoResumo[]>("/simulacoes"));
            setSim("");
          }}
          onErro={(m) => setErro(m)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componentes auxiliares
// ---------------------------------------------------------------------------
function Kpi({ titulo, valor, nota, cor, barra }: { titulo: string; valor: string; nota?: string; cor?: string; barra?: number | null }) {
  return (
    <div className="p-4 sm:p-5 flex flex-col justify-between">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{titulo}</span>
      <div className="mt-2">
        <div className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums" style={cor ? { color: cor } : undefined}>{valor}</div>
        {barra !== undefined && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (barra || 0) * 100)}%`, backgroundColor: cor }} />
          </div>
        )}
        {nota && <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{nota}</div>}
      </div>
    </div>
  );
}

function Legenda({ cor, texto, tracejada }: { cor: string; texto: string; tracejada?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="18" height="4" aria-hidden="true">
        <line x1="0" y1="2" x2="18" y2="2" stroke={cor} strokeWidth="3" strokeDasharray={tracejada ? "5 3" : undefined} />
      </svg>
      {texto}
    </span>
  );
}

/** Projetada em todos os dias (nos realizados é o que estava projetado); realizada onde há foto; base tracejada na simulação. */
function Grafico({ dias, base, hoje, isDark, simulacao }: { dias: Dia[]; base?: Dia[]; hoje: string; isDark: boolean; simulacao: boolean }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(900);
  const [dica, setDica] = useState<{ i: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLargura(el.clientWidth || 900));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const corReal = isDark ? "#60a5fa" : "#2563eb";
  const corProj = isDark ? "#f59e0b" : "#d97706";
  const real = dias.map((d) => (d.tipo === "REALIZADO" ? d.percentualReal : null));
  const proj = dias.map((d) => d.percentualProjetado);
  const linhaBase = base ? base.map((d) => (d.data >= hoje ? d.percentualProjetado : null)) : null;
  const n = dias.length;
  const W = Math.max(n > 16 ? 1000 : 320, largura);
  const H = largura < 560 ? 250 : 300;
  const m = { l: 44, r: 18, t: 14, b: 30 };
  const vals = [...real, ...proj, ...(linhaBase || [])].filter((v): v is number => v != null);
  if (!vals.length) return <p className="py-10 text-center text-sm text-slate-500">Sem dados de ocupação no período.</p>;
  const lo = Math.max(0, Math.floor((Math.min(...vals) * 100 - 6) / 5) * 5);
  const hi = Math.max(100, Math.ceil((Math.max(...vals) * 100) / 5) * 5);
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const x = (i: number) => m.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
  const y = (v: number) => m.t + ih - ((v * 100 - lo) / (hi - lo)) * ih;
  const caminho = (vs: (number | null)[]) => {
    let d = "";
    let ligado = false;
    vs.forEach((v, i) => {
      if (v == null) {
        ligado = false;
        return;
      }
      d += `${ligado ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      ligado = true;
    });
    return d;
  };
  const passo = hi - lo > 30 ? 10 : 5;
  const grades: number[] = [];
  for (let t = lo; t <= hi; t += passo) grades.push(t);
  const denso = n > 16;
  const fmt = (v: number) => `${(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: denso ? 0 : 1, maximumFractionDigits: denso ? 0 : 1 })}%`;
  const iHoje = dias.findIndex((d) => d.data === hoje);
  const largBarra = n > 1 ? iw / (n - 1) : iw;
  const texto = isDark ? "#94a3b8" : "#64748b";
  const grade = isDark ? "#1e293b" : "#e2e8f0";
  const fundo = isDark ? "#0f172a" : "#ffffff";

  return (
    <div ref={caixa} className="relative overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width={W > largura ? W : "100%"} role="img" aria-label="Ocupação realizada e projetada por dia">
        {grades.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t / 100)} y2={y(t / 100)} stroke={grade} />
            <text x={m.l - 8} y={y(t / 100) + 4} textAnchor="end" fontSize={11} fill={texto} fontFamily="ui-monospace,monospace">{t}%</text>
          </g>
        ))}
        {lo <= 95 && hi >= 95 && <line x1={m.l} x2={W - m.r} y1={y(0.95)} y2={y(0.95)} stroke="#dc2626" strokeDasharray="4 4" opacity={0.6} />}
        {dias.map((d, i) => (
          <text key={d.data} x={x(i)} y={H - 10} textAnchor="middle" fontSize={denso ? 10 : 11}
            fill={d.data === hoje ? (isDark ? "#f1f5f9" : "#0f172a") : texto} fontWeight={d.data === hoje ? 600 : 400}>
            {dm(d.data)}
          </text>
        ))}
        {iHoje >= 0 && (
          <g>
            <line x1={x(iHoje)} x2={x(iHoje)} y1={m.t} y2={m.t + ih} stroke={texto} strokeDasharray="2 3" />
            <text x={x(iHoje) + 4} y={m.t + 10} fontSize={10} fill={texto} fontFamily="ui-monospace,monospace">HOJE</text>
          </g>
        )}
        {linhaBase && <path d={caminho(linhaBase)} fill="none" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 4" />}
        <path d={caminho(proj)} fill="none" stroke={corProj} strokeWidth={2.25} strokeLinejoin="round" />
        <path d={caminho(real)} fill="none" stroke={corReal} strokeWidth={2.25} strokeLinejoin="round" />
        {dias.map((d, i) => {
          const temReal = real[i] != null;
          const temProj = proj[i] != null;
          const projAcima = !temReal || (temProj && (proj[i] as number) >= (real[i] as number));
          const ancora = i === 0 ? "start" : i === n - 1 ? "end" : "middle";
          const rotulo = (v: number, acima: boolean, cor: string) => (
            <g>
              <circle cx={x(i)} cy={y(v)} r={denso ? 2.4 : 3.4} fill={cor} />
              <text x={x(i)} y={y(v) + (acima ? -8 : 16)} textAnchor={ancora} fontSize={denso ? 10 : 11} fontWeight={600}
                fill={cor} stroke={fundo} strokeWidth={3} paintOrder="stroke">{fmt(v)}</text>
            </g>
          );
          return (
            <g key={d.data}>
              {temProj && rotulo(proj[i] as number, projAcima, corProj)}
              {temReal && rotulo(real[i] as number, !projAcima || !temProj, corReal)}
            </g>
          );
        })}
        {dias.map((d, i) => (
          <rect key={d.data} x={x(i) - largBarra / 2} y={m.t} width={largBarra} height={ih} fill="transparent"
            onMouseEnter={() => setDica({ i, x: x(i), y: y(Math.max(real[i] ?? 0, proj[i] ?? 0, linhaBase?.[i] ?? 0) || lo / 100) })}
            onMouseLeave={() => setDica(null)} />
        ))}
      </svg>
      {dica && (() => {
        const d = dias[dica.i];
        const partes = [dm(d.data)];
        if (proj[dica.i] != null) partes.push(`${simulacao && d.data > hoje ? "simulada" : "proj."} ${pf(proj[dica.i])} (${nf(d.ocupacaoProjetada)})`);
        if (real[dica.i] != null) partes.push(`real ${pf(real[dica.i])} (${nf(d.ocupacaoReal)})`);
        if (linhaBase?.[dica.i] != null && d.data > hoje) partes.push(`base ${pf(linhaBase[dica.i])}`);
        const escala = (caixa.current?.querySelector("svg")?.getBoundingClientRect().width || W) / W;
        return (
          <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
            style={{ left: dica.x * escala, top: Math.max(dica.y * escala - 12, 28) }}>
            {partes.join("  ·  ")}
          </div>
        );
      })()}
    </div>
  );
}

interface PainelSimulacaoProps {
  isDark: boolean;
  painel: string;
  campo: string;
  btn: string;
  btnPrimario: string;
  simDef: SimulacaoDetalhe;
  comp: Comparativo;
  params: ParametroFluxo[];
  cats: Categoria[];
  categoriaAtual: string;
  amanha: string;
  periodo: [string, string];
  onSalvo: () => void;
  onExcluido: () => void;
  onErro: (msg: string) => void;
}

/** Ajustes da simulação: parâmetros por fluxo, variação % de agenda/caixas e posições extras (de amanhã em diante). */
function PainelSimulacao(p: PainelSimulacaoProps) {
  const def = p.simDef.definicao;
  const [nome, setNome] = useState(p.simDef.nome);
  const [descricao, setDescricao] = useState(p.simDef.descricao || "");
  const [pars, setPars] = useState<Record<string, Record<string, string>>>(() => {
    const o: Record<string, Record<string, string>> = {};
    for (const [f, aj] of Object.entries(def.parametrosFluxo || {})) {
      o[f] = {};
      for (const c of PAR_CAMPOS) {
        const v = aj?.[c];
        o[f][c] = v == null ? "" : String(PCT_CAMPOS.has(c) ? Math.round(v * 10000) / 100 : v);
      }
    }
    return o;
  });
  const inicioPadrao = p.periodo[0] > p.amanha ? p.periodo[0] : p.amanha;
  const [variacoes, setVariacoes] = useState<Variacao[]>(def.variacoes || []);
  const [extras, setExtras] = useState<Extra[]>(def.capacidadeExtra || []);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    setSalvando(true);
    try {
      const parametrosFluxo: Record<string, Record<string, number | null>> = { ...(def.parametrosFluxo || {}) };
      for (const [f, campos] of Object.entries(pars)) {
        const aj: Record<string, number | null> = {};
        for (const c of PAR_CAMPOS) {
          const s = (campos[c] ?? "").trim();
          aj[c] = s === "" ? null : PCT_CAMPOS.has(c) ? Number(s.replace(",", ".")) / 100 : Number(s.replace(",", "."));
        }
        if (Object.values(aj).some((v) => v != null)) parametrosFluxo[f] = aj;
        else delete parametrosFluxo[f];
      }
      const definicao = { ...def, parametrosFluxo, variacoes, capacidadeExtra: extras };
      await chamar(`/simulacoes/${p.simDef.id}`, {
        method: "PUT",
        body: JSON.stringify({ nome: nome.trim() || p.simDef.nome, descricao, definicao }),
      });
      p.onSalvo();
    } catch (e: any) {
      p.onErro(e.message);
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async () => {
    if (!window.confirm(`Excluir a simulação "${p.simDef.nome}"? Não dá para desfazer.`)) return;
    try {
      await chamar(`/simulacoes/${p.simDef.id}`, { method: "DELETE" });
      p.onExcluido();
    } catch (e: any) {
      p.onErro(e.message);
    }
  };

  const r = p.comp.resumo;
  const cartao = (titulo: string, base: number | null | undefined, simulado: number | null | undefined, fmt: (v: number | null | undefined) => string, pct: boolean) => {
    const delta = base != null && simulado != null ? simulado - base : null;
    return (
      <div className={`rounded-lg border px-3 py-2 ${p.isDark ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-white"}`}>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{titulo}</span>
        <div className="text-xl font-semibold tabular-nums">{fmt(simulado)}</div>
        <span className="text-[11px] text-slate-500">
          base {fmt(base)}
          {delta ? (
            <span className={delta > 0 ? "text-red-500" : "text-green-600"}>
              {" "}({delta > 0 ? "+" : ""}{pct ? `${(delta * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p.` : nf(delta)})
            </span>
          ) : null}
        </span>
      </div>
    );
  };
  const celInput = `w-full min-w-[70px] rounded-md border px-2 py-1 text-xs outline-hidden ${
    p.isDark ? "bg-slate-950 border-slate-700 text-slate-100" : "bg-white border-slate-200"
  }`;

  return (
    <section className={`${p.painel} p-4 sm:p-5 border-violet-500/60`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Simulação</h2>
        <div className="flex gap-2">
          <button type="button" className={`${p.btn} text-red-500`} onClick={excluir}><Trash2 className="h-3.5 w-3.5" /> Excluir</button>
          <button type="button" className={p.btnPrimario} onClick={salvar} disabled={salvando}><Save className="h-3.5 w-3.5" /> Salvar simulação</button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Nome</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} className={p.campo} />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Descrição</span>
          <input value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={1000} className={p.campo} />
        </label>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cartao("% fim do período", r.percentualFinalBase, r.percentualFinalSimulado, pf, true)}
        {cartao("Ocupação fim do período", r.ocupacaoFinalBase, r.ocupacaoFinalSimulada, nf, false)}
        {cartao("Pico projetado", r.picoBase?.percentual, r.picoSimulado?.percentual, pf, true)}
        {cartao("Dias críticos (≥95%)", r.diasCriticosBase, r.diasCriticosSimulado, (v) => (v == null ? "—" : String(v)), false)}
      </div>
      <p className="mt-2 text-xs text-slate-500">A simulação vale de amanhã em diante e não muda a base oficial nem o que já aconteceu.</p>

      <h3 className="mt-5 mb-2 text-sm font-semibold">Parâmetros por fluxo <span className="font-normal text-slate-500">(vazio = valor oficial)</span></h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-500">
              {["Fluxo", "% recebimento", "Pallets / veículo", "% expedição", "Cx/pallet fracionado", "Cx/pallet fechado"].map((t) => (
                <th key={t} className="px-2 py-1.5 text-left font-semibold">{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {p.params.map((pf_) => (
              <tr key={pf_.fluxo}>
                <td className="px-2 py-1">{pf_.nome}</td>
                {PAR_CAMPOS.map((c) => (
                  <td key={c} className="px-2 py-1">
                    <input type="number" step="any" className={celInput}
                      placeholder={PCT_CAMPOS.has(c) ? (pf_[c] * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : String(pf_[c])}
                      value={pars[pf_.fluxo]?.[c] ?? ""}
                      onChange={(e) => setPars((o) => ({ ...o, [pf_.fluxo]: { ...(o[pf_.fluxo] || {}), [c]: e.target.value } }))} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-5 mb-2 text-sm font-semibold">Variação percentual de agenda / caixas</h3>
      <div className="space-y-2">
        {variacoes.map((v, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 text-xs">
            <select value={v.campo} className={`${celInput} w-auto`} onChange={(e) => setVariacoes((l) => l.map((x, j) => (j === i ? { ...x, campo: e.target.value } : x)))}>
              <option value="CAIXAS">Caixas (frac. + fech.)</option>
              <option value="CAIXAS_FRACIONADAS">Caixas fracionadas</option>
              <option value="CAIXAS_FECHADAS">Caixas fechadas</option>
              <option value="AGENDA">Agenda (veículos)</option>
            </select>
            <input type="date" min={p.amanha} value={v.inicio} className={`${celInput} w-auto`} onChange={(e) => setVariacoes((l) => l.map((x, j) => (j === i ? { ...x, inicio: e.target.value } : x)))} />
            <span>a</span>
            <input type="date" min={p.amanha} value={v.fim} className={`${celInput} w-auto`} onChange={(e) => setVariacoes((l) => l.map((x, j) => (j === i ? { ...x, fim: e.target.value } : x)))} />
            <input type="number" step="any" value={Math.round(v.percentual * 10000) / 100} className={`${celInput} w-24`}
              onChange={(e) => setVariacoes((l) => l.map((x, j) => (j === i ? { ...x, percentual: Number(e.target.value) / 100 } : x)))} />
            <span>%</span>
            <button type="button" className={p.btn} onClick={() => setVariacoes((l) => l.filter((_, j) => j !== i))} aria-label="Remover variação"><X className="h-3.5 w-3.5" /></button>
          </div>
        ))}
        <button type="button" className={p.btn} onClick={() => setVariacoes((l) => [...l, { campo: "CAIXAS", inicio: inicioPadrao, fim: p.periodo[1] > inicioPadrao ? p.periodo[1] : inicioPadrao, percentual: 0.1 }])}>
          <Plus className="h-3.5 w-3.5" /> Variação
        </button>
      </div>

      <h3 className="mt-5 mb-2 text-sm font-semibold">Posições extras de capacidade</h3>
      <div className="space-y-2">
        {extras.map((x, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 text-xs">
            <select value={x.categoria} className={`${celInput} w-auto`} onChange={(e) => setExtras((l) => l.map((y, j) => (j === i ? { ...y, categoria: e.target.value } : y)))}>
              {p.cats.map((c) => <option key={c.codigo} value={c.codigo}>{c.nome}</option>)}
            </select>
            <span>a partir de</span>
            <input type="date" min={p.amanha} value={x.aPartirDe} className={`${celInput} w-auto`} onChange={(e) => setExtras((l) => l.map((y, j) => (j === i ? { ...y, aPartirDe: e.target.value } : y)))} />
            <input type="number" step="any" value={x.posicoes} className={`${celInput} w-28`} onChange={(e) => setExtras((l) => l.map((y, j) => (j === i ? { ...y, posicoes: Number(e.target.value) } : y)))} />
            <span>posições</span>
            <button type="button" className={p.btn} onClick={() => setExtras((l) => l.filter((_, j) => j !== i))} aria-label="Remover posições"><X className="h-3.5 w-3.5" /></button>
          </div>
        ))}
        <button type="button" className={p.btn}
          onClick={() => setExtras((l) => [...l, { categoria: p.categoriaAtual === "TODAS" ? p.cats[0]?.codigo || "COMPLEMENTAR" : p.categoriaAtual, aPartirDe: inicioPadrao, posicoes: 0 }])}>
          <Plus className="h-3.5 w-3.5" /> Posições
        </button>
      </div>
    </section>
  );
}
