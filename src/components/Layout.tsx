import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart3,
  TrendingUp,
  Clock3,
  LayoutDashboard,
  PieChart,
  AlertTriangle,
  Users,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Activity,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Layers3,
  CalendarRange,
} from "lucide-react";
import DashboardOcupacao from "./DashboardOcupacao";

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

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MAIN_NAV: NavItem[] = [
  { id: "capacidades", label: "Capacidades", icon: BarChart3 },
  { id: "metas", label: "Planejamento", icon: TrendingUp },
  { id: "manhattan-capacidades", label: "Manhattan Capacidades", icon: Clock3 },
];

const ANALYTICS_NAV: NavItem[] = [
  { id: "painel-gerencial", label: "Painel Gerencial", icon: LayoutDashboard },
  { id: "dashboard", label: "Ocupação e Estoque", icon: PieChart },
  { id: "projecao-cd", label: "Projeção de Ocupação", icon: CalendarRange },
];

const OTHER_NAV: NavItem[] = [
  { id: "alerta-categorias", label: "Alertas de Categorias", icon: AlertTriangle },
];

const ANALYTICS_PAGES = new Set(["dashboard", "painel-gerencial", "painel-regionais", "projecao-cd"]);

function readStored(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

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
  const [collapsed, setCollapsed] = useState(
    () => readStored("logistics_sidebar_state_v2", "expanded") === "collapsed"
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem("logistics_sidebar_state_v2", collapsed ? "collapsed" : "expanded");
    } catch {
      /* storage unavailable */
    }
  }, [collapsed]);

  useEffect(() => {
    if (ANALYTICS_PAGES.has(currentPage)) setAnalyticsOpen(true);
  }, [currentPage]);

  useEffect(() => {
    setMobileOpen(false);
  }, [currentPage]);

  const dark = theme === "dark";
  const analyticsActive = ANALYTICS_PAGES.has(currentPage);
  const isError = !!notification && /❌|erro|error/i.test(notification);
  const cleanedNotification = notification?.replace(/[❌⚠️🔍📊📍📅🧹🎯⚡✅]/g, "").trim();
  const showNotification = !!notification && /❌|⚠️|erro|error|alerta/i.test(notification);
  const displayName = user?.name || user?.username || "Operador";
  const roleName = user?.role === "admin" ? "Administrador" : user?.role === "ga" ? "Gestão de agenda" : "Operador";

  const go = (page: string) => {
    if (page === "dashboard") {
      try {
        localStorage.setItem("logistics_selected_dashboard_id", "ocupacao");
      } catch {
        /* storage unavailable */
      }
    }
    onPageChange(page);
    setMobileOpen(false);
  };

  const itemClass = (active: boolean, compact: boolean) => [
    "group relative flex w-full items-center gap-3 rounded-md text-left transition-colors duration-150 cursor-pointer",
    compact ? "h-10 justify-center px-0" : "h-10 px-3",
    active
      ? dark
        ? "bg-slate-800 text-white font-semibold"
        : "bg-slate-100 text-slate-950 font-semibold"
      : dark
      ? "text-slate-400 hover:bg-slate-800/70 hover:text-white"
      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
  ].join(" ");

  const renderLink = (item: NavItem, compact = false) => {
    const Icon = item.icon;
    const active = currentPage === item.id || (item.id === "painel-gerencial" && currentPage === "painel-regionais");
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => go(item.id)}
        title={compact ? item.label : undefined}
        aria-current={active ? "page" : undefined}
        className={itemClass(active, compact)}
      >
        {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-blue-600" />}
        <Icon className={`h-[17px] w-[17px] shrink-0 ${active ? "text-blue-600 dark:text-blue-400" : ""}`} />
        {!compact && <span className="min-w-0 truncate text-[13px] font-medium">{item.label}</span>}
      </button>
    );
  };

  const renderSidebar = (compact: boolean, mobile = false) => (
    <>
      <div
        className={`flex h-[68px] shrink-0 items-center border-b ${
          dark ? "border-slate-800" : "border-slate-200"
        } ${compact ? "justify-center px-2" : "justify-between px-4"}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
              dark ? "bg-slate-800 text-slate-100" : "bg-slate-900 text-white"
            }`}
          >
            <Layers3 className="h-[18px] w-[18px]" />
          </div>
          {!compact && (
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold tracking-[0.01em]">GPA Logística</p>
              <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">Planejamento e controle</p>
            </div>
          )}
        </div>
        {mobile ? (
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          !compact && (
            <button
              type="button"
              title="Recolher menu"
              aria-label="Recolher menu"
              onClick={() => setCollapsed(true)}
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )
        )}
      </div>

      {compact && !mobile && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Expandir menu"
          aria-label="Expandir menu"
          className="mx-auto mt-3 rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}

      <nav aria-label="Navegação principal" className={`min-h-0 flex-1 overflow-y-auto py-5 ${compact ? "px-2" : "px-3"}`}>
        {!compact && (
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Operação</p>
        )}
        <div className="space-y-1">{MAIN_NAV.map((item) => renderLink(item, compact))}</div>

        {user?.role !== "ga" && (
          <div className="mt-6">
            {!compact && (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Análise e monitoramento
              </p>
            )}
            <button
              type="button"
              title={compact ? "Analítico" : undefined}
              aria-expanded={analyticsOpen}
              onClick={() => {
                if (compact && !mobile) {
                  setCollapsed(false);
                  setAnalyticsOpen(true);
                } else {
                  setAnalyticsOpen((v) => !v);
                }
              }}
              className={itemClass(analyticsActive, compact)}
            >
              <Activity
                className={`h-[17px] w-[17px] shrink-0 ${analyticsActive ? "text-blue-600 dark:text-blue-400" : ""}`}
              />
              {!compact && (
                <>
                  <span className="flex-1 text-[13px] font-medium">Analítico</span>
                  {analyticsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </>
              )}
            </button>

            {!compact && (
              <AnimatePresence initial={false}>
                {analyticsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div
                      className={`ml-[20px] mt-1 space-y-1 border-l pl-3 ${
                        dark ? "border-slate-700" : "border-slate-200"
                      }`}
                    >
                      {ANALYTICS_NAV.map((item) => renderLink(item))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
            <div className="mt-1 space-y-1">{OTHER_NAV.map((item) => renderLink(item, compact))}</div>
          </div>
        )}

        {user?.role === "admin" && (
          <div className="mt-6">
            {!compact && (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Administração</p>
            )}
            {renderLink({ id: "user-control", label: "Usuários e acessos", icon: Users }, compact)}
          </div>
        )}
      </nav>

      <div className={`shrink-0 border-t p-3 ${dark ? "border-slate-800" : "border-slate-200"}`}>
        <div
          className={`flex items-center gap-3 rounded-md py-2 ${compact ? "justify-center" : "px-2"}`}
          title={compact ? `${displayName} · ${roleName}` : undefined}
        >
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
              dark ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-700"
            }`}
          >
            {String(displayName).charAt(0).toUpperCase()}
          </div>
          {!compact && (
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold">{displayName}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{roleName}</p>
            </div>
          )}
        </div>
        <div className={`mt-2 flex ${compact ? "flex-col" : "flex-row"} gap-1`}>
          <button
            type="button"
            onClick={onThemeToggle}
            title={dark ? "Usar tema claro" : "Usar tema escuro"}
            className="flex h-9 flex-1 items-center justify-center gap-2 rounded-md text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {!compact && <span className="text-xs">{dark ? "Tema claro" : "Tema escuro"}</span>}
          </button>
          <button
            type="button"
            onClick={onLogout}
            title="Sair do sistema"
            className="flex h-9 flex-1 items-center justify-center gap-2 rounded-md text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950/30 dark:hover:text-red-400 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            {!compact && <span className="text-xs">Sair</span>}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div
      className={`flex h-screen w-full overflow-hidden font-sans antialiased ${
        dark ? "dark bg-slate-950 text-slate-100" : "bg-[#f6f7f9] text-slate-900"
      }`}
    >
      <aside
        className={`relative z-30 hidden h-full shrink-0 flex-col border-r transition-[width] duration-200 md:flex ${
          collapsed ? "w-[68px]" : "w-[252px]"
        } ${dark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`}
      >
        {renderSidebar(collapsed)}
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-slate-950/60 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col shadow-xl md:hidden ${
                dark ? "bg-slate-900" : "bg-white"
              }`}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.2 }}
            >
              {renderSidebar(false, true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className={`flex h-14 shrink-0 items-center gap-3 border-b px-4 md:hidden ${
            dark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
          }`}
        >
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold">GPA Logística</span>
        </header>

        <main
          className={`flex min-h-0 w-full flex-1 flex-col ${
            currentPage === "dashboard" || currentPage === "painel-gerencial" || currentPage === "painel-regionais"
              ? "overflow-hidden"
              : "overflow-y-auto overflow-x-hidden"
          }`}
        >
          {currentPage === "dashboard" ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-auto">
              <DashboardOcupacao
                theme={theme}
                user={user}
                onPageChange={onPageChange}
                onThemeToggle={onThemeToggle}
                onLogout={onLogout}
                showNotification={() => {}}
              />
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      <AnimatePresence>
        {showNotification && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className={`fixed bottom-5 right-5 z-[60] flex max-w-sm items-start gap-3 rounded-lg border p-4 shadow-lg ${
              dark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"
            }`}
          >
            <AlertCircle className={`mt-0.5 h-4 w-4 shrink-0 ${isError ? "text-red-600" : "text-amber-600"}`} />
            <div className="min-w-0">
              <p className="text-xs font-semibold">{isError ? "Erro" : "Atenção"}</p>
              <p className="mt-1 break-words text-xs text-slate-600 dark:text-slate-300">{cleanedNotification}</p>
            </div>
            {onClearNotification && (
              <button
                type="button"
                aria-label="Fechar notificação"
                onClick={onClearNotification}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
