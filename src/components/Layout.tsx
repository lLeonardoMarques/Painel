import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import {
  BarChart3,
  TrendingUp,
  Clock3,
  LayoutDashboard,
  AlertTriangle,
  Users,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertCircle,
  Activity,
  CalendarRange,
  Boxes,
  SlidersHorizontal,
  PackageOpen,
  Ship,
  Truck,
  ArrowLeftRight,
  Search,
  CornerDownLeft,
  Warehouse,
  Home,
} from "lucide-react";

export interface LayoutProps {
  children: React.ReactNode;
  user: any;
  activeTab?: "inbound" | "outbound";
  onTabChange?: (tab: "inbound" | "outbound") => void;
  currentPage: string;
  onPageChange: (page: string) => void;
  onLogout: () => void;
  notification: string | null;
  theme: "light" | "dark";
  onThemeToggle: () => void;
  onClearNotification?: () => void;
}

type IconType = React.ComponentType<{ className?: string; strokeWidth?: number }>;

interface NavItem {
  id: string;
  label: string;
  icon: IconType;
  hint?: string;
}

// ============================================================
// ESTRUTURA DO MENU
// ============================================================
const MAIN_NAV: NavItem[] = [
  { id: "inicio", label: "Início", icon: Home, hint: "Resumo do dia por CD" },
  { id: "capacidades", label: "Capacidades", icon: BarChart3, hint: "Capacidade diária por CD" },
  { id: "metas", label: "Planejamento", icon: TrendingUp, hint: "Metas mensais e semanais" },
  { id: "manhattan-capacidades", label: "Manhattan Capacidades", icon: Clock3, hint: "Grade horária do WMS" },
];

const ANALYTICS_NAV: NavItem[] = [
  { id: "painel-gerencial", label: "Painel Gerencial", icon: LayoutDashboard, hint: "Visão executiva" },
  { id: "projecao-cd", label: "Projeção de Ocupação", icon: CalendarRange, hint: "S&OP · CD 1965" },
  { id: "alerta-categorias", label: "Alertas de Categorias", icon: AlertTriangle, hint: "Ruas x categorias" },
];

// PFA (planejamento de final de ano): cada modo tem os seus processos; a página é "pfa/<modo>/<processo>"
const PFA_MENU: { modo: string; label: string; itens: NavItem[] }[] = [
  {
    modo: "planejamento",
    label: "Planejamento Fim de Ano",
    itens: [
      { id: "pfa/planejamento/recebimento", label: "Recebimento", icon: PackageOpen },
      { id: "pfa/planejamento/importacao", label: "Importação", icon: Ship },
      { id: "pfa/planejamento/faturamento", label: "Expedição", icon: Truck },
      { id: "pfa/planejamento/transferencia", label: "Transferência", icon: ArrowLeftRight },
    ],
  },
  {
    modo: "esteAno",
    label: "Este Ano",
    itens: [
      { id: "pfa/esteAno/recebimento", label: "Recebimento", icon: PackageOpen },
      { id: "pfa/esteAno/faturamento", label: "Expedição", icon: Truck },
    ],
  },
  {
    modo: "semEdicao",
    label: "Faturamento sem Edição",
    itens: [{ id: "pfa/semEdicao/faturamentoReal", label: "Expedição", icon: Truck }],
  },
];

const ADMIN_NAV: NavItem[] = [
  { id: "user-control", label: "Usuários e acessos", icon: Users, hint: "Aprovação de perfis" },
  { id: "parametros", label: "Parâmetros", icon: SlidersHorizontal, hint: "Parâmetros S&OP" },
];

const ANALYTICS_PAGES = new Set(["painel-gerencial", "painel-regionais", "projecao-cd", "alerta-categorias"]);
const FULL_BLEED_PAGES = new Set(["painel-gerencial", "painel-regionais"]);

// v3: o menu passa a abrir recolhido por padrão (a preferência de cada pessoa continua sendo lembrada)
const SIDEBAR_KEY = "logistics_sidebar_state_v3";
const W_EXPANDED = 264;
const W_COMPACT = 76;

