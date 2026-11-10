import React, { useEffect, useState } from "react";
import { Lock, Save, X } from "lucide-react";
import { apiFetch } from "../services/api";

// ---------------------------------------------------------------------------
// Lançamento do realizado da projeção S&OP (CD 1965) — API /api/sop do backend gestao-ppcp.
// Regras: só dias que já aconteceram (até hoje), uma única vez por categoria e dia;
// depois de lançado não pode ser alterado. O realizado de hoje é lançado amanhã.
// ---------------------------------------------------------------------------

interface LancarRealizadoProps {
  theme?: "light" | "dark";
  showNotification?: (msg: string) => void;
}

interface Categoria {
  codigo: string;
  nome: string;
}

interface Dia {
  data: string;
  tipo: "REALIZADO" | "PROJETADO" | "SEM_DADOS";
  planejado: { veiculos: number | null; palletsIn: number | null; caixasFracionadas: number | null; caixasFechadas: number | null } | null;
  realizado: { veiculos: number | null; pallets: number | null; caixasFracionadas: number | null; caixasFechadas: number | null } | null;
}

interface Projecao {
  hoje: string;
  dias: Dia[];
}

type Pendente = Record<string, number | null | string>;

const WD = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const CAMPOS = ["veiculos", "pallets", "caixasFracionadas", "caixasFechadas"] as const;
const TITULOS = ["Veículos", "Pallets recebidos", "Caixas fracionadas", "Caixas fechadas"];
const DIAS = 7;

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addD = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dm = (s?: string | null) => (s ? `${s.slice(8)}/${s.slice(5, 7)}` : "—");
const nf = (n: number | null | undefined) => (n == null || isNaN(n) ? "—" : Math.round(n).toLocaleString("pt-BR"));
const num = (v: string): number | null => (v.trim() === "" ? null : Math.max(0, Number(v.replace(",", "."))));

async function chamar<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await apiFetch(`/api/sop${path}`, init);
  if (r.status === 403) throw new Error("Sem permissão: faça login para lançar o realizado.");
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

