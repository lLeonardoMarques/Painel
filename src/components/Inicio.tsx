import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, type Variants } from "motion/react";
import {
  ArrowRight,
  BarChart3,
  TrendingUp,
  Clock3,
  LayoutDashboard,
  CalendarRange,
  AlertTriangle,
  Users,
  SlidersHorizontal,
  Boxes,
  RefreshCw,
  Truck,
  Package,
  PackageOpen,
  Warehouse,
  Info,
  X,
} from "lucide-react";
import { Capacidade, User } from "../types";

// ---------------------------------------------------------------------------
// Tela inicial: saudação, acesso rápido (telas mais usadas) e um "totem" por CD
// com a capacidade do dia (veículos inbound, caixas fracionadas e fechadas) e a
// ocupação atual. Usa só APIs existentes: /api/capacidades e /api/resumo.
// ---------------------------------------------------------------------------

export const PAGE_VISITS_KEY = "logistics_page_visits";
/** Filtro que a tela Capacidades aplica ao abrir (vindo do Início). */
export const FILTRO_CAPACIDADES_KEY = "capacidades_filtro_inicial";

/** Conta acessos por página (usado pelo "Acesso rápido"). */
export function registrarAcesso(page: string) {
  if (!page || page === "inicio") return;
  try {
    const raw = localStorage.getItem(PAGE_VISITS_KEY);
    const visits: Record<string, number> = raw ? JSON.parse(raw) : {};
    visits[page] = (visits[page] || 0) + 1;
    localStorage.setItem(PAGE_VISITS_KEY, JSON.stringify(visits));
  } catch {
    /* storage indisponível */
  }
}

type IconType = React.ComponentType<{ className?: string }>;

const PAGINAS: Record<string, { label: string; desc: string; icon: IconType; admin?: boolean; analise?: boolean }> = {
  capacidades: { label: "Capacidades", desc: "Capacidade diária por CD", icon: BarChart3 },
  metas: { label: "Planejamento", desc: "Metas mensais e semanais", icon: TrendingUp },
  "manhattan-capacidades": { label: "Manhattan", desc: "Grade horária do WMS", icon: Clock3 },
  "painel-gerencial": { label: "Painel Gerencial", desc: "Visão executiva", icon: LayoutDashboard, analise: true },
  "projecao-cd": { label: "Projeção de Ocupação", desc: "S&OP · CD 1965", icon: CalendarRange, analise: true },
  "alerta-categorias": { label: "Alertas de Categorias", desc: "Ruas x categorias", icon: AlertTriangle, analise: true },
  "user-control": { label: "Usuários e acessos", desc: "Aprovação de perfis", icon: Users, admin: true },
  parametros: { label: "Parâmetros", desc: "Parâmetros S&OP", icon: SlidersHorizontal, admin: true },
};
const PADRAO_RAPIDO = ["capacidades", "metas", "painel-gerencial", "manhattan-capacidades"];

const CD_LIST: { cd: string; group: "SP" | "REG" }[] = [
  { cd: "1965", group: "SP" }, { cd: "941", group: "SP" }, { cd: "7801", group: "SP" },
  { cd: "930", group: "SP" }, { cd: "1942", group: "SP" }, { cd: "409", group: "REG" },
  { cd: "1953", group: "REG" }, { cd: "1984", group: "REG" }, { cd: "1974", group: "REG" },
  { cd: "1979", group: "REG" },
];

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

interface ResumoCd {
  cd: number;
  status: string;
  percentualOcupacao: number;
  qtdLivre: number;
  qtdCapacidade?: number;
  qtdOcupada?: number;
  qtdBloqueada?: number;
  subCategoriasAcimaLimite?: any[];
}

