import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Lock, RotateCcw, Save, Trash2, X } from "lucide-react";
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

interface SimulacaoResumo {
  id: number;
  nome: string;
}

/** Veículos e caixas digitados na simulação para um fluxo num dia (nulo = mantém a base oficial). */
interface AjusteFluxoDia {
  fluxo: string;
  data: string;
  [campo: string]: number | string | null;
}

interface SimulacaoDetalhe {
  id: number;
  nome: string;
  descricao: string | null;
  definicao: { ajustesFluxo?: AjusteFluxoDia[] };
  aplicadaEm: string | null;
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
// ---- só para a tabela "Sequência diária": inteiros (0,5 ou mais sobe; abaixo de 0,5 desce) com ponto de milhar
const inteiro = (n: number) => Math.sign(n) * Math.round(Math.abs(n));
const nfT = (n: number | null | undefined) => (n == null || isNaN(n) ? "—" : inteiro(n).toLocaleString("pt-BR", { maximumFractionDigits: 0 }));
const pfT = (n: number | null | undefined) => (n == null || isNaN(n) ? "—" : `${inteiro(n * 100).toLocaleString("pt-BR")}%`);
/** Lê o que foi digitado na célula: aceita "12.500", "12500" ou "12500,6" e devolve um inteiro arredondado. */
const numT = (v: string): number | null => {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t.replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? null : Math.max(0, inteiro(n));
};
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
        const [c, s] = await Promise.all([
          chamar<Categoria[]>("/categorias"),
          chamar<SimulacaoResumo[]>("/simulacoes"),
        ]);
        setCats(c);
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
    !!ed && cat !== "TODAS" && d.tipo !== "REALIZADO" && d.data > hoje && !!fluxoEdicao;

  /** Na simulação, o que já foi digitado nela (por fluxo e dia). */
  const ajusteSim = (data: string) =>
    simDef?.definicao.ajustesFluxo?.find((a) => a.fluxo === fluxoEdicao && a.data === data);

  const editarFluxo = (d: Dia, campo: string, valor: number | null) => {
    if (!fluxoEdicao) return;
    const chave = `${fluxoEdicao}|${d.data}`;
    setPendFluxo((p) => {
      let atual = p[chave];
      if (!atual) {
        atual = { fluxo: fluxoEdicao, data: d.data };
        if (sim) {
          // a simulação guarda o dia inteiro: parte do que já foi digitado nela
          const a = ajusteSim(d.data);
          for (const k of Object.values(CAMPO_FLUXO)) atual[k] = (a?.[k] as number | null | undefined) ?? null;
        } else {
          const f = d.fluxos.find((x) => x.fluxo === fluxoEdicao);
          for (const k of Object.values(CAMPO_FLUXO)) atual[k] = f && (f.ajustados || []).includes(k) ? (f as any)[k] : null;
        }
      }
      return { ...p, [chave]: { ...atual, [campo]: valor } };
    });
  };

