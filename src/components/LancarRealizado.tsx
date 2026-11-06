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
  const painel = `rounded-2xl border shadow-xs ${isDark ? "bg-slate-900/60 border-slate-800/80" : "bg-white border-slate-200/90"}`;
  const campo = `h-9 px-3 rounded-lg border font-medium outline-hidden transition-colors cursor-pointer ${
    isDark ? "bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700" : "bg-white border-slate-200 text-slate-800 hover:border-slate-300"
  }`;
  const inputCel = `w-full min-w-[90px] rounded-md border px-2 py-1 text-right tabular-nums outline-hidden ${
    isDark ? "bg-slate-950 border-amber-700/50 text-slate-100" : "bg-white border-amber-300 text-slate-900"
  }`;
  const btnPrimario = `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer ${
    isDark ? "bg-slate-100 text-slate-900 hover:bg-white" : "bg-slate-900 text-white hover:bg-slate-800"
  }`;
  const pendentes = Object.keys(pend).length;

  return (
    <div
      className={`w-full min-h-full transition-colors duration-200 ${
        isDark ? "bg-[#070b14] text-slate-100" : "bg-[#f8fafc] text-slate-900"
      } p-4 md:p-6 lg:p-8 flex flex-col gap-6`}
    >
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 border-b pb-5 border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Lançar realizado</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Projeção S&amp;OP · CD 1965 · últimos {DIAS} dias até hoje · cada dia pode ser lançado uma única vez
          </p>
        </div>
        <div className="flex flex-col gap-1 text-xs">
          <label htmlFor="real-cat" className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-500">
            Categoria
          </label>
          <select id="real-cat" value={cat} onChange={(e) => trocarCategoria(e.target.value)} className={campo}>
            {cats.map((c) => (
              <option key={c.codigo} value={c.codigo}>{c.nome}</option>
            ))}
          </select>
        </div>
      </header>

      {erro && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-start justify-between gap-3">
          <span>Erro: {erro}</span>
          <button type="button" onClick={() => setErro(null)} aria-label="Fechar" className="cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}

      <section className={`${painel} p-4 sm:p-5`}>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold">{nomeCat}</h2>
          <span className="text-xs text-slate-500">Em cinza, a projeção do dia como referência</span>
        </div>
        <div className={`overflow-x-auto rounded-lg border ${isDark ? "border-slate-800" : "border-slate-200"}`}>
          <table className="w-full min-w-[720px] text-xs tabular-nums">
            <thead>
              <tr className={isDark ? "bg-slate-900" : "bg-slate-50"}>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Data</th>
                {TITULOS.map((t) => (
                  <th key={t} className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t}</th>
                ))}
                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">Situação</th>
              </tr>
            </thead>
            <tbody>
              {carregando && !proj ? (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">Carregando…</td></tr>
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
                  return (
                    <tr key={d.data}
                      className={`border-t ${isDark ? "border-slate-800/70" : "border-slate-100"} ${d.data === hoje ? (isDark ? "bg-sky-950/40" : "bg-sky-50") : ""}`}>
                      <td className="px-3 py-1.5 text-left whitespace-nowrap">
                        <span className="mr-1.5 text-[11px] text-slate-500">{WD[parse(d.data).getDay()]}</span>
                        {dm(d.data)}{d.data === hoje ? " · hoje" : ""}
                      </td>
                      {CAMPOS.map((k) => (
                        <td key={k} className="px-1.5 py-1 text-right">
                          {d.realizado ? (
                            <span className="px-1.5">{nf(d.realizado[k])}</span>
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
                      <td className="px-3 py-1.5 text-right">
                        {d.realizado ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 font-semibold text-green-600">
                            <Lock className="h-3 w-3" /> lançado
                          </span>
                        ) : (
                          <span className="inline-block rounded-full bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-600">pendente</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>Ex.: o realizado de hoje é lançado amanhã. Depois de lançado, não pode ser alterado.</span>
          <div className="flex items-center gap-2">
            {pendentes > 0 && <span className="font-semibold text-amber-600">{pendentes} dia(s) a lançar</span>}
            <button type="button" className={btnPrimario} onClick={lancar} disabled={!pendentes || salvando}>
              <Save className="h-3.5 w-3.5" /> Lançar realizado
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
