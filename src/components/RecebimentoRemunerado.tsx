import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, FileSignature, Plus, RefreshCw, Send, X, XCircle } from "lucide-react";
import { apiFetch } from "../services/api";

// ---------------------------------------------------------------------------
// Recebimento remunerado — API /api/remunerado do backend gestao-ppcp.
// Fluxo: Gestão de Abastecimento pede -> ADM aprova (pode mudar a quantidade) ou recusa -> Gestão de Abastecimento
// informa a condição especial -> Gestão Orçamentária aprova (fim) ou recusa (volta para o Abastecimento).
// Os botões de cada linha vêm do backend ("acoes"), conforme o perfil de quem está logado.
// ---------------------------------------------------------------------------

type Modo = "pendencias" | "nova" | "todas";
type Acao = "APROVAR" | "RECUSAR" | "CONDICAO" | "CANCELAR";
type Status = "AGUARDANDO_ADM" | "RECUSADA_ADM" | "CANCELADA" | "AGUARDANDO_CONDICAO" | "AGUARDANDO_ORCAMENTO" | "FINALIZADA";

interface Evento {
  acao: string;
  status: Status;
  usuario: string | null;
  perfil: string | null;
  comentario: string | null;
  veiculos: number | null;
  condicaoEspecial: string | null;
  em: string;
}

interface Solicitacao {
  id: number;
  cd: number;
  categoria: string;
  fornecedorCodigo: number;
  fornecedorNome: string;
  dataRecebimento: string;
  veiculosSolicitados: number;
  veiculosAprovados: number | null;
  status: Status;
  statusDescricao: string;
  condicaoEspecial: string | null;
  observacao: string | null;
  solicitante: string | null;
  criadoEm: string;
  atualizadoEm: string;
  acoes: Acao[];
  historico: Evento[] | null;
}

interface Props {
  modo: Modo;
  user?: { role?: string } | null;
  theme?: "light" | "dark";
  showNotification?: (msg: string) => void;
  onPageChange?: (page: string) => void;
}

/** Diálogo da ação escolhida numa linha. */
interface Dialogo {
  s: Solicitacao;
  acao: Acao;
}

const TITULOS: Record<Modo, { titulo: string; sub: string }> = {
  pendencias: { titulo: "Minhas pendências", sub: "Solicitações esperando uma ação do seu perfil." },
  nova: { titulo: "Nova solicitação", sub: "Pedido de veículos adicionais (remunerados) para um CD e dia." },
  todas: { titulo: "Todas as solicitações", sub: "Histórico completo do recebimento remunerado." },
};

const STATUS_COR: Record<Status, string> = {
  AGUARDANDO_ADM: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  AGUARDANDO_CONDICAO: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  AGUARDANDO_ORCAMENTO: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  FINALIZADA: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  RECUSADA_ADM: "bg-red-500/10 text-red-700 dark:text-red-300",
  CANCELADA: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

const NOME_ACAO_HISTORICO: Record<string, string> = {
  SOLICITADA: "Solicitada",
  APROVADA_ADM: "Aprovada pelo ADM",
  RECUSADA_ADM: "Recusada pelo ADM",
  CONDICAO_INFORMADA: "Condição especial informada",
  APROVADA_ORCAMENTO: "Aprovada pela Gestão Orçamentária",
  RECUSADA_ORCAMENTO: "Recusada pela Gestão Orçamentária",
  CANCELADA: "Cancelada",
};

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dataBR = (s?: string | null) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : "—");
const dataHoraBR = (s?: string | null) =>
  s ? new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