  const salvarPlanejado = async () => {
    setSalvando(true);
    try {
      if (sim) {
        await chamar(`/simulacoes/${sim}/ajustes-fluxo`, { method: "PATCH", body: JSON.stringify(Object.values(pendFluxo)) });
        notificar("✅ Simulação salva");
      } else {
        await chamar("/lancamentos/fluxos", { method: "PUT", body: JSON.stringify(Object.values(pendFluxo)) });
        notificar("✅ Planejado salvo");
      }
      setPendFluxo({});
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
    const onde = sim ? "da simulação" : "planejados";
    if (!window.confirm(`Remover os ajustes ${onde} de ${fluxoEdicao} entre ${dm(dias[0].data)} e ${dm(dias[dias.length - 1].data)}?`)) return;
    const itens = JSON.stringify(dias.map((d) => ({ fluxo: fluxoEdicao, data: d.data })));
    try {
      if (sim) await chamar(`/simulacoes/${sim}/ajustes-fluxo`, { method: "PATCH", body: itens });
      else await chamar("/lancamentos/fluxos", { method: "PUT", body: itens });
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
  // mesmo padrão visual da tela Capacidades (cartões sem borda, campos suaves)
  const painel = "rounded-2xl bg-white/70 dark:bg-slate-900/60 shadow-xs backdrop-blur-md transition-colors";
  const campo = "w-full h-[38px] rounded-xl bg-slate-500/5 dark:bg-slate-500/10 hover:bg-slate-500/10 dark:hover:bg-slate-500/15 px-3.5 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 transition-colors border-0";
  const rotulo = "mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300";
  const inputCel = "w-full min-w-[78px] rounded-lg bg-amber-500/5 dark:bg-amber-500/10 px-2 py-1.5 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100 outline-hidden ring-1 ring-amber-500/30 focus:ring-2 focus:ring-amber-500/60 transition";
  const btn = "inline-flex h-9 items-center gap-2 rounded-xl bg-slate-500/10 hover:bg-slate-500/15 text-slate-700 dark:text-slate-200 px-3.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors";
  const btnPrimario = "inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3.5 text-xs font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors";
  const th = "px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] select-none";
  const optCls = isDark ? "bg-slate-900 text-slate-100" : "";
  const seg = (ativo: boolean) => `px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
    ativo ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
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
  else {
    if (fluxosCat.length > 1 && fluxo === "TOTAL") dicas.push("Para editar, escolha o fluxo (Limpeza ou Perfumaria).");
    if (sim) dicas.push("Simulação: digite veículos e caixas de amanhã em diante e salve. Os parâmetros não mudam na simulação. A base oficial só muda ao aplicar a simulação (painel abaixo).");
    else dicas.push('O que já aconteceu não pode ser alterado: o planejado é editável de amanhã em diante. Hoje mostra a sua projeção; o realizado é lançado em Administração > Lançar realizado.');
  }
  dicas.push(...(proj?.avisos || []));

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-5 text-slate-900 dark:text-slate-100">
      {/* largura padrão de todas as telas: até 1760px, centralizado */}
      <div className="max-w-[1760px] mx-auto w-full space-y-6">
      {/* CABEÇALHO */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Análise e monitoramento · Projeção S&amp;OP
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Projeção de ocupação do CD</h1>
            {sim && (
              <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300">
                simulação
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {visao === "semana" ? "Semana atual" : `Mês de ${MESES[parse(periodo[0]).getMonth()]}`} · {dm(periodo[0])} a {dm(periodo[1])} · CD 1965
            {proj ? ` · ${proj.nomeCategoria} · realizado até ${dm(proj.ultimaDataRealizada)}` : ""}
          </p>
        </div>
        <div className="inline-flex p-1 rounded-xl bg-slate-500/10 dark:bg-slate-500/15" role="tablist" aria-label="Visão">
          {(["semana", "mes"] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={visao === v} onClick={() => trocar(() => setVisao(v))} className={seg(visao === v)}>
              {v === "semana" ? "Semana atual" : "Mês"}
            </button>
          ))}
        </div>
      </header>

      {/* FILTROS */}
      <section className={`${painel} p-4 sm:p-5`}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div>
            <label htmlFor="sop-mes" className={rotulo}>Mês</label>
            <select id="sop-mes" disabled={visao === "semana"} value={mes} onChange={(e) => trocar(() => setMes(e.target.value))}
              className={`${campo} ${visao === "semana" ? "opacity-45 cursor-not-allowed" : "cursor-pointer"}`}>
              {meses.map((m) => <option key={m.v} value={m.v} className={optCls}>{m.t}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="sop-cd" className={rotulo}>Centro de distribuição</label>
            <select id="sop-cd" disabled className={`${campo} opacity-80 cursor-not-allowed`}><option className={optCls}>CD 1965</option></select>
          </div>
          <div>
            <label htmlFor="sop-cat" className={rotulo}>Categoria</label>
            <select id="sop-cat" value={cat} onChange={(e) => { const v = e.target.value; trocar(() => { setCat(v); setFluxo("TOTAL"); }); }} className={`${campo} cursor-pointer`}>
              <option value="TODAS" className={optCls}>Todas as categorias</option>
              {cats.map((c) => <option key={c.codigo} value={c.codigo} className={optCls}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="sop-sim" className={rotulo}>Cenário</label>
            <select id="sop-sim" value={sim}
              onChange={(e) => {
                const v = e.target.value;
                trocar(() => (v === "__nova" ? void novaSimulacao() : setSim(v)));
              }}
              className={`${campo} cursor-pointer`}>
              <option value="" className={optCls}>Base oficial</option>
              {sims.map((s) => <option key={s.id} value={String(s.id)} className={optCls}>Simulação: {s.nome}</option>)}
              <option value="__nova" className={optCls}>+ Nova simulação…</option>
            </select>
          </div>
        </div>
      </section>

      {erro && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-700 dark:text-red-300">
          <span>Erro: {erro}</span>
          <button type="button" onClick={() => setErro(null)} aria-label="Fechar" className="cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* INDICADORES */}
      <section aria-label="Resumo" className={`grid shrink-0 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 p-5 sm:p-6 ${painel}`}>
        <Kpi titulo="Qtd capacidade" valor={nf(r?.capacidade)} nota={r ? `útil (− ${nf(r.bloqueado)} bloqueadas) em ${dm(r.dataFinal)}` : ""} />
        <Kpi titulo="Qtd ocupada" valor={nf(r?.ocupacaoAtual)} nota={r?.dataOcupacaoAtual ? `realizado em ${dm(r.dataOcupacaoAtual)}` : "sem realizado"} />
        <Kpi titulo="Qtd projetada" valor={nf(r?.ocupacaoFinal)}
          nota={r ? `${ultimo?.tipo === "REALIZADO" ? "realizado em" : sim ? "simulado para" : "projetado para"} ${dm(r.dataFinal)}` : ""} />
        <Kpi titulo="% ocupação atual" valor={pf(r?.percentualAtual)} cor={corPct(r?.percentualAtual)} barra={r?.percentualAtual} />
        <Kpi titulo="% ocupação projetada" valor={pf(r?.percentualFinal)} cor={corPct(r?.percentualFinal)} barra={r?.percentualFinal}
          nota={comp ? `base oficial: ${pf(comp.base.resumo.percentualFinal)}` : r?.picoProjetado ? `pico ${pf(r.picoProjetado.percentual)} em ${dm(r.picoProjetado.data)}` : ""} />
      </section>

      {/* GRÁFICO */}
      <section className={`${painel} px-2 py-5 sm:px-3 sm:py-6`}>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3 px-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Ocupação dia a dia</h2>
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
      <section className={`${painel} p-5 sm:p-6`}>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Sequência diária</h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">Pallets, exceto veículos e caixas · dias realizados mostram só o real</span>
        </div>

        {fluxosCat.length > 1 && catInfo && (
          <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-medium text-slate-600 dark:text-slate-300">Fluxo</span>
            <div className="inline-flex p-1 rounded-xl bg-slate-500/10 dark:bg-slate-500/15">
              {[{ codigo: "TOTAL", nome: `Total ${catInfo.nome}` }, ...catInfo.fluxos].map((f) => (
                <button key={f.codigo} type="button" onClick={() => setFluxo(f.codigo)}
                  className={seg(fluxo === f.codigo)}>
                  {f.nome}
                </button>
              ))}
            </div>
            <span className="text-slate-500">Veículos, caixas e pallets do fluxo escolhido; capacidade e ocupação da categoria.</span>
          </div>
        )}

        {dicas.length > 0 && (
          <div className="mb-4 rounded-xl bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
            {dicas.join(" · ")}
          </div>
        )}

        <div className="max-h-[620px] overflow-auto">
          <table className="w-full min-w-[1180px] text-xs tabular-nums border-separate border-spacing-y-1">
            <thead className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
              <tr>
                <th className={`${th} sticky left-0 z-20 text-left rounded-l-xl text-slate-500 dark:text-slate-400 bg-[#fcfcfd] dark:bg-[#0c1221]`}>Data</th>
                {COLS.map((c) => (
                  <th key={c.k}
                    className={`${th} text-right last:rounded-r-xl ${
                      c.ed && cat !== "TODAS" ?"text-amber-700 dark:text-amber-300" : "text-slate-500 dark:text-slate-400"
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
                    className={`transition-colors [&>td:first-child]:rounded-l-xl [&>td:last-child]:rounded-r-xl ${
                      ehHoje ? "bg-blue-500/[0.08]" : d.data < hoje ? "bg-slate-500/[0.04] dark:bg-slate-500/[0.07]" : "bg-slate-500/[0.02] dark:bg-slate-500/[0.04]"
                    } hover:bg-slate-500/[0.08] dark:hover:bg-slate-500/[0.12]`}>
                    {/* coluna de data fixa: continua visível ao rolar a tabela para o lado */}
                    <td className={`sticky left-0 z-[5] px-3 py-2.5 text-left whitespace-nowrap font-medium text-slate-900 dark:text-slate-100 shadow-[6px_0_8px_-6px_rgba(15,23,42,0.18)] ${
                      ehHoje ? "bg-[#eef3fb] dark:bg-[#111d33]" : "bg-[#fcfcfd] dark:bg-[#0c1221]"
                    }`}>
                      <span className="mr-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">{WD[parse(d.data).getDay()]}</span>
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
                        const ajustado = sim ? ajusteSim(d.data)?.[campoApi] != null : (v.aj as string[]).includes(campoApi);
                        return (
                          <td key={c.k} className="px-1.5 py-1">
                            <CelulaNumero aria-label={`${c.t} ${d.data}`}
                              valor={val == null ? null : Number(val)}
                              onChange={(n) => editarFluxo(d, campoApi, n)}
                              className={`${inputCel} ${ajustado ? "font-semibold" : ""} ${temPend ? "ring-2 ring-amber-500/60" : ""}`} />
                          </td>
                        );
                      }
                      if (c.k === "pct") {
                        return (
                          <td key={c.k} className="px-3 py-2.5 text-right">
                            {v.pct == null ? "—" : (
                              <span className="inline-block min-w-[58px] rounded-md px-2 py-0.5 text-center font-semibold"
                                style={{ color: corPct(v.pct), backgroundColor: `${corPct(v.pct)}22` }}>
                                {pfT(v.pct)}
                              </span>
                            )}
                          </td>
                        );
                      }
                      return (
                        <td key={c.k} className={`px-3 py-2.5 text-right font-mono ${realPassado && ["remun", "backlog", "proj"].includes(c.k) ? "text-slate-400" : ""}`}>
                          {nfT(v[c.k])}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Veículos = agenda útil × % recebimento (+ remunerado + backlog) · ocupação = dia anterior (real, se houver) + recebidos − expedidos.{" "}
            {sim ? "Campo vazio volta ao valor da base oficial." : "Campo vazio volta ao calculado."}
          </span>
          <div className="flex items-center gap-2">
            {Object.keys(pendFluxo).length > 0 && <span className="font-semibold text-amber-600">Alterações não salvas</span>}
            <button type="button" className={btn} onClick={desfazer} disabled={cat === "TODAS" || !fluxoEdicao}>
              <RotateCcw className="h-3.5 w-3.5" /> {sim ? "Limpar simulação desta visão" : "Desfazer ajustes desta visão"}
            </button>
            <button type="button" className={btnPrimario} onClick={salvarPlanejado} disabled={!Object.keys(pendFluxo).length || salvando}>
              <Save className="h-3.5 w-3.5" /> {sim ? "Salvar simulação" : "Salvar"}
            </button>
          </div>
        </div>
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
          temPendente={temPendente}
          onSalvo={async () => {
            setSims(await chamar<SimulacaoResumo[]>("/simulacoes"));
            setRecarregar((n) => n + 1);
            notificar("✅ Simulação salva");
          }}
          onAplicado={(dias, ignorados) => {
            setRecarregar((n) => n + 1);
            notificar(`✅ Simulação aplicada na base oficial: ${dias} dia(s)${ignorados ? ` · ${ignorados} dia(s) que já passaram ficaram de fora` : ""}`);
          }}
          onExcluido={async () => {
            setSims(await chamar<SimulacaoResumo[]>("/simulacoes"));
            setSim("");
          }}
          onErro={(m) => setErro(m)}
        />
      )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componentes auxiliares
// ---------------------------------------------------------------------------
/** Célula editável da tabela: mostra inteiro com ponto de milhar; enquanto digita, mostra o texto livre. */
function CelulaNumero({ valor, onChange, className, ...rest }: {
  valor: number | null;
  onChange: (n: number | null) => void;
  className?: string;
  "aria-label"?: string;
}) {
  const [texto, setTexto] = useState<string | null>(null); // null = fora de edição
  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      className={className}
      value={texto ?? (valor == null ? "" : nfT(valor))}
      onFocus={() => setTexto(valor == null ? "" : String(inteiro(valor)))}
      onChange={(e) => {
        setTexto(e.target.value);
        onChange(numT(e.target.value));
      }}
      onBlur={() => setTexto(null)}
    />
  );
}

function Kpi({ titulo, valor, nota, cor, barra }: { titulo: string; valor: string; nota?: string; cor?: string; barra?: number | null }) {
  return (
    <div className="p-4 rounded-xl flex flex-col bg-slate-500/[0.04] dark:bg-slate-500/[0.08] hover:bg-slate-500/[0.07] dark:hover:bg-slate-500/[0.12] transition-colors">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{titulo}</span>
      <div className="mt-2">
        <div className="font-mono text-xl sm:text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-slate-100" style={cor ? { color: cor } : undefined}>{valor}</div>
        {barra !== undefined && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-500/15">
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
  const balao = useRef<HTMLDivElement>(null);
  const [largBalao, setLargBalao] = useState(0);
  useEffect(() => {
    if (dica && balao.current) setLargBalao(balao.current.offsetWidth);
  }, [dica]);

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
  // altura acompanha a largura para o gráfico ocupar melhor o cartão
  const H = largura < 560 ? 250 : Math.min(400, Math.max(300, Math.round(largura * 0.27)));
  const m = { l: 40, r: 10, t: 24, b: 30 };
  const vals = [...real, ...proj, ...(linhaBase || [])].filter((v): v is number => v != null);
  if (!vals.length) return <p className="py-10 text-center text-sm text-slate-500">Sem dados de ocupação no período.</p>;
  const lo = Math.max(0, Math.floor((Math.min(...vals) * 100 - 6) / 5) * 5);
  // folga acima do maior valor para o rótulo do ponto não ser cortado
  const hi = Math.max(100, Math.ceil((Math.max(...vals) * 100 + 2) / 5) * 5);
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
          <text key={d.data} x={x(i)} y={H - 10} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize={denso ? 10 : 11}
            fill={d.data === hoje ? (isDark ? "#f1f5f9" : "#0f172a") : texto} fontWeight={d.data === hoje ? 600 : 400}>
            {dm(d.data)}
          </text>
        ))}
        {iHoje >= 0 && (
          <g>
            <line x1={x(iHoje)} x2={x(iHoje)} y1={m.t} y2={m.t + ih} stroke={texto} strokeDasharray="2 3" />
            <text x={iHoje === n - 1 ? x(iHoje) - 4 : x(iHoje) + 4} y={m.t - 8} textAnchor={iHoje === n - 1 ? "end" : "start"} fontSize={10} fill={texto} fontFamily="ui-monospace,monospace">HOJE</text>
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
        // o balão nunca sai do gráfico: perto das bordas ele encosta no limite em vez de centralizar no ponto
        const larguraVisivel = caixa.current?.clientWidth || W * escala;
        const rolagem = caixa.current?.scrollLeft || 0;
        const centro = dica.x * escala;
        const esquerda = Math.min(Math.max(centro - largBalao / 2, rolagem + 4), rolagem + larguraVisivel - largBalao - 4);
        return (
          <div ref={balao} className="pointer-events-none absolute z-10 -translate-y-full whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
            style={{ left: largBalao ? esquerda : centro, top: Math.max(dica.y * escala - 12, 34), visibility: largBalao ? "visible" : "hidden" }}>
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
  temPendente: boolean;
  onSalvo: () => void;
  onAplicado: (dias: number, ignorados: number) => void;
  onExcluido: () => void;
  onErro: (msg: string) => void;
}

/**
 * Simulação: só veículos e caixas (digitados na tabela acima). Aqui ficam nome, comparação com a base
 * e a ação de aplicar — quando a simulação "vale", os valores dela substituem o planejado oficial.
 */
function PainelSimulacao(p: PainelSimulacaoProps) {
  const [nome, setNome] = useState(p.simDef.nome);
  const [descricao, setDescricao] = useState(p.simDef.descricao || "");
  const [ocupado, setOcupado] = useState(false);
  const ajustes = p.simDef.definicao.ajustesFluxo || [];
  const dias = new Set(ajustes.map((a) => a.data)).size;
  const mudouNome = nome.trim() !== p.simDef.nome || descricao !== (p.simDef.descricao || "");

  const salvarNome = async () => {
    setOcupado(true);
    try {
      // sem definicao: o backend mantém os veículos e caixas já salvos
      await chamar(`/simulacoes/${p.simDef.id}`, {
        method: "PUT",
        body: JSON.stringify({ nome: nome.trim() || p.simDef.nome, descricao }),
      });
      p.onSalvo();
    } catch (e: any) {
      p.onErro(e.message);
    } finally {
      setOcupado(false);
    }
  };

  const aplicar = async () => {
    if (p.temPendente) {
      p.onErro("Salve a simulação antes de aplicar.");
      return;
    }
    if (!window.confirm(
      `Aplicar "${p.simDef.nome}" na base oficial?\n\nOs veículos e caixas da simulação substituem o planejado oficial nos mesmos dias (de amanhã em diante). Dias que já passaram ficam de fora.`,
    )) return;
    setOcupado(true);
    try {
      const r = await chamar<{ diasAplicados: number; diasIgnoradosPassado: number }>(`/simulacoes/${p.simDef.id}/aplicar`, { method: "POST" });
      p.onAplicado(r.diasAplicados, r.diasIgnoradosPassado);
    } catch (e: any) {
      p.onErro(e.message);
    } finally {
      setOcupado(false);
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
      <div className="rounded-xl bg-slate-500/5 dark:bg-slate-500/10 px-4 py-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{titulo}</span>
        <div className="text-xl font-semibold tabular-nums">{fmt(simulado)}</div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
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
  const rot = "mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300";
  const aplicada = p.simDef.aplicadaEm ? new Date(p.simDef.aplicadaEm) : null;

  return (
    <section className={`${p.painel} p-5 sm:p-6`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Simulação</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {ajustes.length ? `${ajustes.length} ajuste(s) de veículos/caixas em ${dias} dia(s)` : "Nenhum ajuste ainda: digite veículos e caixas na tabela acima e salve."}
            {aplicada && ` · aplicada na base oficial em ${aplicada.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={`${p.btn} text-red-600 dark:text-red-400`} onClick={excluir} disabled={ocupado}>
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </button>
          <button type="button" className={p.btn} onClick={salvarNome} disabled={ocupado || !mudouNome}>
            <Save className="h-3.5 w-3.5" /> Salvar nome
          </button>
          <button type="button" className={p.btnPrimario} onClick={aplicar} disabled={ocupado || !ajustes.length}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Aplicar na base oficial
          </button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="sim-nome" className={rot}>Nome</label>
          <input id="sim-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} className={p.campo} />
        </div>
        <div>
          <label htmlFor="sim-desc" className={rot}>Descrição</label>
          <input id="sim-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={1000} className={p.campo} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cartao("% fim do período", r.percentualFinalBase, r.percentualFinalSimulado, pf, true)}
        {cartao("Ocupação fim do período", r.ocupacaoFinalBase, r.ocupacaoFinalSimulada, nf, false)}
        {cartao("Pico projetado", r.picoBase?.percentual, r.picoSimulado?.percentual, pf, true)}
        {cartao("Dias críticos (≥95%)", r.diasCriticosBase, r.diasCriticosSimulado, (v) => (v == null ? "—" : String(v)), false)}
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        A simulação usa os parâmetros oficiais e muda só veículos e caixas, de amanhã em diante. A base oficial só muda ao clicar em
        “Aplicar na base oficial”: aí os valores da simulação substituem o planejado nos mesmos dias.
      </p>
    </section>
  );
}
