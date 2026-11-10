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
  SlidersHorizontal,
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
  const hoje = isoHoje();

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
        status: r ? normStatus(r.status) : null,
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
              <TotemCd key={t.cd} t={t} index={i} carregando={carregando && capacidades.length === 0} onOpen={() => onPageChange("capacidades")} />
            ))}
          </div>

          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            Capacidades planejadas para {new Date(`${hoje}T12:00:00`).toLocaleDateString("pt-BR")} · ocupação do último fechamento.
          </p>
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TOTEM: cabeça (identificação do CD) + corpo (indicadores do dia)
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
      whileHover={{ y: -3 }}
      className="group flex flex-col gap-2 text-left cursor-pointer focus-visible:outline-none"
      aria-label={`CD ${t.cd}: abrir capacidades`}
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
              <span className="mt-2.5 flex items-center gap-1 text-xs font-semibold text-slate-400 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                Ver capacidades <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </>
        )}
      </div>
    </motion.button>
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