const nomeCategoria = (c: string) =>
  c.length <= 3 ? c : c.toLowerCase().replace(/(^|[\s/(-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());

async function chamar<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await apiFetch(`/api/remunerado${path}`, init);
  if (!r.ok) {
    let msg = r.status === 403 ? "O seu perfil não pode fazer esta ação." : `${r.status} ${r.statusText}`;
    try {
      const j = await r.json();
      msg = j.detail || j.message || j.title || msg;
    } catch {
      /* corpo vazio */
    }
    throw new Error(msg);
  }
  return (r.status === 204 ? null : await r.json()) as T;
}

export default function RecebimentoRemunerado({ modo, user, theme = "dark", showNotification, onPageChange }: Props) {
  const isDark = theme === "dark";
  const podePedir = user?.role === "admin" || user?.role === "ga";
  const [lista, setLista] = useState<Solicitacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [recarregar, setRecarregar] = useState(0);
  const [aberta, setAberta] = useState<number | null>(null);
  const [detalhes, setDetalhes] = useState<Record<number, Solicitacao>>({});
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>("");
  const [filtroCd, setFiltroCd] = useState<string>("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setLista(await chamar<Solicitacao[]>("/solicitacoes"));
      setDetalhes({});
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (modo !== "nova") void carregar();
  }, [modo, recarregar, carregar]);

  const abrir = async (s: Solicitacao) => {
    if (aberta === s.id) {
      setAberta(null);
      return;
    }
    setAberta(s.id);
    if (!detalhes[s.id]) {
      try {
        const d = await chamar<Solicitacao>(`/solicitacoes/${s.id}`);
        setDetalhes((x) => ({ ...x, [s.id]: d }));
      } catch (e: any) {
        setErro(e.message);
      }
    }
  };

  const visiveis = useMemo(() => {
    let l = modo === "pendencias" ? lista.filter((s) => s.acoes.length > 0) : lista;
    if (filtroStatus) l = l.filter((s) => s.status === filtroStatus);
    if (filtroCd) l = l.filter((s) => String(s.cd) === filtroCd);
    return l;
  }, [lista, modo, filtroStatus, filtroCd]);
  const cdsDaLista = useMemo(() => Array.from(new Set(lista.map((s) => s.cd))).sort((a, b) => a - b), [lista]);

  // ------------------------------------------------------------------ estilos (padrão das telas de Administração)
  const painel = "rounded-2xl bg-white/70 dark:bg-slate-900/60 p-5 sm:p-6 shadow-xs backdrop-blur-md transition-colors";
  const campo = "w-full h-[38px] rounded-xl bg-slate-500/5 dark:bg-slate-500/10 hover:bg-slate-500/10 dark:hover:bg-slate-500/15 px-3.5 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 transition-colors border-0";
  const rotulo = "mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300";
  const btn = "inline-flex h-8 items-center gap-1.5 rounded-xl bg-slate-500/10 hover:bg-slate-500/15 text-slate-700 dark:text-slate-200 px-3 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors";
  const btnPrimario = "inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3.5 text-xs font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors";
  const th = "px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 select-none text-left";
  const optCls = isDark ? "bg-slate-900 text-slate-100" : "";

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-5 text-slate-900 dark:text-slate-100">
      <div className="max-w-[1760px] mx-auto w-full space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Recebimento remunerado
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{TITULOS[modo].titulo}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{TITULOS[modo].sub}</p>
          </div>
          {modo !== "nova" && (
            <div className="flex items-center gap-2">
              <button type="button" className={btn} onClick={() => setRecarregar((n) => n + 1)} disabled={carregando}>
                <RefreshCw className={`h-3.5 w-3.5 ${carregando ? "animate-spin" : ""}`} /> Atualizar
              </button>
              {podePedir && (
                <button type="button" className={btnPrimario} onClick={() => onPageChange?.("remunerado/nova")}>
                  <Plus className="h-3.5 w-3.5" /> Nova solicitação
                </button>
              )}
            </div>
          )}
        </header>

        {erro && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-700 dark:text-red-300">
            <span>Erro: {erro}</span>
            <button type="button" onClick={() => setErro(null)} aria-label="Fechar" className="cursor-pointer hover:opacity-80"><X className="h-4 w-4" /></button>
          </div>
        )}

        {modo === "nova" ? (
          podePedir ? (
            <NovaSolicitacao
              painel={painel} campo={campo} rotulo={rotulo} btnPrimario={btnPrimario} optCls={optCls}
              onErro={setErro}
              onCriada={(s) => {
                showNotification?.(`✅ Solicitação nº ${s.id} enviada para aprovação do ADM`);
                onPageChange?.("remunerado/todas");
              }}
            />
          ) : (
            <section className={painel}>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Só a Gestão de Abastecimento (ou o ADM) pede recebimento remunerado. Você pode acompanhar as solicitações em "Todas as solicitações".
              </p>
            </section>
          )
        ) : (
          <section className={painel}>
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div className="w-56">
                <label htmlFor="rem-status" className={rotulo}>Situação</label>
                <select id="rem-status" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className={`${campo} cursor-pointer`}>
                  <option value="" className={optCls}>Todas</option>
                  {(Object.keys(STATUS_COR) as Status[]).map((st) => (
                    <option key={st} value={st} className={optCls}>{lista.find((s) => s.status === st)?.statusDescricao || st}</option>
                  ))}
                </select>
              </div>
              <div className="w-40">
                <label htmlFor="rem-cd" className={rotulo}>CD</label>
                <select id="rem-cd" value={filtroCd} onChange={(e) => setFiltroCd(e.target.value)} className={`${campo} cursor-pointer`}>
                  <option value="" className={optCls}>Todos</option>
                  {cdsDaLista.map((cd) => <option key={cd} value={cd} className={optCls}>CD {cd}</option>)}
                </select>
              </div>
              <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">{visiveis.length} solicitação(ões)</span>
            </div>

            <div className="overflow-auto">
              <table className="w-full min-w-[1100px] text-xs border-separate border-spacing-y-1">
                <thead>
                  <tr>
                    <th className={`${th} rounded-l-xl`}>Nº</th>
                    <th className={th}>Recebimento</th>
                    <th className={th}>CD</th>
                    <th className={th}>Categoria</th>
                    <th className={th}>Fornecedor</th>
                    <th className={`${th} text-right`}>Veículos</th>
                    <th className={th}>Situação</th>
                    <th className={th}>Condição especial</th>
                    <th className={th}>Solicitante</th>
                    <th className={`${th} text-right rounded-r-xl`}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {carregando && !lista.length ? (
                    <tr><td colSpan={10} className="py-12 text-center text-sm text-slate-500">Carregando…</td></tr>
                  ) : !visiveis.length ? (
                    <tr><td colSpan={10} className="py-12 text-center text-sm text-slate-500">
                      {modo === "pendencias" ? "Nada esperando o seu perfil agora." : "Nenhuma solicitação."}
                    </td></tr>
                  ) : (
                    visiveis.map((s) => {
                      const aprovado = s.veiculosAprovados != null && s.veiculosAprovados !== s.veiculosSolicitados;
                      const det = detalhes[s.id];
                      return (
                        <React.Fragment key={s.id}>
                          <tr className="bg-slate-500/[0.03] dark:bg-slate-500/[0.06] hover:bg-slate-500/[0.08] dark:hover:bg-slate-500/[0.12] transition-colors">
                            <td className="px-3 py-2.5 rounded-l-xl font-mono">
                              <button type="button" onClick={() => void abrir(s)} className="inline-flex items-center gap-1 cursor-pointer hover:text-blue-600" title="Ver histórico">
                                {aberta === s.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                {s.id}
                              </button>
                            </td>
                            <td className="px-3 py-2.5 font-mono whitespace-nowrap">{dataBR(s.dataRecebimento)}</td>
                            <td className="px-3 py-2.5 font-mono">{s.cd}</td>
                            <td className="px-3 py-2.5">{nomeCategoria(s.categoria)}</td>
                            <td className="px-3 py-2.5"><span className="font-mono text-slate-500">{s.fornecedorCodigo}</span> · {s.fornecedorNome}</td>
                            <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                              {aprovado ? (
                                <span title="Pedido → aprovado pelo ADM"><span className="text-slate-400 line-through">{s.veiculosSolicitados}</span> {s.veiculosAprovados}</span>
                              ) : (s.veiculosAprovados ?? s.veiculosSolicitados)}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${STATUS_COR[s.status]}`}>{s.statusDescricao}</span>
                            </td>
                            <td className="px-3 py-2.5 font-mono">{s.condicaoEspecial || "—"}</td>
                            <td className="px-3 py-2.5">{s.solicitante || "—"}</td>
                            <td className="px-3 py-2 text-right rounded-r-xl whitespace-nowrap">
                              <div className="inline-flex gap-1.5">
                                {s.acoes.includes("CONDICAO") && (
                                  <button type="button" className={btn} onClick={() => setDialogo({ s, acao: "CONDICAO" })}>
                                    <FileSignature className="h-3.5 w-3.5" /> Informar condição
                                  </button>
                                )}
                                {s.acoes.includes("APROVAR") && (
                                  <button type="button" className={`${btn} text-emerald-700 dark:text-emerald-400`} onClick={() => setDialogo({ s, acao: "APROVAR" })}>
                                    <Check className="h-3.5 w-3.5" /> Aprovar
                                  </button>
                                )}
                                {s.acoes.includes("RECUSAR") && (
                                  <button type="button" className={`${btn} text-red-600 dark:text-red-400`} onClick={() => setDialogo({ s, acao: "RECUSAR" })}>
                                    <XCircle className="h-3.5 w-3.5" /> Recusar
                                  </button>
                                )}
                                {s.acoes.includes("CANCELAR") && (
                                  <button type="button" className={btn} onClick={() => setDialogo({ s, acao: "CANCELAR" })}>
                                    Cancelar
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {aberta === s.id && (
                            <tr>
                              <td colSpan={10} className="px-4 pb-3 pt-1">
                                {s.observacao && <p className="mb-2 text-xs text-slate-600 dark:text-slate-300">Observação: {s.observacao}</p>}
                                {!det ? (
                                  <p className="text-xs text-slate-500">Carregando histórico…</p>
                                ) : (
                                  <ol className="space-y-1 border-l-2 border-slate-500/20 pl-4">
                                    {(det.historico || []).map((e, i) => (
                                      <li key={i} className="text-xs">
                                        <span className="font-mono text-slate-500">{dataHoraBR(e.em)}</span>{" · "}
                                        <span className="font-semibold">{NOME_ACAO_HISTORICO[e.acao] || e.acao}</span>
                                        {e.usuario && <> por {e.usuario}{e.perfil ? ` (${e.perfil})` : ""}</>}
                                        {e.veiculos != null && e.acao === "APROVADA_ADM" && <> · {e.veiculos} veículo(s)</>}
                                        {e.condicaoEspecial && e.acao === "CONDICAO_INFORMADA" && <> · condição {e.condicaoEspecial}</>}
                                        {e.comentario && <span className="text-slate-600 dark:text-slate-300"> — “{e.comentario}”</span>}
                                      </li>
                                    ))}
                                  </ol>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Depois da aprovação do ADM, os veículos do CD 1965 entram na Projeção de Ocupação como “remunerado” na categoria e no dia do recebimento.
            </p>
          </section>
        )}
      </div>

      {dialogo && (
        <DialogoAcao
          dialogo={dialogo}
          isDark={isDark}
          campo={campo}
          rotulo={rotulo}
          btn={btn}
          btnPrimario={btnPrimario}
          onFechar={() => setDialogo(null)}
          onFeito={(msg) => {
            setDialogo(null);
            showNotification?.(msg);
            setRecarregar((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formulário da nova solicitação
// ---------------------------------------------------------------------------
function NovaSolicitacao(p: {
  painel: string; campo: string; rotulo: string; btnPrimario: string; optCls: string;
  onErro: (m: string | null) => void;
  onCriada: (s: Solicitacao) => void;
}) {
  const hoje = iso(new Date());
  const [cds, setCds] = useState<number[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [f, setF] = useState({ cd: "1965", categoria: "", fornecedorCodigo: "", fornecedorNome: "", dataRecebimento: hoje, veiculos: "", observacao: "" });
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    chamar<number[]>("/cds").then(setCds).catch((e) => p.onErro(e.message));
  }, []);
  useEffect(() => {
    if (!f.cd) return;
    chamar<string[]>(`/categorias?cd=${f.cd}`)
      .then((c) => {
        setCategorias(c);
        setF((x) => (c.includes(x.categoria) ? x : { ...x, categoria: "" }));
      })
      .catch((e) => p.onErro(e.message));
  }, [f.cd]);

  const valido = f.cd && f.categoria && Number(f.fornecedorCodigo) > 0 && f.fornecedorNome.trim() && f.dataRecebimento >= hoje && Number(f.veiculos) > 0;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido) return;
    setEnviando(true);
    p.onErro(null);
    try {
      const s = await chamar<Solicitacao>("/solicitacoes", {
        method: "POST",
        body: JSON.stringify({
          cd: Number(f.cd),
          categoria: f.categoria,
          fornecedorCodigo: Number(f.fornecedorCodigo),
          fornecedorNome: f.fornecedorNome.trim(),
          dataRecebimento: f.dataRecebimento,
          veiculos: Number(f.veiculos),
          observacao: f.observacao.trim() || null,
        }),
      });
      p.onCriada(s);
    } catch (err: any) {
      p.onErro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className={`${p.painel} space-y-5`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label htmlFor="nr-cd" className={p.rotulo}>CD</label>
          <select id="nr-cd" value={f.cd} onChange={(e) => set("cd", e.target.value)} className={`${p.campo} cursor-pointer`}>
            {(cds.length ? cds : [1965]).map((cd) => <option key={cd} value={cd} className={p.optCls}>CD {cd}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="nr-cat" className={p.rotulo}>Categoria</label>
          <select id="nr-cat" value={f.categoria} onChange={(e) => set("categoria", e.target.value)} className={`${p.campo} cursor-pointer`}>
            <option value="" className={p.optCls}>Escolha…</option>
            {categorias.map((c) => <option key={c} value={c} className={p.optCls}>{nomeCategoria(c)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="nr-data" className={p.rotulo}>Dia do recebimento</label>
          <input id="nr-data" type="date" min={hoje} value={f.dataRecebimento} onChange={(e) => set("dataRecebimento", e.target.value)} className={p.campo} />
        </div>
        <div>
          <label htmlFor="nr-forn-cod" className={p.rotulo}>Código do fornecedor</label>
          <input id="nr-forn-cod" inputMode="numeric" value={f.fornecedorCodigo} onChange={(e) => set("fornecedorCodigo", e.target.value.replace(/\D/g, ""))} className={`${p.campo} font-mono`} />
        </div>
        <div>
          <label htmlFor="nr-forn-nome" className={p.rotulo}>Nome do fornecedor</label>
          <input id="nr-forn-nome" maxLength={150} value={f.fornecedorNome} onChange={(e) => set("fornecedorNome", e.target.value)} className={p.campo} />
        </div>
        <div>
          <label htmlFor="nr-veic" className={p.rotulo}>Quantidade de veículos</label>
          <input id="nr-veic" inputMode="numeric" value={f.veiculos} onChange={(e) => set("veiculos", e.target.value.replace(/\D/g, ""))} className={`${p.campo} font-mono`} />
        </div>
      </div>
      <div>
        <label htmlFor="nr-obs" className={p.rotulo}>Observação (opcional)</label>
        <textarea id="nr-obs" maxLength={500} rows={2} value={f.observacao} onChange={(e) => set("observacao", e.target.value)}
          className={`${p.campo} h-auto py-2.5`} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span>Depois de enviada, a solicitação vai para a aprovação do ADM, que pode mudar a quantidade ou recusar.</span>
        <button type="submit" className={p.btnPrimario} disabled={!valido || enviando}>
          <Send className="h-3.5 w-3.5" /> Enviar para aprovação
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Diálogo das ações (aprovar, recusar, condição especial, cancelar)
// ---------------------------------------------------------------------------
function DialogoAcao(p: {
  dialogo: Dialogo; isDark: boolean; campo: string; rotulo: string; btn: string; btnPrimario: string;
  onFechar: () => void;
  onFeito: (msg: string) => void;
}) {
  const { s, acao } = p.dialogo;
  const etapaAdm = s.status === "AGUARDANDO_ADM";
  const [veiculos, setVeiculos] = useState(String(s.veiculosSolicitados));
  const [texto, setTexto] = useState("");
  const [condicao, setCondicao] = useState(s.condicaoEspecial || "");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const titulo =
    acao === "APROVAR" ? (etapaAdm ? "Aprovar pedido" : "Aprovar condição especial")
      : acao === "RECUSAR" ? (etapaAdm ? "Recusar pedido" : "Recusar condição especial")
      : acao === "CONDICAO" ? "Informar condição especial" : "Cancelar solicitação";
  const aviso =
    acao === "RECUSAR" && etapaAdm ? "A solicitação é encerrada."
      : acao === "RECUSAR" ? "Volta para a Gestão de Abastecimento informar outra condição."
      : acao === "APROVAR" && etapaAdm ? "Vai para a Gestão de Abastecimento informar a condição especial."
      : acao === "APROVAR" ? "Encerra o ciclo da solicitação."
      : acao === "CONDICAO" ? "Vai para a aprovação da Gestão Orçamentária." : "A solicitação é encerrada sem aprovação.";
  const precisaTexto = acao === "RECUSAR";
  const valido = (!precisaTexto || texto.trim()) && (acao !== "CONDICAO" || condicao.trim()) && (acao !== "APROVAR" || !etapaAdm || Number(veiculos) > 0);

  const confirmar = async () => {
    setEnviando(true);
    setErro(null);
    try {
      const corpo =
        acao === "APROVAR" ? { veiculos: etapaAdm ? Number(veiculos) : null, comentario: texto.trim() || null }
          : acao === "CONDICAO" ? { condicaoEspecial: condicao.trim(), comentario: texto.trim() || null }
          : { motivo: texto.trim() || null };
      const rota = acao === "APROVAR" ? "aprovar" : acao === "RECUSAR" ? "recusar" : acao === "CONDICAO" ? "condicao" : "cancelar";
      await chamar(`/solicitacoes/${s.id}/${rota}`, { method: "POST", body: JSON.stringify(corpo) });
      p.onFeito(`✅ Solicitação nº ${s.id}: ${titulo.toLowerCase()} feito`);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={p.onFechar}>
      <div role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl p-5 shadow-2xl ${p.isDark ? "bg-slate-900 ring-1 ring-white/10" : "bg-white ring-1 ring-slate-200"}`}>
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold">{titulo}</h2>
          <button type="button" onClick={p.onFechar} aria-label="Fechar" className="cursor-pointer text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Nº {s.id} · CD {s.cd} · {nomeCategoria(s.categoria)} · {s.fornecedorNome} · {dataBR(s.dataRecebimento)}
        </p>

        <div className="space-y-4">
          {acao === "APROVAR" && etapaAdm && (
            <div>
              <label htmlFor="dlg-veic" className={p.rotulo}>Veículos aprovados (pedido: {s.veiculosSolicitados})</label>
              <input id="dlg-veic" inputMode="numeric" value={veiculos} onChange={(e) => setVeiculos(e.target.value.replace(/\D/g, ""))} className={`${p.campo} font-mono`} />
            </div>
          )}
          {acao === "CONDICAO" && (
            <div>
              <label htmlFor="dlg-cond" className={p.rotulo}>Número da condição especial</label>
              <input id="dlg-cond" maxLength={50} value={condicao} onChange={(e) => setCondicao(e.target.value)} className={`${p.campo} font-mono`} />
            </div>
          )}
          <div>
            <label htmlFor="dlg-texto" className={p.rotulo}>
              {precisaTexto ? "Motivo da recusa" : acao === "CANCELAR" ? "Motivo (opcional)" : "Comentário (opcional)"}
            </label>
            <textarea id="dlg-texto" rows={3} maxLength={500} value={texto} onChange={(e) => setTexto(e.target.value)} className={`${p.campo} h-auto py-2.5`} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{aviso}</p>
          {erro && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">{erro}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className={p.btn} onClick={p.onFechar}>Voltar</button>
          <button type="button" className={p.btnPrimario} onClick={confirmar} disabled={!valido || enviando}>
            <Check className="h-3.5 w-3.5" /> Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