interface Totem {
  cd: string;
  group: "SP" | "REG";
  temDados: boolean;
  veiculos: number;
  remunerado: number;
  fracionadas: number;
  fechadas: number;
  ocupacao: number | null;
  livres: number | null;
  status: "NORMAL" | "ATENCAO" | "CRITICO" | null;
}

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const fmt = (v: number) => Math.round(v).toLocaleString("pt-BR");
const isoHoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const normStatus = (s?: string): Totem["status"] => {
  const v = (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  if (v.startsWith("CRIT")) return "CRITICO";
  if (v.startsWith("ATEN")) return "ATENCAO";
  if (v) return "NORMAL";
  return null;
};
// Faixas de ocupação do CD: até 70% Normal (verde) · de 71% a 89% Atenção (amarelo) · 90% ou mais Crítico (vermelho)
const LIMITE_NORMAL = 70;
const LIMITE_CRITICO = 90;
const statusPorOcupacao = (p: number): "NORMAL" | "ATENCAO" | "CRITICO" =>
  p >= LIMITE_CRITICO ? "CRITICO" : p > LIMITE_NORMAL ? "ATENCAO" : "NORMAL";
const corOcupacao = (p: number) =>
  ({ CRITICO: "bg-rose-500", ATENCAO: "bg-amber-500", NORMAL: "bg-emerald-500" })[statusPorOcupacao(p)];
const textoOcupacao = (p: number) =>
  ({
    CRITICO: "text-rose-600 dark:text-rose-400",
    ATENCAO: "text-amber-600 dark:text-amber-400",
    NORMAL: "text-emerald-600 dark:text-emerald-400",
  })[statusPorOcupacao(p)];

const STATUS_UI: Record<NonNullable<Totem["status"]>, { label: string; dot: string; text: string }> = {
  NORMAL: { label: "Normal", dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
  ATENCAO: { label: "Atenção", dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" },
  CRITICO: { label: "Crítico", dot: "bg-rose-500", text: "text-rose-700 dark:text-rose-400" },
};

interface InicioProps {
  user: User;
  theme?: "light" | "dark";
  onPageChange: (page: string) => void;
}

export default function Inicio({ user, onPageChange }: InicioProps) {
  const [capacidades, setCapacidades] = useState<Capacidade[]>([]);
  const [resumo, setResumo] = useState<ResumoCd[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);
  const [grupo, setGrupo] = useState<"SP" | "REG">(() => {
    try {
      return localStorage.getItem("logistics_inicio_grupo") === "REG" ? "REG" : "SP";
    } catch {
      return "SP";
    }
  });
  const hoje = isoHoje();
  const [detalhe, setDetalhe] = useState<{ cd: string; origem: { x: number; y: number } } | null>(null);
  const detalheCd = detalhe?.cd ?? null;

  /** Abre Capacidades já filtrada pelo CD escolhido (a tela lê o filtro ao abrir). */
  const abrirCapacidades = (cd: string) => {
    try {
      // CD escolhido + mês atual (formato AAAA-MM, o mesmo do filtro "Competência")
      sessionStorage.setItem(FILTRO_CAPACIDADES_KEY, JSON.stringify({ cd, mes: hoje.slice(0, 7) }));
    } catch {
      /* storage indisponível */
    }
    onPageChange("capacidades");
  };

  const carregar = useCallback(async () => {
    setCarregando(true);
    const headers: Record<string, string> = { Accept: "application/json" };
    if (user?.token) headers.Authorization = `Bearer ${user.token}`;
    // cada fonte carrega e falha de forma independente
    const [cap, res] = await Promise.allSettled([
      fetch("/api/capacidades", { headers, signal: AbortSignal.timeout(10000) }).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
      fetch("/api/resumo", { headers, signal: AbortSignal.timeout(10000) }).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
    ]);
    if (cap.status === "fulfilled" && Array.isArray(cap.value)) setCapacidades(cap.value);
    if (res.status === "fulfilled" && Array.isArray(res.value)) setResumo(res.value);
    setAtualizadoEm(new Date());
    setCarregando(false);
  }, [user?.token]);

  useEffect(() => {
    void carregar();
    const id = setInterval(() => void carregar(), 60000);
    return () => clearInterval(id);
  }, [carregar]);

  useEffect(() => {
    try {
      localStorage.setItem("logistics_inicio_grupo", grupo);
    } catch {
      /* storage indisponível */
    }
  }, [grupo]);

  // ---------------------------------------------------------- totens por CD
  const totens: Totem[] = useMemo(() => {
    return CD_LIST.map(({ cd, group }) => {
      const doDia = capacidades.filter((c) => String(c.cd) === cd && c.dataMovimentacao?.startsWith(hoje));
      const r = resumo.find((x) => String(x.cd) === cd);
      return {
        cd,
        group,
        temDados: doDia.length > 0,
        veiculos: doDia.reduce((s, c) => s + n(c.capacidadeInbound), 0),
        remunerado: doDia.reduce((s, c) => s + n(c.recebimentoRemunerado), 0),
        fracionadas: doDia.reduce((s, c) => s + n(c.capacidadeOutboundFracionado), 0),
        fechadas: doDia.reduce((s, c) => s + n(c.capacidadeOutboundFechado), 0),
        ocupacao: r ? n(r.percentualOcupacao) : null,
        livres: r ? n(r.qtdLivre) : null,
        // o status segue as faixas de ocupação (e não o status enviado pela API)
        status: r ? statusPorOcupacao(n(r.percentualOcupacao)) : null,
      };
    });
  }, [capacidades, resumo, hoje]);

  const visiveis = totens.filter((t) => t.group === grupo);
  const totais = visiveis.reduce(
    (a, t) => ({ v: a.v + t.veiculos + t.remunerado, fr: a.fr + t.fracionadas, fe: a.fe + t.fechadas }),
    { v: 0, fr: 0, fe: 0 }
  );
  const emAtencao = totens.filter((t) => t.status === "ATENCAO" || t.status === "CRITICO").length;

  // ---------------------------------------------------------- acesso rápido (mais usados)
  const rapidos = useMemo(() => {
    let visits: Record<string, number> = {};
    try {
      visits = JSON.parse(localStorage.getItem(PAGE_VISITS_KEY) || "{}");
    } catch {
      /* ignora */
    }
    const permitido = (id: string) => {
      const p = PAGINAS[id];
      if (!p) return false;
      if (p.admin && user?.role !== "admin") return false;
      if (p.analise && user?.role === "ga") return false;
      return true;
    };
    const maisUsados = Object.entries(visits)
      .filter(([id]) => permitido(id))
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);
    const lista = [...maisUsados, ...PADRAO_RAPIDO.filter((id) => permitido(id) && !maisUsados.includes(id))];
    return lista.slice(0, 4).map((id) => ({ id, ...PAGINAS[id], acessos: visits[id] || 0 }));
  }, [user?.role]);

  // ---------------------------------------------------------- saudação
  const agora = new Date();
  const h = agora.getHours();
  const saudacao = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const primeiroNome = String(user?.name || user?.username || "").split(/\s+/)[0];
  const dataLonga = agora.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-5 text-slate-900 dark:text-slate-100">
      <div className="max-w-[1760px] mx-auto w-full space-y-4 sm:space-y-5">
        {/* SAUDAÇÃO */}
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              {dataLonga}
            </p>
            <h1 className="mt-1 text-xl sm:text-2xl font-semibold tracking-tight truncate">
              {saudacao}
              {primeiroNome ? `, ${primeiroNome}` : ""}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {emAtencao > 0
                ? `${emAtencao} CD${emAtencao > 1 ? "s" : ""} em atenção hoje. O resumo de cada um está abaixo.`
                : "Este é o resumo da operação de hoje por centro de distribuição."}
            </p>

            
          </div>
          <button
            type="button"
            onClick={() => void carregar()}
            disabled={carregando}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-500/10 hover:bg-slate-500/15 text-slate-700 dark:text-slate-200 px-3.5 text-xs font-semibold disabled:opacity-60 cursor-pointer transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${carregando ? "animate-spin" : ""}`} />
            {atualizadoEm ? `Atualizado às ${atualizadoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Atualizar"}
          </button>
        </header>

        {/* ACESSO RÁPIDO */}
        <section>
          <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Acesso rápido</h2>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            {rapidos.map((p, i) => (
              <motion.button
                key={p.id}
                type="button"
                onClick={() => onPageChange(p.id)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
                className="group flex items-center gap-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 p-3 text-left shadow-xs backdrop-blur-md ring-1 ring-transparent hover:ring-blue-500/30 hover:bg-white dark:hover:bg-slate-900/80 transition-all cursor-pointer"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-300 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                  <p.icon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{p.label}</span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{p.desc}</span>
                </span>
                <ArrowRight className="hidden sm:block h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
              </motion.button>
            ))}
          </div>
        </section>

        {/* TOTENS POR CD */}
        <section className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Hoje por CD</h2>
              <div className="inline-flex p-1 rounded-xl bg-slate-500/10 dark:bg-slate-500/15" role="tablist" aria-label="Região">
                {(["SP", "REG"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    role="tab"
                    aria-selected={grupo === g}
                    onClick={() => setGrupo(g)}
                    className={`px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      grupo === g
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    {g === "SP" ? "São Paulo" : "Regionais"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              <span>Total <strong className="ml-1 font-mono text-sm text-slate-900 dark:text-slate-100">{fmt(totais.v)}</strong> veículos</span>
              <span><strong className="font-mono text-sm text-slate-900 dark:text-slate-100">{fmt(totais.fr)}</strong> cx fracionadas</span>
              <span><strong className="font-mono text-sm text-slate-900 dark:text-slate-100">{fmt(totais.fe)}</strong> cx fechadas</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {visiveis.map((t, i) => (
              <TotemCd key={t.cd} t={t} index={i} carregando={carregando && capacidades.length === 0}
                onOpen={() => abrirCapacidades(t.cd)} onDetalhes={(origem) => setDetalhe({ cd: t.cd, origem })} />
            ))}
          </div>

          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            Capacidades planejadas para {new Date(`${hoje}T12:00:00`).toLocaleDateString("pt-BR")} · ocupação do último fechamento.
          </p>
        </section>
      </div>

      <AnimatePresence>
        {detalheCd && (
          <DetalheCd
            cd={detalheCd}
            capacidades={capacidades}
            resumo={resumo.find((r) => String(r.cd) === detalheCd)}
            hoje={hoje}
            atualizadoEm={atualizadoEm}
            origem={detalhe!.origem}
            onClose={() => setDetalhe(null)}
            onVerCapacidades={() => {
              const cd = detalheCd!;
              setDetalhe(null);
              abrirCapacidades(cd);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TOTEM: cabeça (identificação do CD) + corpo (indicadores do dia)
// ---------------------------------------------------------------------------
function TotemCd({ t, index, carregando, onOpen, onDetalhes }: { t: Totem; index: number; carregando: boolean; onOpen: () => void; onDetalhes: (origem: { x: number; y: number }) => void }) {
  const st = t.status ? STATUS_UI[t.status] : null;
  const cats = CATEGORIAS_POR_CD[t.cd] || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25, ease: "easeOut" }}
      whileHover={{ y: -3 }}
      className="group flex flex-col gap-2 text-left"
      aria-label={`CD ${t.cd}`}
      role="group"
    >
      {/* CABEÇA */}
      <div className="flex items-center gap-2.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 px-3 py-2.5 shadow-xs backdrop-blur-md ring-1 ring-transparent transition-all group-hover:ring-blue-500/30 group-focus-visible:ring-2 group-focus-visible:ring-blue-500">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-500/10 text-slate-500 dark:text-slate-400 transition-colors group-hover:bg-blue-600 group-hover:text-white">
          <Warehouse className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="whitespace-nowrap font-mono text-base font-bold leading-tight tracking-tight">CD {t.cd}</p>
          <p className="flex items-center gap-1.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
            {st ? (
              <>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${st.dot} ${t.status !== "NORMAL" ? "animate-pulse" : ""}`} />
                <span className={`font-semibold ${st.text}`}>{st.label}</span>
                <span className="text-slate-400">·</span>
              </>
            ) : null}
            {t.group === "SP" ? "São Paulo" : "Regional"}
          </p>
        </div>
      </div>

      {/* CORPO */}
      <div className="flex flex-1 flex-col rounded-2xl bg-white/70 dark:bg-slate-900/60 p-3 shadow-xs backdrop-blur-md ring-1 ring-transparent transition-all group-hover:ring-blue-500/30">
        {carregando ? (
          <div className="space-y-4 animate-pulse">
            {[0, 1, 2].map((k) => (
              <div key={k}>
                <div className="h-3 w-24 rounded bg-slate-500/15" />
                <div className="mt-2 h-6 w-20 rounded bg-slate-500/15" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <Metrica icon={Truck} label="Veículos inbound" valor={t.temDados ? fmt(t.veiculos + t.remunerado) : "—"}
              nota={t.remunerado > 0 ? `+${fmt(t.remunerado)} remunerados` : undefined} destaque />
            <div className="my-2 h-px bg-slate-500/10" />
            <Metrica icon={Package} label="Caixas fracionadas" valor={t.temDados ? fmt(t.fracionadas) : "—"} />
            <div className="my-2 h-px bg-slate-500/10" />
            <Metrica icon={PackageOpen} label="Caixas fechadas" valor={t.temDados ? fmt(t.fechadas) : "—"} />
            <div className="my-2 h-px bg-slate-500/10" />

            {/* OCUPAÇÃO */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Boxes className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                Ocupação
              </div>
              {t.ocupacao != null ? (
                <>
                  <div className={`mt-1 font-mono text-lg font-bold tabular-nums ${textoOcupacao(t.ocupacao)}`}>
                    {t.ocupacao.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-500/15">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, t.ocupacao)}%` }}
                      transition={{ delay: 0.2 + index * 0.05, duration: 0.6, ease: "easeOut" }}
                      className={`h-full rounded-full ${corOcupacao(t.ocupacao)}`}
                    />
                  </div>
                  {t.livres != null && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{fmt(t.livres)} posições livres</p>}
                </>
              ) : (
                <div className="mt-1 font-mono text-lg font-bold text-slate-300 dark:text-slate-600">—</div>
              )}
            </div>

            {/* RODAPÉ */}
            <div className="mt-auto pt-3">
              <div className="flex flex-wrap gap-1">
                {cats.map((c) => (
                  <span key={c} className="rounded-md bg-slate-500/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                    {c}
                  </span>
                ))}
              </div>
              {!t.temDados && <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">Sem capacidade cadastrada para hoje</p>}
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={onOpen}
                  className="group/link flex items-center gap-1 rounded-md text-xs font-semibold text-slate-400 transition-colors hover:text-blue-600 dark:hover:text-blue-400 focus-visible:outline-2 focus-visible:outline-blue-500 cursor-pointer"
                >
                  Ver capacidades <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-0.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    onDetalhes({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
                  }}
                  aria-label={`Detalhes do CD ${t.cd}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-500/10 px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-blue-600 hover:text-white dark:text-slate-300 focus-visible:outline-2 focus-visible:outline-blue-500 cursor-pointer"
                >
                  <Info className="h-3.5 w-3.5" />
                  Detalhes
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

function Metrica({ icon: Icon, label, valor, nota, destaque }: { icon: IconType; label: string; valor: string; nota?: string; destaque?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
        {label}
      </div>
      <div className={`mt-1 font-mono font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-100 ${destaque ? "text-xl" : "text-lg"}`}>{valor}</div>
      {nota && <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">{nota}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DETALHES DO CD: painel sobre a tela (fundo desfocado) com o resumo completo,
// dividido por categoria quando o CD opera mais de uma.
// ---------------------------------------------------------------------------
interface DetalheCdProps {
  cd: string;
  capacidades: Capacidade[];
  resumo: ResumoCd | undefined;
  hoje: string;
  atualizadoEm: Date | null;
  origem: { x: number; y: number };
  onClose: () => void;
  onVerCapacidades: () => void;
}

/** Número que conta do zero até o valor ao aparecer (efeito discreto, 0,7s). */
function Contador({ valor, formato = fmt }: { valor: number; formato?: (v: number) => string }) {
  const [atual, setAtual] = useState(0);
  useEffect(() => {
    let raf = 0;
    const inicio = performance.now();
    const dur = 700;
    const passo = (t: number) => {
      const k = Math.min(1, (t - inicio) / dur);
      setAtual(valor * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [valor]);
  return <>{formato(atual)}</>;
}

// entrada em sequência das seções do painel
const secao: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.18 + i * 0.07, duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } }),
};

function DetalheCd({ cd, capacidades, resumo, hoje, atualizadoEm, origem, onClose, onVerCapacidades }: DetalheCdProps) {
  const fechar = useRef<HTMLButtonElement>(null);
  const grupoCd = CD_LIST.find((c) => c.cd === cd)?.group;
  const st = resumo ? STATUS_UI[statusPorOcupacao(n(resumo.percentualOcupacao))] : null;

  // Esc fecha e o foco vai para o botão de fechar ao abrir
  useEffect(() => {
    fechar.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const doCd = useMemo(() => capacidades.filter((c) => String(c.cd) === cd), [capacidades, cd]);
  const doDia = doCd.filter((c) => c.dataMovimentacao?.startsWith(hoje));

  // categorias: as que vêm da API no dia + as cadastradas para o CD (para mostrar também as sem capacidade)
  const categorias = useMemo(() => {
    const nomes = Array.from(new Set([...(CATEGORIAS_POR_CD[cd] || []), ...doDia.map((c) => c.categoria).filter(Boolean)]));
    return nomes.map((nome) => {
      const itens = doDia.filter((c) => c.categoria === nome);
      return {
        nome,
        temDados: itens.length > 0,
        veiculos: itens.reduce((s, c) => s + n(c.capacidadeInbound), 0),
        remunerado: itens.reduce((s, c) => s + n(c.recebimentoRemunerado), 0),
        fracionadas: itens.reduce((s, c) => s + n(c.capacidadeOutboundFracionado), 0),
        fechadas: itens.reduce((s, c) => s + n(c.capacidadeOutboundFechado), 0),
      };
    });
  }, [cd, doDia]);

  const total = categorias.reduce(
    (a, c) => ({ v: a.v + c.veiculos, r: a.r + c.remunerado, fr: a.fr + c.fracionadas, fe: a.fe + c.fechadas }),
    { v: 0, r: 0, fr: 0, fe: 0 }
  );
  const multi = categorias.length > 1;

  // próximos 7 dias do CD (todas as categorias somadas)
  const proximos = useMemo(() => {
    const porDia: Record<string, { v: number; fr: number; fe: number }> = {};
    doCd.forEach((c) => {
      const d = c.dataMovimentacao?.slice(0, 10);
      if (!d || d < hoje) return;
      porDia[d] = porDia[d] || { v: 0, fr: 0, fe: 0 };
      porDia[d].v += n(c.capacidadeInbound) + n(c.recebimentoRemunerado);
      porDia[d].fr += n(c.capacidadeOutboundFracionado);
      porDia[d].fe += n(c.capacidadeOutboundFechado);
    });
    return Object.keys(porDia).sort().slice(0, 7).map((d) => ({ data: d, ...porDia[d] }));
  }, [doCd, hoje]);
  const maxProx = Math.max(1, ...proximos.map((p) => p.fr + p.fe));

  const ocup = resumo ? n(resumo.percentualOcupacao) : null;
  const dataLabel = (iso: string) => {
    const d = new Date(`${iso}T12:00:00`);
    return `${d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")} ${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
  };

  const tile = "rounded-2xl bg-slate-500/[0.05] dark:bg-white/[0.04] p-4";
  const th = "px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400";

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6"
      initial={{ opacity: 1 }}
      exit={{ opacity: 1, transition: { duration: 0.35 } }}
    >
      {/* fundo desfocado */}
      <motion.div
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        onClick={onClose}
        aria-hidden
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="detalhe-cd-titulo"
        // o painel nasce do botão "Detalhes" clicado e volta para ele ao fechar
        initial={{ opacity: 0, scale: 0.35, x: origem.x - window.innerWidth / 2, y: origem.y - window.innerHeight / 2, filter: "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, x: 0, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.35, x: origem.x - window.innerWidth / 2, y: origem.y - window.innerHeight / 2, filter: "blur(6px)" }}
        transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.9 }}
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white/95 text-slate-900 shadow-2xl ring-1 ring-slate-900/5 dark:bg-slate-900/95 dark:text-slate-100 dark:ring-white/10"
      >
        {/* CABEÇALHO */}
        <header className="flex items-start gap-4 border-b border-slate-500/10 px-5 py-4 sm:px-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-600/25">
            <Warehouse className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="detalhe-cd-titulo" className="font-mono text-xl font-bold tracking-tight">CD {cd}</h2>
              {st && (
                <span className={`inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-2 py-0.5 text-[11px] font-semibold ${st.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                  {st.label}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
              {grupoCd === "SP" ? "São Paulo" : "Regional"} · {categorias.length} categoria{categorias.length > 1 ? "s" : ""} · capacidade de{" "}
              {new Date(`${hoje}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <button
            ref={fechar}
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes"
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-500/10 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* CONTEÚDO */}
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
          {/* TOTAIS DO CD */}
          <motion.section className="grid grid-cols-2 gap-3 md:grid-cols-4" variants={secao} initial="hidden" animate="show" custom={0}>
            <div className={tile}>
              <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"><Truck className="h-3.5 w-3.5" />Veículos inbound</p>
              <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums">{doDia.length ? <Contador valor={total.v + total.r} /> : "—"}</p>
              {total.r > 0 && <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">+{fmt(total.r)} remunerados</p>}
            </div>
            <div className={tile}>
              <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"><Package className="h-3.5 w-3.5" />Caixas fracionadas</p>
              <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums">{doDia.length ? <Contador valor={total.fr} /> : "—"}</p>
            </div>
            <div className={tile}>
              <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"><PackageOpen className="h-3.5 w-3.5" />Caixas fechadas</p>
              <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums">{doDia.length ? <Contador valor={total.fe} /> : "—"}</p>
            </div>
            <div className={tile}>
              <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"><Boxes className="h-3.5 w-3.5" />Ocupação</p>
              {ocup != null ? (
                <>
                  <p className={`mt-1.5 font-mono text-2xl font-bold tabular-nums ${textoOcupacao(ocup)}`}>
                    <Contador valor={ocup} formato={(v) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`} />
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-500/15">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, ocup)}%` }} transition={{ delay: 0.15, duration: 0.6 }}
                      className={`h-full rounded-full ${corOcupacao(ocup)}`} />
                  </div>
                </>
              ) : (
                <p className="mt-1.5 font-mono text-2xl font-bold text-slate-300 dark:text-slate-600">—</p>
              )}
            </div>
          </motion.section>

          {/* POR CATEGORIA */}
          <motion.section variants={secao} initial="hidden" animate="show" custom={1}>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {multi ? "Por categoria" : "Categoria"}
              </h3>
              {!multi && <span className="text-xs text-slate-500 dark:text-slate-400">Este CD opera uma única categoria.</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-separate border-spacing-y-1 text-left text-sm">
                <thead>
                  <tr>
                    <th className={`${th} rounded-l-xl`}>Categoria</th>
                    <th className={`${th} text-right`}>Veículos</th>
                    <th className={`${th} text-right`}>Remunerados</th>
                    <th className={`${th} text-right`}>Cx fracionadas</th>
                    <th className={`${th} text-right`}>Cx fechadas</th>
                    {multi && <th className={`${th} w-40 rounded-r-xl`}>Participação (cx)</th>}
                  </tr>
                </thead>
                <tbody className="font-mono tabular-nums">
                  {categorias.map((c, i) => {
                    const part = total.fr + total.fe > 0 ? ((c.fracionadas + c.fechadas) / (total.fr + total.fe)) * 100 : 0;
                    return (
                      <motion.tr
                        key={c.nome}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 + i * 0.05 }}
                        className="bg-slate-500/[0.04] dark:bg-white/[0.03]"
                      >
                        <td className="rounded-l-xl px-3 py-2.5 font-sans font-semibold">
                          {c.nome}
                          {!c.temDados && <span className="ml-2 font-sans text-[11px] font-normal text-amber-600 dark:text-amber-400">sem capacidade no dia</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right">{c.temDados ? fmt(c.veiculos) : "—"}</td>
                        <td className="px-3 py-2.5 text-right text-emerald-600 dark:text-emerald-400">{c.temDados && c.remunerado > 0 ? `+${fmt(c.remunerado)}` : "—"}</td>
                        <td className="px-3 py-2.5 text-right">{c.temDados ? fmt(c.fracionadas) : "—"}</td>
                        <td className={`px-3 py-2.5 text-right ${multi ? "" : "rounded-r-xl"}`}>{c.temDados ? fmt(c.fechadas) : "—"}</td>
                        {multi && (
                          <td className="rounded-r-xl px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-500/15">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${part}%` }} transition={{ delay: 0.15 + i * 0.05, duration: 0.5 }}
                                  className="h-full rounded-full bg-blue-500" />
                              </div>
                              <span className="w-9 text-right text-[11px] text-slate-500 dark:text-slate-400">{Math.round(part)}%</span>
                            </div>
                          </td>
                        )}
                      </motion.tr>
                    );
                  })}
                  {multi && (
                    <tr className="bg-slate-500/[0.09] dark:bg-white/[0.06] font-semibold">
                      <td className="rounded-l-xl px-3 py-2.5 font-sans text-[11px] uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">Total do CD</td>
                      <td className="px-3 py-2.5 text-right">{fmt(total.v)}</td>
                      <td className="px-3 py-2.5 text-right text-emerald-600 dark:text-emerald-400">{total.r > 0 ? `+${fmt(total.r)}` : "—"}</td>
                      <td className="px-3 py-2.5 text-right">{fmt(total.fr)}</td>
                      <td className="px-3 py-2.5 text-right">{fmt(total.fe)}</td>
                      <td className="rounded-r-xl px-3 py-2.5 text-[11px] text-slate-500">100%</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.section>

          <motion.div className="grid gap-6 md:grid-cols-5" variants={secao} initial="hidden" animate="show" custom={2}>
            {/* PRÓXIMOS DIAS */}
            <section className="md:col-span-3">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Próximos dias</h3>
              {proximos.length === 0 ? (
                <p className="rounded-2xl bg-slate-500/[0.05] px-4 py-6 text-center text-sm text-slate-500">Sem capacidades cadastradas a partir de hoje.</p>
              ) : (
                <div className="space-y-1">
                  {proximos.map((p) => (
                    <div key={p.data} className={`grid grid-cols-[72px_1fr_auto] items-center gap-3 rounded-xl px-3 py-2 ${p.data === hoje ? "bg-blue-500/10" : "bg-slate-500/[0.04] dark:bg-white/[0.03]"}`}>
                      <span className={`text-xs font-medium capitalize ${p.data === hoje ? "text-blue-700 dark:text-blue-300" : "text-slate-600 dark:text-slate-300"}`}>
                        {p.data === hoje ? "Hoje" : dataLabel(p.data)}
                      </span>
                      <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-500/15" title={`${fmt(p.fr)} fracionadas · ${fmt(p.fe)} fechadas`}>
                        <div className="h-full bg-blue-500" style={{ width: `${(p.fr / maxProx) * 100}%` }} />
                        <div className="h-full bg-sky-300 dark:bg-sky-700" style={{ width: `${(p.fe / maxProx) * 100}%` }} />
                      </div>
                      <span className="whitespace-nowrap font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                        <strong className="text-slate-900 dark:text-slate-100">{fmt(p.v)}</strong> veíc · {fmt(p.fr + p.fe)} cx
                      </span>
                    </div>
                  ))}
                  <p className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />fracionadas</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-300 dark:bg-sky-700" />fechadas</span>
                  </p>
                </div>
              )}
            </section>

            {/* ARMAZENAGEM */}
            <section className="md:col-span-2">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Armazenagem</h3>
              {resumo ? (
                <dl className="divide-y divide-slate-500/10 rounded-2xl bg-slate-500/[0.04] px-4 dark:bg-white/[0.03]">
                  {[
                    ["Capacidade", resumo.qtdCapacidade],
                    ["Ocupadas", resumo.qtdOcupada],
                    ["Bloqueadas", resumo.qtdBloqueada],
                    ["Livres", resumo.qtdLivre],
                  ]
                    .filter(([, v]) => v != null)
                    .map(([k, v]) => (
                      <div key={k as string} className="flex items-center justify-between py-2.5 text-sm">
                        <dt className="text-slate-500 dark:text-slate-400">{k}</dt>
                        <dd className="font-mono font-semibold tabular-nums">{fmt(n(v))}</dd>
                      </div>
                    ))}
                </dl>
              ) : (
                <p className="rounded-2xl bg-slate-500/[0.05] px-4 py-6 text-center text-sm text-slate-500">Sem dados de ocupação.</p>
              )}
              {resumo?.subCategoriasAcimaLimite && resumo.subCategoriasAcimaLimite.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">Subcategorias acima do limite</p>
                  <div className="flex flex-wrap gap-1">
                    {resumo.subCategoriasAcimaLimite.slice(0, 8).map((s, i) => (
                      <span key={i} className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-800 dark:text-amber-300">
                        {typeof s === "string" ? s : s?.nome || s?.subCategoria || s?.descricao || JSON.stringify(s)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </motion.div>
        </div>

        {/* RODAPÉ */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-500/10 px-5 py-3 sm:px-6">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Capacidades planejadas · ocupação do último fechamento
            {atualizadoEm ? ` · atualizado às ${atualizadoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="h-9 rounded-xl bg-slate-500/10 px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-500/15 dark:text-slate-200 cursor-pointer">
              Fechar
            </button>
            <button type="button" onClick={onVerCapacidades}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 cursor-pointer">
              Ver capacidades do CD {cd} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </footer>
      </motion.div>
    </motion.div>
  );
}
