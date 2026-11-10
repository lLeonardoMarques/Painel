import React, { useEffect, useState } from "react";
import { RotateCcw, Save, X } from "lucide-react";
import { apiFetch } from "../services/api";

// ---------------------------------------------------------------------------
// Parâmetros da projeção S&OP (CD 1965) — API /api/sop/parametros do backend gestao-ppcp.
// Os parâmetros valem para toda a projeção (base oficial e simulações). Simulação não muda parâmetro.
// ---------------------------------------------------------------------------

interface ParametrosProps {
  theme?: "light" | "dark";
  showNotification?: (msg: string) => void;
}

interface Gerais {
  senhasReservadasSemana: number;
  senhasReservadasSabado: number;
  corteFaturamento: number;
  atualizadoEm: string | null;
}

interface ParFluxo {
  fluxo: string;
  nome: string;
  categoria: string;
  percentualRecebimento: number;
  palletsPorVeiculo: number;
  percentualExpedicao: number;
  mixFracionado: number;
  mixFechado: number;
  caixasPalletFracionado: number;
  caixasPalletFechado: number;
  atualizadoEm: string | null;
}

interface Campo {
  k: string;
  t: string;
  pct?: boolean;
  inteiro?: boolean;
}

const CAMPOS_GERAIS: Campo[] = [
  { k: "senhasReservadasSemana", t: "Senhas reservadas (seg a sex)", inteiro: true },
  { k: "senhasReservadasSabado", t: "Senhas reservadas (sábado)", inteiro: true },
  { k: "corteFaturamento", t: "Corte de faturamento (%)", pct: true },
];

const CAMPOS_FLUXO: Campo[] = [
  { k: "percentualRecebimento", t: "% recebimento", pct: true },
  { k: "palletsPorVeiculo", t: "Pallets / veículo" },
  { k: "percentualExpedicao", t: "% expedição", pct: true },
  { k: "mixFracionado", t: "Mix fracionado (%)", pct: true },
  { k: "mixFechado", t: "Mix fechado (%)", pct: true },
  { k: "caixasPalletFracionado", t: "Cx / pallet fracionado" },
  { k: "caixasPalletFechado", t: "Cx / pallet fechado" },
];

type Texto = Record<string, string>;

/** Valor da API → texto do campo (percentuais em 0–100, vírgula decimal). */
const paraTexto = (v: number | null | undefined, c: Campo) =>
  v == null ? "" : (c.pct ? Math.round(v * 1e6) / 1e4 : v).toLocaleString("pt-BR", { maximumFractionDigits: 6, useGrouping: false });

/** Texto do campo → valor da API (nulo = inválido). */
const doTexto = (s: string, c: Campo): number | null => {
  // aceita "96,5" e "96.5"; com vírgula, o ponto é separador de milhar ("1.234,5")
  const bruto = s.trim();
  const t = bruto.includes(",") ? bruto.replace(/\./g, "").replace(",", ".") : bruto;
  if (t === "") return null;
  const n = Number(t);
  if (isNaN(n) || n < 0) return null;
  if (c.pct) return n > 100 ? null : n / 100;
  if (c.inteiro) return Number.isInteger(n) ? n : null;
  return n;
};

const quando = (s: string | null) =>
  s ? new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

async function chamar<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await apiFetch(`/api/sop${path}`, init);
  if (r.status === 403) throw new Error("Sem permissão: faça login para alterar os parâmetros.");
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

