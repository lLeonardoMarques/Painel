import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  BarChart3,
  TrendingUp,
  Clock3,
  LayoutDashboard,
  CalendarRange,
  AlertTriangle,
  Users,
  ClipboardCheck,
  Boxes,
  RefreshCw,
  Truck,
  Package,
  PackageOpen,
  Warehouse,
} from "lucide-react";
import { Capacidade, User } from "../types";

// ---------------------------------------------------------------------------
// Tela inicial: saudação, acesso rápido (telas mais usadas) e um "totem" por CD
// com a capacidade do dia (veículos inbound, caixas fracionadas e fechadas) e a
// ocupação atual. Usa só APIs existentes: /api/capacidades e /api/resumo.
// ---------------------------------------------------------------------------

export const PAGE_VISITS_KEY = "logistics_page_visits";

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
  "lancar-realizado": { label: "Lançar realizado", desc: "Realizado S&OP", icon: ClipboardCheck, admin: true },
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
}

interface Totem {
  cd: string;
  group: "SP" | "REG";
  temDados: boolean;
  temReal: boolean;
  veiculos: number;
  remunerado: number;
  fracionadas: number;
  fechadas: number;
  realVeiculos: number;
  realFracionadas: number;
  realFechadas: number;
  ocupacao: number | null;
  livres: number | null;
  status: "NORMAL" | "ATENCAO" | "CRITICO" | null;
}

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const fmt = (v: number) => Math.round(v).toLocaleString("pt-BR");
const isoDia = (deslocamento = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + deslocamento);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const normStatus = (s?: string): Totem["status"] => {
  const v = (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  if (v.startsWith("CRIT")) return "CRITICO";
  if (v.startsWith("ATEN")) return "ATENCAO";
  if (v) return "NORMAL";
  return null;
};
const corOcupacao = (p: number) => (p >= 95 ? "bg-rose-500" : p >= 85 ? "bg-amber-500" : "bg-emerald-500");
const textoOcupacao = (p: number) =>
  p >= 95 ? "text-rose-600 dark:text-rose-400" : p >= 85 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-slate-100";

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
  const [dia, setDia] = useState<"hoje" | "ontem">("hoje");
  const hoje = isoDia(dia === "hoje" ? 0 : -1);

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
      // /api/capacidades também traz o realizado do dia: realizadoInbound, realizadoFracionado e realizadoFechada
      const doDia = capacidades.filter((c) => String(c.cd) === cd && c.dataMovimentacao?.startsWith(hoje)) as (Capacidade & Record<string, any>)[];
      const r = resumo.find((x) => String(x.cd) === cd);
      const temReal = doDia.some((c) => c.realizadoInbound != null || c.realizadoFracionado != null || c.realizadoFechada != null);
      return {
        cd,
        group,
        temDados: doDia.length > 0,
        temReal,
        realVeiculos: doDia.reduce((s, c) => s + n(c.realizadoInbound), 0),
        realFracionadas: doDia.reduce((s, c) => s + n(c.realizadoFracionado), 0),
        realFechadas: doDia.reduce((s, c) => s + n(c.realizadoFechada), 0),
        veiculos: doDia.reduce((s, c) => s + n(c.capacidadeInbound), 0),
        remunerado: doDia.reduce((s, c) => s + n(c.recebimentoRemunerado), 0),
        fracionadas: doDia.reduce((s, c) => s + n(c.capacidadeOutboundFracionado), 0),
        fechadas: doDia.reduce((s, c) => s + n(c.capacidadeOutboundFechado), 0),
        ocupacao: r ? n(r.percentualOcupacao) : null,
        livres: r ? n(r.qtdLivre) : null,
        status: r ? normStatus(r.status) : null,
      };
    });
  }, [capacidades, resumo, hoje]);

  const visiveis = totens.filter((t) => t.group === grupo);
  const totais = visiveis.reduce(
    (a, t) => ({
      v: a.v + t.veiculos + t.remunerado, fr: a.fr + t.fracionadas, fe: a.fe + t.fechadas,
      rv: a.rv + t.realVeiculos, rfr: a.rfr + t.realFracionadas, rfe: a.rfe + t.realFechadas,
    }),
    { v: 0, fr: 0, fe: 0, rv: 0, rfr: 0, rfe: 0 }
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

  const segBtn = (ativo: boolean) =>
    `px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
      ativo
        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
    }`;

  return (
    // Tela inteira sem rolagem em desktop/notebook: tudo se ajusta à altura disponível.
    <div className="w-full flex-1 flex flex-col min-h-0 overflow-y-auto lg:overflow-hidden p-4 lg:p-5 xl:p-6 text-slate-900 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-[1600px] min-h-0 flex-1 flex-col gap-4 [@media(min-height:860px)]:gap-5">
        {/* SAUDAÇÃO + ACESSO RÁPIDO */}
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{dataLonga}</p>
            <h1 className="text-2xl font-semibold tracking-tight [@media(min-height:860px)]:text-3xl">
              {saudacao}
              {primeiroNome ? `, ${primeiroNome}` : ""}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 [@media(min-height:860px)]:text-sm">
              {emAtencao > 0
                ? `${emAtencao} CD${emAtencao > 1 ? "s" : ""} em atenção hoje.`
                : "Operação sem CDs em atenção hoje."}
            </p>
          </div>

          <nav aria-label="Acesso rápido" className="flex flex-wrap items-center gap-2">
            <span className="mr-1 hidden text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 xl:inline">Acesso rápido</span>
            {rapidos.map((p, i) => (
              <motion.button
                key={p.id}
                type="button"
                onClick={() => onPageChange(p.id)}
                title={p.desc}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
                className="group flex items-center gap-2 rounded-xl bg-white/70 dark:bg-slate-900/60 py-1.5 pl-1.5 pr-3 shadow-xs backdrop-blur-md ring-1 ring-transparent hover:ring-blue-500/30 transition-all cursor-pointer"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-300 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                  <p.icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs font-semibold">{p.label}</span>
              </motion.button>
            ))}
          </nav>
        </header>

        {/* BARRA DOS TOTENS */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex p-1 rounded-xl bg-slate-500/10 dark:bg-slate-500/15" role="tablist" aria-label="Região">
              {(["SP", "REG"] as const).map((g) => (
                <button key={g} type="button" role="tab" aria-selected={grupo === g} onClick={() => setGrupo(g)} className={segBtn(grupo === g)}>
                  {g === "SP" ? "São Paulo" : "Regionais"}
                </button>
              ))}
            </div>
            <div className="inline-flex p-1 rounded-xl bg-slate-500/10 dark:bg-slate-500/15" role="tablist" aria-label="Dia">
              {(["hoje", "ontem"] as const).map((d) => (
                <button key={d} type="button" role="tab" aria-selected={dia === d} onClick={() => setDia(d)} className={segBtn(dia === d)}>
                  {d === "hoje" ? "Hoje" : "Ontem"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void carregar()}
              disabled={carregando}
              title="Atualizar dados"
              className="inline-flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-500/10 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-60 cursor-pointer transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${carregando ? "animate-spin" : ""}`} />
              {atualizadoEm ? atualizadoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "Atualizar"}
            </button>
          </div>
          <div
            className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400"
            title={`Realizado x capacidade em ${new Date(`${hoje}T12:00:00`).toLocaleDateString("pt-BR")} · % = realizado ÷ capacidade`}
          >
            <span className="text-[11px] uppercase tracking-[0.12em]">Real / capacidade</span>
            <span><strong className="font-mono text-sm text-slate-900 dark:text-slate-100">{fmt(totais.rv)}</strong> / {fmt(totais.v)} veíc.</span>
            <span><strong className="font-mono text-sm text-slate-900 dark:text-slate-100">{fmt(totais.rfr)}</strong> / {fmt(totais.fr)} cx frac.</span>
            <span><strong className="font-mono text-sm text-slate-900 dark:text-slate-100">{fmt(totais.rfe)}</strong> / {fmt(totais.fe)} cx fech.</span>
          </div>
        </div>

        {/* TOTENS: ocupam toda a altura restante */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
          {visiveis.map((t, i) => (
            <TotemCd key={t.cd} t={t} index={i} carregando={carregando && capacidades.length === 0} onOpen={() => onPageChange("capacidades")} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TOTEM: cabeça (identificação do CD) + corpo (indicadores do dia), esticado na altura
// ---------------------------------------------------------------------------
function TotemCd({ t, index, carregando, onOpen }: { t: Totem; index: number; carregando: boolean; onOpen: () => void }) {
  const st = t.status ? STATUS_UI[t.status] : null;
  const cats = CATEGORIAS_POR_CD[t.cd] || [];

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className="group flex min-h-0 flex-col gap-2 text-left cursor-pointer focus-visible:outline-none"
      aria-label={`CD ${t.cd}: abrir capacidades`}
      title={`${cats.join(", ")} · clique para abrir Capacidades`}
    >
      {/* CABEÇA */}
      <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 px-3.5 py-2.5 shadow-xs backdrop-blur-md ring-1 ring-transparent transition-all group-hover:ring-blue-500/30 group-focus-visible:ring-2 group-focus-visible:ring-blue-500">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-500/10 text-slate-500 dark:text-slate-400 transition-colors group-hover:bg-blue-600 group-hover:text-white">
          <Warehouse className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="whitespace-nowrap font-mono text-base font-bold leading-tight tracking-tight [@media(min-height:860px)]:text-lg">CD {t.cd}</p>
          <p className="flex items-center gap-1.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
            {st && (
              <>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${st.dot} ${t.status !== "NORMAL" ? "animate-pulse" : ""}`} />
                <span className={`font-semibold ${st.text}`}>{st.label}</span>
                <span className="text-slate-400">·</span>
              </>
            )}
            <span className="truncate">{cats.join(", ")}</span>
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-blue-500 dark:text-slate-600" />
      </div>

      {/* CORPO */}
      <div className="flex min-h-0 flex-1 flex-col divide-y divide-slate-500/10 rounded-2xl bg-white/70 dark:bg-slate-900/60 px-3.5 py-1.5 shadow-xs backdrop-blur-md ring-1 ring-transparent transition-all group-hover:ring-blue-500/30 [@media(min-height:860px)]:px-4">
        {carregando ? (
          <div className="space-y-5 py-2 animate-pulse">
            {[0, 1, 2, 3].map((k) => (
              <div key={k}>
                <div className="h-3 w-24 rounded bg-slate-500/15" />
                <div className="mt-2 h-6 w-20 rounded bg-slate-500/15" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <Comparativo icon={Truck} label="Veículos inbound" real={t.temReal ? t.realVeiculos : null}
              capacidade={t.temDados ? t.veiculos + t.remunerado : null}
              nota={t.remunerado > 0 ? `inclui ${fmt(t.remunerado)} remunerados` : undefined} delay={index * 0.05} />
            <Comparativo icon={Package} label="Caixas fracionadas" real={t.temReal ? t.realFracionadas : null}
              capacidade={t.temDados ? t.fracionadas : null} delay={index * 0.05 + 0.05} />
            <Comparativo icon={PackageOpen} label="Caixas fechadas" real={t.temReal ? t.realFechadas : null}
              capacidade={t.temDados ? t.fechadas : null} delay={index * 0.05 + 0.1} />

            {/* OCUPAÇÃO */}
            <div className="flex min-h-0 flex-1 flex-col justify-center py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <Boxes className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                  Ocupação
                </span>
                {t.livres != null && <span className="text-[10px] text-slate-500 dark:text-slate-400">{fmt(t.livres)} livres</span>}
              </div>
              {t.ocupacao != null ? (
                <>
                  <div className={`font-mono text-lg font-bold tabular-nums [@media(min-height:860px)]:text-xl ${textoOcupacao(t.ocupacao)} [@media(min-height:960px)]:text-3xl`}>
                    {t.ocupacao.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-500/15">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, t.ocupacao)}%` }}
                      transition={{ delay: 0.2 + index * 0.05, duration: 0.6, ease: "easeOut" }}
                      className={`h-full rounded-full ${corOcupacao(t.ocupacao)}`}
                    />
                  </div>
                </>
              ) : (
                <div className="font-mono text-lg font-bold text-slate-300 dark:text-slate-600">—</div>
              )}
              {!t.temDados && <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-400">Sem capacidade cadastrada para o dia</p>}
            </div>
          </>
        )}
      </div>
    </motion.button>
  );
}

/** Realizado e capacidade lado a lado, com a aderência (% do realizado sobre a capacidade). */
function Comparativo({
  icon: Icon,
  label,
  real,
  capacidade,
  nota,
  delay = 0,
}: {
  icon: IconType;
  label: string;
  real: number | null;
  capacidade: number | null;
  nota?: string;
  delay?: number;
}) {
  const pct = real != null && capacidade ? (real / capacidade) * 100 : null;
  const tom =
    pct == null
      ? { bar: "bg-slate-400", text: "text-slate-400", chip: "bg-slate-500/10" }
      : pct > 100
      ? { bar: "bg-rose-500", text: "text-rose-700 dark:text-rose-400", chip: "bg-rose-500/10" }
      : pct >= 90
      ? { bar: "bg-amber-500", text: "text-amber-700 dark:text-amber-400", chip: "bg-amber-500/10" }
      : { bar: "bg-blue-500", text: "text-slate-600 dark:text-slate-300", chip: "bg-slate-500/10" };

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
          <span className="truncate">{label}</span>
        </span>
        {pct != null && (
          <span className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums ${tom.chip} ${tom.text}`}>
            {Math.round(pct)}%
          </span>
        )}
      </div>

      <div className="mt-1 grid grid-cols-2 gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">Real</div>
          <div className="truncate font-mono text-lg font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-100 [@media(min-height:860px)]:text-xl [@media(min-height:960px)]:text-3xl">
            {real != null ? fmt(real) : "—"}
          </div>
        </div>
        <div className="min-w-0 border-l border-slate-500/15 pl-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">Capacidade</div>
          <div className="truncate font-mono text-lg font-medium tabular-nums tracking-tight text-slate-500 dark:text-slate-400 [@media(min-height:860px)]:text-xl [@media(min-height:960px)]:text-3xl">
            {capacidade != null ? fmt(capacidade) : "—"}
          </div>
        </div>
      </div>

      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-500/15 [@media(min-height:960px)]:mt-2.5 [@media(min-height:960px)]:h-1.5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, pct ?? 0)}%` }}
          transition={{ delay: 0.15 + delay, duration: 0.6, ease: "easeOut" }}
          className={`h-full rounded-full ${tom.bar}`}
        />
      </div>
      {nota && <div className="mt-0.5 hidden text-[10px] text-slate-500 dark:text-slate-400 [@media(min-height:760px)]:block">{nota}</div>}
    </div>
  );
}