function readStored(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform || "");
const MOD = isMac ? "⌘" : "Ctrl";

export default function Layout({
  children,
  user,
  currentPage,
  onPageChange,
  onLogout,
  notification,
  theme,
  onThemeToggle,
  onClearNotification,
}: LayoutProps) {
  const [collapsed, setCollapsed] = useState(() => readStored(SIDEBAR_KEY, "collapsed") === "collapsed");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const [pfaOpen, setPfaOpen] = useState(() => currentPage.startsWith("pfa/"));
  const [pfaModoAberto, setPfaModoAberto] = useState(() => currentPage.split("/")[1] || "planejamento");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [tooltip, setTooltip] = useState<{ label: string; top: number } | null>(null);
  const [flyout, setFlyout] = useState<{ group: "analytics" | "pfa"; top: number } | null>(null);

  const dark = theme === "dark";
  const isAdmin = user?.role === "admin";
  const canAnalytics = user?.role !== "ga";
  const analyticsActive = ANALYTICS_PAGES.has(currentPage);
  const pfaActive = currentPage.startsWith("pfa/");
  const displayName = user?.name || user?.username || "Operador";
  const roleName = isAdmin ? "Administrador" : user?.role === "ga" ? "Gestão de agenda" : "PPCP";
  const initials = String(displayName)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase())
    .join("");

  // ---------------------------------------------------------- persistência e sincronização
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? "collapsed" : "expanded");
    } catch {
      /* storage indisponível */
    }
    setTooltip(null);
    setFlyout(null);
  }, [collapsed]);

  useEffect(() => {
    if (ANALYTICS_PAGES.has(currentPage)) setAnalyticsOpen(true);
    if (currentPage.startsWith("pfa/")) {
      setPfaOpen(true);
      setPfaModoAberto(currentPage.split("/")[1]);
    }
    setMobileOpen(false);
    setFlyout(null);
  }, [currentPage]);

  // ---------------------------------------------------------- atalhos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((v) => !v);
      } else if (e.key === "Escape") {
        setFlyout(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = useCallback(
    (page: string) => {
      onPageChange(page);
      setMobileOpen(false);
      setFlyout(null);
      setTooltip(null);
    },
    [onPageChange]
  );

  // ---------------------------------------------------------- lista para a busca rápida
  const searchable = useMemo(() => {
    const list: PaletteItem[] = [];
    MAIN_NAV.forEach((i) => list.push({ ...i, section: "Operação" }));
    if (canAnalytics) {
      ANALYTICS_NAV.forEach((i) => list.push({ ...i, section: "Analítico" }));
      PFA_MENU.forEach((g) => g.itens.forEach((i) => list.push({ ...i, section: `PFA · ${g.label}` })));
    }
    if (isAdmin) ADMIN_NAV.forEach((i) => list.push({ ...i, section: "Administração" }));
    return list;
  }, [canAnalytics, isAdmin]);

  const currentLabel = useMemo(() => {
    const found = searchable.find((s) => s.id === currentPage);
    if (found) return { label: found.label, section: found.section };
    if (currentPage === "painel-regionais") return { label: "Painel Regionais", section: "Analítico" };
    return { label: "GPA Logística", section: "" };
  }, [currentPage, searchable]);

  // ---------------------------------------------------------- notificações
  const isError = !!notification && /❌|erro|error/i.test(notification);
  const cleanedNotification = notification?.replace(/[❌⚠️🔍📊📍📅🧹🎯⚡✅]/g, "").trim();
  const showNotification = !!notification && /❌|⚠️|erro|error|alerta/i.test(notification);

  // ---------------------------------------------------------- tooltip do menu compacto
  const tipHandlers = (label: string, compact: boolean) =>
    compact
      ? {
          onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
            const r = e.currentTarget.getBoundingClientRect();
            setTooltip({ label, top: r.top + r.height / 2 });
          },
          onMouseLeave: () => setTooltip(null),
          onFocus: (e: React.FocusEvent<HTMLElement>) => {
            const r = e.currentTarget.getBoundingClientRect();
            setTooltip({ label, top: r.top + r.height / 2 });
          },
          onBlur: () => setTooltip(null),
        }
      : {};

  const idleItem = dark
    ? "text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]"
    : "text-slate-600 hover:text-slate-900 hover:bg-slate-900/[0.04]";
  const activeText = dark ? "text-white" : "text-slate-900";
  const activeIcon = dark ? "text-blue-400" : "text-blue-600";

  // ============================================================
  // ITENS DO MENU
  // ============================================================
  const renderLink = (item: NavItem, compact = false, nested = false) => {
    const Icon = item.icon;
    const active = currentPage === item.id || (item.id === "painel-gerencial" && currentPage === "painel-regionais");
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => go(item.id)}
        aria-current={active ? "page" : undefined}
        aria-label={compact ? item.label : undefined}
        {...tipHandlers(item.label, compact)}
        className={[
          "group relative flex w-full items-center rounded-xl text-left outline-none transition-colors duration-150 cursor-pointer",
          "focus-visible:ring-2 focus-visible:ring-blue-500/60",
          // altura mínima (e não fixa): nomes longos quebram em duas linhas em vez de serem cortados
          compact ? "h-11 justify-center" : nested ? "min-h-9 gap-2.5 py-1.5 pl-3 pr-2.5" : "min-h-10 gap-3 px-3 py-2",
          active ? activeText : idleItem,
        ].join(" ")}
      >
        {active && (
          <motion.span
            layoutId="active-bg"
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
            className={`absolute inset-0 rounded-xl ${
              dark
                ? "bg-gradient-to-r from-blue-500/[0.16] via-blue-500/[0.07] to-transparent ring-1 ring-inset ring-white/[0.06]"
                : "bg-gradient-to-r from-blue-600/[0.10] via-blue-600/[0.04] to-transparent ring-1 ring-inset ring-blue-600/10"
            }`}
          />
        )}
        {active && !nested && (
          <motion.span
            layoutId="active-bar"
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
            className={`absolute top-2 bottom-2 w-[3px] rounded-r-full bg-gradient-to-b from-blue-400 to-blue-600 shadow-[0_0_12px_rgba(59,130,246,0.7)] ${
              compact ? "-left-3.5" : "-left-4"
            }`}
          />
        )}
        <span
          className={`relative flex shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-110 ${
            nested ? "h-4 w-4" : "h-[18px] w-[18px]"
          }`}
        >
          <Icon strokeWidth={active ? 2.2 : 1.8} className={`h-full w-full ${active ? activeIcon : ""}`} />
        </span>
        {!compact && (
          <span className={`relative min-w-0 flex-1 break-words leading-snug ${nested ? "text-[12.5px]" : "text-[13px]"} ${active ? "font-semibold" : "font-medium"}`}>
            {item.label}
          </span>
        )}
      </button>
    );
  };

  /** Grupo recolhível (Analítico, PFA). No menu compacto abre um painel flutuante ao lado. */
  const renderGroup = (
    key: "analytics" | "pfa",
    label: string,
    Icon: IconType,
    content: React.ReactNode,
    open: boolean,
    setOpen: React.Dispatch<React.SetStateAction<boolean>>,
    active: boolean,
    compact: boolean,
    count: number
  ) => (
    <div>
      <button
        type="button"
        aria-expanded={compact ? flyout?.group === key : open}
        aria-label={compact ? label : undefined}
        {...tipHandlers(label, compact && flyout?.group !== key)}
        onClick={(e) => {
          if (compact) {
            const r = e.currentTarget.getBoundingClientRect();
            setTooltip(null);
            setFlyout((f) => (f?.group === key ? null : { group: key, top: r.top }));
          } else {
            setOpen((v) => !v);
          }
        }}
        className={[
          "group relative flex w-full items-center rounded-xl text-left outline-none transition-colors duration-150 cursor-pointer",
          "focus-visible:ring-2 focus-visible:ring-blue-500/60",
          compact ? "h-11 justify-center" : "h-10 gap-3 px-3",
          active ? activeText : idleItem,
          compact && (active || flyout?.group === key) ? (dark ? "bg-white/[0.06]" : "bg-slate-900/[0.05]") : "",
        ].join(" ")}
      >
        <span className="relative flex h-[18px] w-[18px] shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-110">
          <Icon strokeWidth={active ? 2.2 : 1.8} className={`h-full w-full ${active ? activeIcon : ""}`} />
          {compact && active && (
            <span className={`absolute -right-1.5 -top-1 h-1.5 w-1.5 rounded-full bg-blue-500 ring-2 ${dark ? "ring-[#0b1120]" : "ring-white"}`} />
          )}
        </span>
        {!compact && (
          <>
            <span className={`flex-1 text-[13px] ${active ? "font-semibold" : "font-medium"}`}>{label}</span>
            <span
              className={`rounded-md px-1.5 py-px font-mono text-[10px] tabular-nums transition-opacity duration-200 ${
                open ? "opacity-0" : "opacity-100"
              } ${dark ? "bg-white/[0.06] text-slate-400" : "bg-slate-900/[0.05] text-slate-500"}`}
            >
              {count}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 opacity-60 transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
          </>
        )}
      </button>

      {!compact && (
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className={`relative ml-[21px] mt-1 mb-1 space-y-0.5 border-l pl-2.5 ${dark ? "border-white/[0.07]" : "border-slate-200"}`}>
                {content}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );

  /** Modos do PFA, cada um com os seus processos. */
  const renderPfa = (inFlyout = false) =>
    PFA_MENU.map((grupo) => {
      const aberto = inFlyout || pfaModoAberto === grupo.modo;
      const ativo = currentPage.startsWith(`pfa/${grupo.modo}/`);
      return (
        <div key={grupo.modo} className={inFlyout ? "py-1" : ""}>
          {inFlyout ? (
            <p className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {grupo.label}
            </p>
          ) : (
            <button
              type="button"
              aria-expanded={aberto}
              onClick={() => setPfaModoAberto(aberto ? "" : grupo.modo)}
              className={`flex min-h-8 w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[12px] font-medium transition-colors cursor-pointer ${
                ativo
                  ? dark ? "text-slate-100" : "text-slate-900"
                  : dark ? "text-slate-500 hover:text-slate-200" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${ativo ? "bg-blue-500" : dark ? "bg-slate-600" : "bg-slate-300"}`} />
              <span className="min-w-0 flex-1 break-words leading-snug">{grupo.label}</span>
              <ChevronRight className={`h-3 w-3 opacity-60 transition-transform duration-200 ${aberto ? "rotate-90" : ""}`} />
            </button>
          )}
          <AnimatePresence initial={false}>
            {aberto && (
              <motion.div
                initial={inFlyout ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className={inFlyout ? "space-y-0.5" : "overflow-hidden space-y-0.5 pl-2"}
              >
                {grupo.itens.map((item) => renderLink(item, false, true))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    });

  const sectionLabel = (text: string, compact: boolean, first = false) =>
    compact ? (
      first ? null : <div className={`mx-auto my-3 h-px w-6 ${dark ? "bg-white/[0.08]" : "bg-slate-200"}`} />
    ) : (
      <p className={`mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 ${first ? "" : "mt-6"}`}>
        {text}
      </p>
    );

  // ============================================================
  // SIDEBAR
  // ============================================================
  const renderSidebar = (compact: boolean, mobile = false) => (
    <>
      {/* brilho decorativo no topo */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-48 ${
          dark
            ? "bg-[radial-gradient(120%_80%_at_0%_0%,rgba(59,130,246,0.14),transparent_60%)]"
            : "bg-[radial-gradient(120%_80%_at_0%_0%,rgba(59,130,246,0.07),transparent_60%)]"
        }`}
      />

      {/* MARCA */}
      <div className={`relative flex h-[72px] shrink-0 items-center ${compact ? "justify-center px-2" : "justify-between px-5"}`}>
        <button type="button" onClick={() => go("inicio")} className="flex min-w-0 items-center gap-3 cursor-pointer" aria-label="Ir para o início">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-600/30 ring-1 ring-inset ring-white/20">
            <Warehouse className="h-5 w-5" strokeWidth={2} />
            <span className="absolute inset-0 rounded-xl bg-gradient-to-t from-transparent to-white/20" />
          </div>
          {!compact && (
            <div className="min-w-0 text-left">
              <p className="truncate text-[14px] font-semibold tracking-tight text-slate-900 dark:text-white">GPA Logística</p>
              <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">PPCP · Planejamento</p>
            </div>
          )}
        </button>
        {mobile && (
          <button type="button" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-500/10 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* BUSCA RÁPIDA */}
      <div className={`relative shrink-0 pb-3 ${compact ? "px-3.5" : "px-4"}`}>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          aria-label="Buscar página"
          {...tipHandlers(`Buscar (${MOD} K)`, compact)}
          className={`group flex w-full items-center rounded-xl text-left transition-all cursor-pointer ${compact ? "h-11 justify-center" : "h-10 gap-2.5 px-3"} ${
            dark
              ? "bg-white/[0.04] text-slate-400 ring-1 ring-inset ring-white/[0.06] hover:bg-white/[0.07] hover:text-slate-200"
              : "bg-slate-900/[0.03] text-slate-500 ring-1 ring-inset ring-slate-900/[0.06] hover:bg-slate-900/[0.05] hover:text-slate-800"
          }`}
        >
          <Search className="h-4 w-4 shrink-0" />
          {!compact && (
            <>
              <span className="flex-1 text-[13px]">Buscar...</span>
              <kbd
                className={`rounded-md px-1.5 py-0.5 font-sans text-[10px] font-semibold ${
                  dark ? "bg-white/[0.06] text-slate-400" : "bg-white text-slate-500 shadow-xs ring-1 ring-slate-200"
                }`}
              >
                {MOD} K
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* NAVEGAÇÃO */}
      <nav
        aria-label="Navegação principal"
        onScroll={() => {
          setTooltip(null);
          setFlyout(null);
        }}
        className={`sidebar-scroll relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-4 pt-2 ${compact ? "px-3.5" : "px-4"}`}
      >
        {sectionLabel("Operação", compact, true)}
        <div className="space-y-0.5">{MAIN_NAV.map((item) => renderLink(item, compact))}</div>

        {canAnalytics && (
          <>
            {sectionLabel("Análise e monitoramento", compact)}
            <div className="space-y-0.5">
              {renderGroup(
                "analytics",
                "Analítico",
                Activity,
                <>{ANALYTICS_NAV.map((item) => renderLink(item, false, true))}</>,
                analyticsOpen,
                setAnalyticsOpen,
                analyticsActive,
                compact,
                ANALYTICS_NAV.length
              )}
              {renderGroup("pfa", "PFA", Boxes, <>{renderPfa()}</>, pfaOpen, setPfaOpen, pfaActive, compact, PFA_MENU.length)}
            </div>
          </>
        )}

        {isAdmin && (
          <>
            {sectionLabel("Administração", compact)}
            <div className="space-y-0.5">{ADMIN_NAV.map((item) => renderLink(item, compact))}</div>
          </>
        )}
      </nav>

      {/* RODAPÉ: USUÁRIO E PREFERÊNCIAS */}
      <div className={`relative shrink-0 border-t p-3 ${dark ? "border-white/[0.06]" : "border-slate-200/80"}`}>
        <div
          className={`flex items-center gap-3 rounded-xl p-2 ${compact ? "justify-center" : dark ? "bg-white/[0.03]" : "bg-slate-900/[0.025]"}`}
          {...tipHandlers(`${displayName} · ${roleName}`, compact)}
        >
          <div className="relative shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-[12px] font-semibold text-white ring-2 ring-white/10 dark:from-slate-500 dark:to-slate-700">
              {initials || "U"}
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ${dark ? "ring-[#0b1120]" : "ring-white"}`} />
          </div>
          {!compact && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">{displayName}</p>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{roleName}</p>
            </div>
          )}
          {!compact && (
            <button
              type="button"
              onClick={onLogout}
              title="Sair do sistema"
              aria-label="Sair do sistema"
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-500 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className={`mt-2 flex gap-1.5 ${compact ? "flex-col items-center" : ""}`}>
          {/* alternador de tema */}
          <button
            type="button"
            onClick={onThemeToggle}
            aria-label={dark ? "Usar tema claro" : "Usar tema escuro"}
            {...tipHandlers(dark ? "Tema claro" : "Tema escuro", compact)}
            className={`relative flex h-9 items-center rounded-xl p-1 transition-colors cursor-pointer ${compact ? "w-11 justify-center" : "flex-1"} ${
              dark ? "bg-white/[0.04] hover:bg-white/[0.07]" : "bg-slate-900/[0.04] hover:bg-slate-900/[0.06]"
            }`}
          >
            {compact ? (
              dark ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-slate-600" />
            ) : (
              <>
                <motion.span
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg shadow-xs ${
                    dark ? "left-[calc(50%+2px)] bg-slate-700" : "left-1 bg-white ring-1 ring-slate-200"
                  }`}
                />
                <span className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 text-[11px] font-medium ${!dark ? "text-slate-900" : "text-slate-500"}`}>
                  <Sun className="h-3.5 w-3.5" /> Claro
                </span>
                <span className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 text-[11px] font-medium ${dark ? "text-white" : "text-slate-500"}`}>
                  <Moon className="h-3.5 w-3.5" /> Escuro
                </span>
              </>
            )}
          </button>

          {compact && (
            <button
              type="button"
              onClick={onLogout}
              aria-label="Sair do sistema"
              {...tipHandlers("Sair", compact)}
              className="flex h-9 w-11 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-500 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </>
  );

  const sidebarW = collapsed ? W_COMPACT : W_EXPANDED;

  return (
    <div className={`flex h-screen w-full overflow-hidden font-sans antialiased ${dark ? "dark bg-[#070b14] text-slate-100" : "bg-[#f4f6f9] text-slate-900"}`}>
      {/* ===================== SIDEBAR DESKTOP ===================== */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarW }}
        transition={{ type: "spring", stiffness: 400, damping: 40 }}
        className={`relative z-30 hidden h-full shrink-0 flex-col border-r md:flex ${dark ? "border-white/[0.06] bg-[#0b1120]" : "border-slate-200/80 bg-white"}`}
      >
        <LayoutGroup id="desktop">
          <div className="relative flex h-full flex-col overflow-hidden">{renderSidebar(collapsed)}</div>
        </LayoutGroup>

        {/* botão de recolher/expandir na borda */}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          title={`${collapsed ? "Expandir" : "Recolher"} menu (${MOD} B)`}
          className={`absolute -right-3 top-[24px] z-40 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm transition-all hover:scale-110 cursor-pointer ${
            dark ? "border-white/10 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white" : "border-slate-200 bg-white text-slate-500 hover:text-slate-900"
          }`}
        >
          {collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
        </button>
      </motion.aside>

      {/* tooltip do menu compacto */}
      <AnimatePresence>
        {collapsed && tooltip && !flyout && (
          <motion.div
            key={tooltip.label}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{ top: tooltip.top, left: W_COMPACT + 10 }}
            className="pointer-events-none fixed z-[70] hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg ring-1 ring-white/10 md:block dark:bg-slate-700"
          >
            {tooltip.label}
          </motion.div>
        )}
      </AnimatePresence>

      {/* painel flutuante dos grupos no menu compacto */}
      <AnimatePresence>
        {collapsed && flyout && (
          <>
            <div className="fixed inset-0 z-[55] hidden md:block" onClick={() => setFlyout(null)} />
            <motion.div
              initial={{ opacity: 0, x: -6, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              style={{
                top: Math.max(8, Math.min(flyout.top - 8, window.innerHeight - (flyout.group === "pfa" ? 440 : 200))),
                left: W_COMPACT + 8,
              }}
              className={`fixed z-[60] hidden w-64 rounded-2xl p-2 shadow-2xl md:block ${
                dark ? "bg-slate-900/95 ring-1 ring-white/10 backdrop-blur-xl" : "bg-white/95 ring-1 ring-slate-200 backdrop-blur-xl"
              }`}
            >
              <LayoutGroup id="flyout">
                <p className="px-3 pb-1.5 pt-1 text-[11px] font-semibold text-slate-900 dark:text-slate-100">
                  {flyout.group === "analytics" ? "Analítico" : "PFA"}
                </p>
                <div className="space-y-0.5">
                  {flyout.group === "analytics" ? ANALYTICS_NAV.map((item) => renderLink(item, false, true)) : renderPfa(true)}
                </div>
              </LayoutGroup>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===================== DRAWER MOBILE ===================== */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className={`fixed inset-y-0 left-0 z-50 flex w-[288px] flex-col overflow-hidden shadow-2xl md:hidden ${dark ? "bg-[#0b1120]" : "bg-white"}`}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
            >
              <LayoutGroup id="mobile">{renderSidebar(false, true)}</LayoutGroup>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ===================== ÁREA PRINCIPAL ===================== */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* ambiente sutil atrás dos cartões translúcidos */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 ${
            dark
              ? "bg-[radial-gradient(60%_40%_at_100%_0%,rgba(59,130,246,0.07),transparent_70%),radial-gradient(50%_40%_at_0%_100%,rgba(99,102,241,0.05),transparent_70%)]"
              : "bg-[radial-gradient(60%_40%_at_100%_0%,rgba(59,130,246,0.06),transparent_70%)]"
          }`}
        />

        {/* cabeçalho mobile */}
        <header
          className={`relative z-10 flex h-14 shrink-0 items-center gap-3 border-b px-4 md:hidden ${
            dark ? "border-white/[0.06] bg-[#0b1120]/90 backdrop-blur-md" : "border-slate-200 bg-white/90 backdrop-blur-md"
          }`}
        >
          <button type="button" aria-label="Abrir menu" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 hover:bg-slate-500/10 cursor-pointer">
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{currentLabel.label}</p>
            {currentLabel.section && <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{currentLabel.section}</p>}
          </div>
          <button type="button" aria-label="Buscar página" onClick={() => setPaletteOpen(true)} className="rounded-lg p-2 hover:bg-slate-500/10 cursor-pointer">
            <Search className="h-5 w-5" />
          </button>
        </header>

        <main
          className={`relative flex min-h-0 w-full flex-1 flex-col ${
            FULL_BLEED_PAGES.has(currentPage) || pfaActive ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden"
          }`}
        >
          {/* transição suave ao trocar de página */}
          <motion.div
            key={pfaActive ? "pfa" : currentPage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="flex min-h-0 w-full flex-1 flex-col"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* ===================== BUSCA RÁPIDA (Ctrl K) ===================== */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={searchable}
        currentPage={currentPage}
        dark={dark}
        onSelect={(id) => {
          setPaletteOpen(false);
          go(id);
        }}
        onThemeToggle={() => {
          setPaletteOpen(false);
          onThemeToggle();
        }}
        onLogout={() => {
          setPaletteOpen(false);
          onLogout();
        }}
      />

      {/* ===================== NOTIFICAÇÕES ===================== */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className={`fixed bottom-5 right-5 z-[60] flex max-w-sm items-start gap-3 rounded-2xl p-4 shadow-2xl backdrop-blur-xl ${
              dark ? "bg-slate-900/95 ring-1 ring-white/10" : "bg-white/95 ring-1 ring-slate-200"
            }`}
          >
            <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isError ? "bg-red-500/15 text-red-500" : "bg-amber-500/15 text-amber-500"}`}>
              <AlertCircle className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold">{isError ? "Erro" : "Atenção"}</p>
              <p className="mt-1 break-words text-xs text-slate-600 dark:text-slate-300">{cleanedNotification}</p>
            </div>
            {onClearNotification && (
              <button type="button" aria-label="Fechar notificação" onClick={onClearNotification} className="rounded-lg p-1 text-slate-400 hover:bg-slate-500/10 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// BUSCA RÁPIDA DE PÁGINAS (Ctrl/⌘ + K)
// ============================================================
interface PaletteItem {
  id: string;
  label: string;
  section: string;
  icon: IconType;
  hint?: string;
}

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function CommandPalette({
  open,
  onClose,
  items,
  currentPage,
  dark,
  onSelect,
  onThemeToggle,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  items: PaletteItem[];
  currentPage: string;
  dark: boolean;
  onSelect: (id: string) => void;
  onThemeToggle: () => void;
  onLogout: () => void;
}) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const actions: PaletteItem[] = useMemo(
    () => [
      { id: "__theme", label: dark ? "Mudar para tema claro" : "Mudar para tema escuro", section: "Ações", icon: dark ? Sun : Moon },
      { id: "__logout", label: "Sair do sistema", section: "Ações", icon: LogOut },
    ],
    [dark]
  );

  const results = useMemo(() => {
    const q = normalize(query.trim());
    const all = [...items, ...actions];
    if (!q) return all;
    return all.filter((i) => normalize(`${i.label} ${i.section} ${i.hint || ""}`).includes(q));
  }, [query, items, actions]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => setIndex(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const choose = (item?: PaletteItem) => {
    if (!item) return;
    if (item.id === "__theme") onThemeToggle();
    else if (item.id === "__logout") onLogout();
    else onSelect(item.id);
  };

  // agrupa mantendo a ordem
  const grouped: { section: string; items: { item: PaletteItem; idx: number }[] }[] = [];
  results.forEach((item, idx) => {
    const last = grouped[grouped.length - 1];
    if (last && last.section === item.section) last.items.push({ item, idx });
    else grouped.push({ section: item.section, items: [{ item, idx }] });
  });

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Buscar página"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className={`relative w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl ${
              dark ? "bg-slate-900 ring-1 ring-white/10 text-slate-100" : "bg-white ring-1 ring-slate-200 text-slate-900"
            }`}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(results.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                choose(results[index]);
              } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              }
            }}
          >
            <div className={`flex items-center gap-3 border-b px-4 ${dark ? "border-white/[0.06]" : "border-slate-100"}`}>
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar páginas e ações..."
                className="h-14 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
              <kbd className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${dark ? "bg-white/[0.06] text-slate-400" : "bg-slate-100 text-slate-500"}`}>Esc</kbd>
            </div>

            <div ref={listRef} className="sidebar-scroll max-h-[360px] overflow-y-auto p-2">
              {results.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">Nada encontrado para “{query}”.</p>
              ) : (
                grouped.map((g) => (
                  <div key={g.section} className="mb-1">
                    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{g.section}</p>
                    {g.items.map(({ item, idx }) => {
                      const Icon = item.icon;
                      const sel = idx === index;
                      const isCurrent = item.id === currentPage;
                      return (
                        <button
                          key={`${item.section}-${item.id}`}
                          type="button"
                          data-idx={idx}
                          onMouseMove={() => setIndex(idx)}
                          onClick={() => choose(item)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer ${
                            sel ? (dark ? "bg-white/[0.06]" : "bg-slate-100") : ""
                          }`}
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                              sel ? "bg-blue-600 text-white" : dark ? "bg-white/[0.05] text-slate-400" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{item.label}</span>
                            {item.hint && <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{item.hint}</span>}
                          </span>
                          {isCurrent && (
                            <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">atual</span>
                          )}
                          {sel && <CornerDownLeft className="h-3.5 w-3.5 text-slate-400" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div className={`flex items-center gap-4 border-t px-4 py-2.5 text-[11px] text-slate-500 ${dark ? "border-white/[0.06]" : "border-slate-100"}`}>
              <span>↑↓ navegar</span>
              <span>↵ abrir</span>
              <span className="ml-auto">{MOD} B recolhe o menu</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