export default function Parametros({ showNotification }: ParametrosProps) {
  const [gerais, setGerais] = useState<Gerais | null>(null);
  const [fluxos, setFluxos] = useState<ParFluxo[]>([]);
  const [txtGerais, setTxtGerais] = useState<Texto>({});
  const [txtFluxos, setTxtFluxos] = useState<Record<string, Texto>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [recarregar, setRecarregar] = useState(0);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setCarregando(true);
      try {
        const p = await chamar<{ gerais: Gerais; fluxos: ParFluxo[] }>("/parametros");
        if (cancelado) return;
        setGerais(p.gerais);
        setFluxos(p.fluxos);
        setTxtGerais(Object.fromEntries(CAMPOS_GERAIS.map((c) => [c.k, paraTexto((p.gerais as any)[c.k], c)])));
        setTxtFluxos(Object.fromEntries(p.fluxos.map((f) => [f.fluxo, Object.fromEntries(CAMPOS_FLUXO.map((c) => [c.k, paraTexto((f as any)[c.k], c)]))])));
      } catch (e: any) {
        if (!cancelado) setErro(e.message);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [recarregar]);

  // o que mudou em relação ao que está salvo
  const mudou = (txt: Texto | undefined, orig: any, campos: Campo[]) =>
    !!txt && !!orig && campos.some((c) => (txt[c.k] ?? "") !== paraTexto(orig[c.k], c));
  const invalidos = (txt: Texto | undefined, campos: Campo[]) => campos.filter((c) => doTexto(txt?.[c.k] ?? "", c) == null);

  const geraisMudou = mudou(txtGerais, gerais, CAMPOS_GERAIS);
  const fluxosMudados = fluxos.filter((f) => mudou(txtFluxos[f.fluxo], f, CAMPOS_FLUXO));
  const qtdMudancas = (geraisMudou ? 1 : 0) + fluxosMudados.length;

  const salvar = async () => {
    const problemas: string[] = [];
    if (geraisMudou && invalidos(txtGerais, CAMPOS_GERAIS).length) problemas.push("Parâmetros gerais");
    for (const f of fluxosMudados) if (invalidos(txtFluxos[f.fluxo], CAMPOS_FLUXO).length) problemas.push(f.nome);
    if (problemas.length) {
      setErro(`Valores inválidos em: ${problemas.join(", ")}. Percentuais vão de 0 a 100; os demais não podem ficar vazios.`);
      return;
    }
    const lista = [geraisMudou ? "parâmetros gerais" : null, ...fluxosMudados.map((f) => f.nome)].filter(Boolean).join(", ");
    if (!window.confirm(`Salvar ${lista}?\n\nOs parâmetros valem para toda a projeção (base oficial e simulações) a partir de agora.`)) return;
    setSalvando(true);
    setErro(null);
    try {
      if (geraisMudou) {
        const corpo = Object.fromEntries(CAMPOS_GERAIS.map((c) => [c.k, doTexto(txtGerais[c.k], c)]));
        await chamar("/parametros/gerais", { method: "PUT", body: JSON.stringify(corpo) });
      }
      for (const f of fluxosMudados) {
        const corpo = Object.fromEntries(CAMPOS_FLUXO.map((c) => [c.k, doTexto(txtFluxos[f.fluxo][c.k], c)]));
        await chamar(`/parametros/fluxos/${f.fluxo}`, { method: "PUT", body: JSON.stringify(corpo) });
      }
      showNotification?.("✅ Parâmetros salvos");
    } catch (e: any) {
      setErro(e.message);
      showNotification?.(`❌ ${e.message}`);
    } finally {
      setSalvando(false);
      setRecarregar((n) => n + 1);
    }
  };

  const descartar = () => {
    if (qtdMudancas && !window.confirm("Descartar as alterações não salvas?")) return;
    setRecarregar((n) => n + 1);
  };

  const painel = "rounded-2xl bg-white/70 dark:bg-slate-900/60 p-5 sm:p-6 shadow-xs backdrop-blur-md transition-colors";
  const campo = "w-full h-[38px] rounded-xl bg-slate-500/5 dark:bg-slate-500/10 hover:bg-slate-500/10 dark:hover:bg-slate-500/15 px-3.5 text-xs font-medium text-right font-mono tabular-nums text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 transition-colors border-0";
  const inputCel = "w-full min-w-[96px] rounded-lg bg-amber-500/5 dark:bg-amber-500/10 px-2.5 py-1.5 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100 outline-hidden ring-1 ring-amber-500/30 focus:ring-2 focus:ring-amber-500/60 transition";
  const btn = "inline-flex h-9 items-center gap-2 rounded-xl bg-slate-500/10 hover:bg-slate-500/15 text-slate-700 dark:text-slate-200 px-3.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors";
  const btnPrimario = "inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3.5 text-xs font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors";
  const th = "px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 select-none";
  const marca = (alterado: boolean, invalido: boolean) =>
    invalido ? "ring-2 ring-red-500/70" : alterado ? "ring-2 ring-amber-500/60 font-semibold" : "";

  // fluxos agrupados por categoria, na ordem da API
  const categorias = Array.from(new Set(fluxos.map((f) => f.categoria)));

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-5 text-slate-900 dark:text-slate-100">
      <div className="max-w-[1760px] mx-auto w-full space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Administração · Projeção S&amp;OP
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Parâmetros</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              CD 1965 · valem para toda a projeção (base oficial e simulações). As simulações não alteram parâmetros.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {qtdMudancas > 0 && <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">{qtdMudancas} alteração(ões) não salva(s)</span>}
            <button type="button" className={btn} onClick={descartar} disabled={!qtdMudancas || salvando}>
              <RotateCcw className="h-3.5 w-3.5" /> Descartar
            </button>
            <button type="button" className={btnPrimario} onClick={salvar} disabled={!qtdMudancas || salvando}>
              <Save className="h-3.5 w-3.5" /> Salvar parâmetros
            </button>
          </div>
        </header>

        {erro && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-700 dark:text-red-300">
            <span>Erro: {erro}</span>
            <button type="button" onClick={() => setErro(null)} aria-label="Fechar" className="cursor-pointer hover:opacity-80"><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* GERAIS */}
        <section className={painel}>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Parâmetros gerais</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Agenda útil = agenda − senhas reservadas (domingo: 0) · atualizado em {quando(gerais?.atualizadoEm ?? null)}
            </span>
          </div>
          {carregando && !gerais ? (
            <p className="py-6 text-center text-sm text-slate-500">Carregando…</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {CAMPOS_GERAIS.map((c) => {
                const v = txtGerais[c.k] ?? "";
                return (
                  <div key={c.k}>
                    <label htmlFor={`par-${c.k}`} className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">{c.t}</label>
                    <input id={`par-${c.k}`} inputMode="decimal" value={v}
                      onChange={(e) => setTxtGerais((t) => ({ ...t, [c.k]: e.target.value }))}
                      className={`${campo} ${marca(!!gerais && v !== paraTexto((gerais as any)[c.k], c), doTexto(v, c) == null)}`} />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* POR FLUXO */}
        <section className={painel}>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Parâmetros por fluxo</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Veículos = agenda útil × % recebimento · pallets = veículos × pallets/veículo · expedição = caixas × mix ÷ cx/pallet
            </span>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[1080px] text-xs tabular-nums border-separate border-spacing-y-1">
              <thead>
                <tr>
                  <th className={`${th} text-left rounded-l-xl`}>Fluxo</th>
                  {CAMPOS_FLUXO.map((c) => <th key={c.k} className={`${th} text-right`}>{c.t}</th>)}
                  <th className={`${th} text-right rounded-r-xl`}>Atualizado em</th>
                </tr>
              </thead>
              <tbody>
                {carregando && !fluxos.length ? (
                  <tr><td colSpan={CAMPOS_FLUXO.length + 2} className="py-10 text-center text-sm text-slate-500">Carregando…</td></tr>
                ) : (
                  categorias.map((cat) => (
                    <React.Fragment key={cat}>
                      <tr>
                        <td colSpan={CAMPOS_FLUXO.length + 2} className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                          {cat}
                        </td>
                      </tr>
                      {fluxos.filter((f) => f.categoria === cat).map((f) => {
                        const txt = txtFluxos[f.fluxo] || {};
                        return (
                          <tr key={f.fluxo} className="bg-slate-500/[0.03] dark:bg-slate-500/[0.06] hover:bg-slate-500/[0.08] dark:hover:bg-slate-500/[0.12] transition-colors">
                            <td className="px-3 py-2 text-left whitespace-nowrap rounded-l-xl font-medium text-slate-900 dark:text-slate-100">{f.nome}</td>
                            {CAMPOS_FLUXO.map((c) => {
                              const v = txt[c.k] ?? "";
                              return (
                                <td key={c.k} className="px-1.5 py-1">
                                  <input inputMode="decimal" aria-label={`${c.t} ${f.nome}`} value={v}
                                    onChange={(e) => setTxtFluxos((t) => ({ ...t, [f.fluxo]: { ...t[f.fluxo], [c.k]: e.target.value } }))}
                                    className={`${inputCel} ${marca(v !== paraTexto((f as any)[c.k], c), doTexto(v, c) == null)}`} />
                                </td>
                              );
                            })}
                            <td className="px-3 py-2 text-right whitespace-nowrap rounded-r-xl text-slate-500 dark:text-slate-400">{quando(f.atualizadoEm)}</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Percentuais em % (0 a 100). Campo em amarelo = alterado e ainda não salvo; em vermelho = valor inválido.
          </p>
        </section>
      </div>
    </div>
  );
}