export default function LancarRealizado({ theme = "dark", showNotification }: LancarRealizadoProps) {
  const isDark = theme === "dark";
  const [cats, setCats] = useState<Categoria[]>([]);
  const [cat, setCat] = useState("COMPLEMENTAR");
  const [proj, setProj] = useState<Projecao | null>(null);
  const [pend, setPend] = useState<Record<string, Pendente>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [recarregar, setRecarregar] = useState(0);

  useEffect(() => {
    chamar<Categoria[]>("/categorias").then(setCats).catch((e) => setErro(e.message));
  }, []);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setCarregando(true);
      setErro(null);
      try {
        // o "hoje" vem do backend (fuso do CD); a primeira consulta só descobre a data
        const base = await chamar<Projecao>(`/projecao?categoria=${cat}&inicio=${iso(new Date())}&fim=${iso(new Date())}`);
        const hoje = base.hoje;
        const p = await chamar<Projecao>(`/projecao?categoria=${cat}&inicio=${iso(addD(parse(hoje), -(DIAS - 1)))}&fim=${hoje}`);
        if (!cancelado) setProj(p);
      } catch (e: any) {
        if (!cancelado) setErro(e.message);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [cat, recarregar]);

  const trocarCategoria = (c: string) => {
    if (Object.keys(pend).length && !window.confirm("Há valores não lançados. Descartar?")) return;
    setPend({});
    setCat(c);
  };

  const lancar = async () => {
    const itens = Object.values(pend);
    if (!itens.length) return;
    const incompletos = itens.filter((r) => CAMPOS.some((k) => r[k] == null)).map((r) => dm(r.data as string));
    let msg = `Lançar o realizado de ${itens.map((r) => dm(r.data as string)).join(", ")}? Depois de lançado não pode ser alterado.`;
    if (incompletos.length) msg += `\n\nAtenção: ${incompletos.join(", ")} tem campos vazios, que ficarão vazios para sempre.`;
    if (!window.confirm(msg)) return;
    setSalvando(true);
    try {
      await chamar("/lancamentos/realizados", { method: "PUT", body: JSON.stringify(itens) });
      setPend({});
      showNotification?.("✅ Realizado lançado");
      setRecarregar((n) => n + 1);
    } catch (e: any) {
      setErro(e.message);
      showNotification?.(`❌ ${e.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const hoje = proj?.hoje;
  const nomeCat = cats.find((c) => c.codigo === cat)?.nome || cat;
  const selectClass = "rounded-xl bg-slate-500/5 dark:bg-slate-500/10 hover:bg-slate-500/10 dark:hover:bg-slate-500/15 px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 transition-colors cursor-pointer border-0 min-w-[220px]";
  const inputCel = "w-full min-w-[90px] rounded-lg bg-amber-500/5 dark:bg-amber-500/10 px-2.5 py-1.5 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-hidden ring-1 ring-amber-500/30 focus:ring-2 focus:ring-amber-500/60 transition";
  const btnPrimario = "inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3.5 text-xs font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors";
  const th = "px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 select-none";
  const pendentes = Object.keys(pend).length;

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-5 text-slate-900 dark:text-slate-100">
      <div className="max-w-[1760px] mx-auto w-full space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Administração · Projeção S&amp;OP
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Lançar realizado</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              CD 1965 · últimos {DIAS} dias até hoje · cada dia pode ser lançado uma única vez.
            </p>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">Categoria</span>
            <select id="real-cat" value={cat} onChange={(e) => trocarCategoria(e.target.value)} className={selectClass}>
              {cats.map((c) => (
                <option key={c.codigo} value={c.codigo} className={isDark ? "bg-slate-900 text-slate-100" : ""}>{c.nome}</option>
              ))}
            </select>
          </label>
        </header>

        <section className="rounded-2xl bg-white/70 dark:bg-slate-900/60 p-5 sm:p-6 shadow-xs backdrop-blur-md transition-colors space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{nomeCat}</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">O valor em cinza dentro do campo é a projeção do dia, como referência.</span>
          </div>

          {erro && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-700 dark:text-red-300">
              <span>Erro: {erro}</span>
              <button type="button" onClick={() => setErro(null)} aria-label="Fechar" className="cursor-pointer hover:opacity-80"><X className="h-4 w-4" /></button>
            </div>
          )}

          <div className="max-h-[620px] overflow-auto">
            <table className="w-full min-w-[760px] text-left border-separate border-spacing-y-1">
              <thead className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
                <tr>
                  <th className={`${th} text-left rounded-l-xl`}>Data</th>
                  {TITULOS.map((t) => (
                    <th key={t} className={`${th} text-right`}>{t}</th>
                  ))}
                  <th className={`${th} text-right rounded-r-xl`}>Situação</th>
                </tr>
              </thead>
              <tbody className="text-sm tabular-nums">
                {carregando && !proj ? (
                  <tr><td colSpan={6} className="py-20 text-center text-sm text-slate-500 dark:text-slate-400">Carregando…</td></tr>
                ) : (
                  [...(proj?.dias || [])].reverse().map((d) => {
                    const chave = `${cat}|${d.data}`;
                    const p = pend[chave];
                    const referencia: Record<string, number | null | undefined> = {
                      veiculos: d.planejado?.veiculos,
                      pallets: d.planejado?.palletsIn,
                      caixasFracionadas: d.planejado?.caixasFracionadas,
                      caixasFechadas: d.planejado?.caixasFechadas,
                    };
                    const ehHoje = d.data === hoje;
                    return (
                      <tr key={d.data}
                        className={`transition-colors ${ehHoje ? "bg-blue-500/[0.08]" : "bg-slate-500/[0.04] dark:bg-slate-500/[0.07]"} hover:bg-slate-500/[0.08] dark:hover:bg-slate-500/[0.12]`}>
                        <td className="px-4 py-2.5 text-left whitespace-nowrap rounded-l-xl font-medium text-slate-900 dark:text-slate-100">
                          <span className="mr-2 font-mono text-xs text-slate-500 dark:text-slate-400">{WD[parse(d.data).getDay()]}</span>
                          <span className="font-mono">{dm(d.data)}</span>
                          {ehHoje && <span className="ml-2 rounded-md bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">hoje</span>}
                        </td>
                        {CAMPOS.map((k) => (
                          <td key={k} className="px-2 py-1.5 text-right">
                            {d.realizado ? (
                              <span className="px-2 font-mono font-medium text-slate-900 dark:text-slate-100">{nf(d.realizado[k])}</span>
                            ) : (
                              <input type="number" min={0} step="any" inputMode="decimal" aria-label={`${k} ${d.data}`}
                                placeholder={nf(referencia[k])}
                                value={p && p[k] != null ? String(p[k]) : ""}
                                onChange={(e) => {
                                  const valor = num(e.target.value);
                                  setPend((atual) => {
                                    const item: Pendente = atual[chave] || {
                                      categoria: cat, data: d.data, veiculos: null, pallets: null, caixasFracionadas: null, caixasFechadas: null,
                                    };
                                    const novo = { ...item, [k]: valor };
                                    const copia = { ...atual };
                                    if (CAMPOS.every((c) => novo[c] == null)) delete copia[chave];
                                    else copia[chave] = novo;
                                    return copia;
                                  });
                                }}
                                className={inputCel} />
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-2.5 text-right rounded-r-xl">
                          {d.realizado ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                              <Lock className="h-3 w-3" /> Lançado
                            </span>
                          ) : (
                            <span className="inline-block rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">Pendente</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-500 dark:text-slate-400">
            <span>O realizado de hoje é lançado amanhã. Depois de lançado, não pode ser alterado.</span>
            <div className="flex items-center gap-3">
              {pendentes > 0 && <span className="font-semibold text-amber-700 dark:text-amber-400">{pendentes} dia(s) a lançar</span>}
              <button type="button" className={btnPrimario} onClick={lancar} disabled={!pendentes || salvando}>
                <Save className="h-3.5 w-3.5" /> Lançar realizado
              </button>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}
