import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Shield, 
  Lock, 
  LogOut, 
  CheckCircle, 
  WifiOff, 
  BarChart3, 
  CalendarRange, 
  FileSpreadsheet, 
  Sparkles,
  Zap,
  Layers,
  Sun,
  Moon,
  TrendingUp,
  AlertCircle,
  X,
  Plus,
  Minus,
  Truck,
  Clock,
  ChevronRight,
  Construction,
  Activity,
  TrendingDown,
  Users,
  Gauge,
  LayoutDashboard,
  PieChart,
  LineChart,
  Database,
  RefreshCw,
  Server,
  Cpu,
  HardDrive,
  GitBranch,
  Menu,
  Sparkle,
  Rocket,
  Target,
  Zap as ZapIcon
} from "lucide-react";
import DashboardAnalitico from "./Dsh";
import Dashboard2 from "./Dashboard2";

// ============================================================
// TYPES
// ============================================================

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  activeTab: "inbound" | "outbound";
  onTabChange: (tab: "inbound" | "outbound") => void;
  currentPage: string;
  onPageChange: (page: string) => void;
  onLogout: () => void;
  notification: string | null;
  theme: "light" | "dark";
  onThemeToggle: () => void;
  onClearNotification?: () => void;
}

type DashboardComponent = React.ComponentType<{
  theme: "light" | "dark";
  showNotification: (msg: string) => void;
}>;

interface DashboardItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  badge: string;
  badgeColor: string;
  component: DashboardComponent | null;
  isAvailable: boolean;
}

// ============================================================
// PLACEHOLDER PARA DASHBOARDS FUTUROS
// ============================================================

const PlaceholderDashboard: DashboardComponent = ({ theme, showNotification }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full py-16 px-6 text-center"
    >
      <div className="max-w-md mx-auto">
        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-12 shadow-xl">
          <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Construction className="w-10 h-10 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-300">Em Desenvolvimento</h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
            Este painel ainda está sendo construído. 
            Em breve estará disponível para consulta.
          </p>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => showNotification("📋 Dashboard em desenvolvimento - Em breve disponível!")}
            className="mt-8 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:shadow-lg transition-all duration-300"
          >
            Notificar quando disponível
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================
// LAYOUT PRINCIPAL
// ============================================================

export default function Layout({ 
  children, 
  user, 
  activeTab, 
  onTabChange, 
  currentPage, 
  onPageChange, 
  onLogout, 
  notification,
  theme,
  onThemeToggle,
  onClearNotification
}: LayoutProps) {
  
  const [expandedDashboardId, setExpandedDashboardId] = useState<string | null>(() => {
    const saved = localStorage.getItem("logistics_expanded_dashboard_id");
    return saved || "capacidades";
  });

  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  useEffect(() => {
    if (expandedDashboardId) {
      localStorage.setItem("logistics_expanded_dashboard_id", expandedDashboardId);
    }
  }, [expandedDashboardId]);

  const dashboards: DashboardItem[] = [
    {
      id: "capacidades",
      title: "Capacidades",
      subtitle: "CD & PPCP Analítico",
      description: "Análise completa de inbound, outbound, recebimento remunerado e projeções.",
      icon: <BarChart3 className="w-5 h-5" />,
      badge: "Ativo",
      badgeColor: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/30",
      component: DashboardAnalitico,
      isAvailable: true,
    },
    {
      id: "dashboard2",
      title: "Performance",
      subtitle: "Capacidade x Recebimento",
      description: "Monitoramento em tempo real do fluxo de inbound, capacidades e desvios.",
      icon: <Activity className="w-5 h-5" />,
      badge: "Ativo",
      badgeColor: "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800/30",
      component: Dashboard2,
      isAvailable: true,
    },
  ];

  const handleToggle = (id: string) => {
    const dashboard = dashboards.find(d => d.id === id);
    
    if (!dashboard?.isAvailable) {
      if (onClearNotification) onClearNotification();
      return;
    }

    setExpandedDashboardId(id);
  };

  const activeDashboard = dashboards.find(d => d.id === expandedDashboardId);
  const ActiveComponent = activeDashboard?.isAvailable ? activeDashboard.component : null;

  const accentTheme = activeTab === "inbound" ? {
    primary: "from-emerald-600 via-emerald-500 to-teal-500",
    secondary: "from-teal-600 to-emerald-700",
    glow: "shadow-emerald-500/10 dark:shadow-emerald-500/5",
    glowHover: "hover:shadow-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50/60 dark:bg-emerald-950/20",
    border: "border-emerald-200 dark:border-emerald-800/30",
    gradient: "bg-gradient-to-r from-emerald-600 to-teal-600",
    ring: "ring-emerald-500/20",
    badge: "bg-emerald-500 text-white",
    tabBg: "bg-emerald-500/5 dark:bg-emerald-500/10",
    pulse: "from-emerald-400 to-teal-400",
    themeColor: "#10b981",
    themeColorDark: "#059669",
    themeColorLight: "rgba(16, 185, 129, 0.08)"
  } : {
    primary: "from-blue-700 via-blue-600 to-indigo-600",
    secondary: "from-blue-600 to-indigo-800",
    glow: "shadow-blue-500/10 dark:shadow-blue-500/5",
    glowHover: "hover:shadow-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50/60 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-800/30",
    gradient: "bg-gradient-to-r from-blue-700 to-indigo-600",
    ring: "ring-blue-500/20",
    badge: "bg-blue-600 text-white",
    tabBg: "bg-blue-500/5 dark:bg-blue-500/10",
    pulse: "from-blue-400 to-indigo-400",
    themeColor: "#2563eb",
    themeColorDark: "#1d4ed8",
    themeColorLight: "rgba(37, 99, 235, 0.08)"
  };

  const shouldShowNotification = (msg: string | null) => {
    if (!msg) return false;
    return msg.includes('❌') || msg.includes('Erro') || msg.includes('erro') || msg.includes('⚠️');
  };

  const cleanMessage = (msg: string) => {
    if (!msg) return '';
    return msg.replace(/[❌⚠️🔍📊📍📅🧹🎯⚡✅]/g, '').trim();
  };

  const renderContent = () => {
    if (currentPage === "dashboard") {
      return (
        <div className="w-full flex-1 flex flex-col gap-6">
          <div className="flex justify-center">
            <div className={`inline-flex items-center gap-1.5 p-1 ${theme === 'dark' ? 'bg-[#080d19]/60 border-slate-800/40' : 'bg-white/60 border-slate-200/40'} border rounded-full shadow-md overflow-x-auto no-scrollbar max-w-full`}>
              {dashboards.map((dash) => {
                const isExpanded = expandedDashboardId === dash.id;
                const isDisabled = !dash.isAvailable;
                const activePillColor = activeTab === "inbound"
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-emerald-500/10"
                  : "bg-gradient-to-r from-blue-600 to-blue-500 shadow-blue-500/10";

                return (
                  <motion.button
                    key={dash.id}
                    whileHover={{ scale: isDisabled ? 1 : 1.02 }}
                    whileTap={{ scale: isDisabled ? 1 : 0.98 }}
                    onClick={() => handleToggle(dash.id)}
                    disabled={isDisabled}
                    className={`relative flex items-center gap-2 px-5 py-2 rounded-full text-[9px] uppercase font-black tracking-wider transition-all duration-300 shrink-0 ${
                      isExpanded
                        ? `${activePillColor} text-white shadow-md`
                        : isDisabled
                          ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-30'
                          : theme === 'dark'
                            ? "text-slate-400 hover:text-white"
                            : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {dash.icon}
                    <span>{dash.title}</span>
                    {dash.isAvailable && !isExpanded && (
                      <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse ml-1" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {expandedDashboardId && ActiveComponent ? (
            <motion.div 
              key={expandedDashboardId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full flex-1 flex flex-col"
            >
              <ActiveComponent 
                theme={theme} 
                user={user}
                showNotification={(msg) => {
                  console.log("[Dashboard]", msg);
                }} 
              />
            </motion.div>
          ) : (
            <div className="w-full py-16 px-6 text-center">
              <p className="text-slate-400 dark:text-slate-500 font-mono text-sm tracking-wide">Nenhum painel selecionado</p>
            </div>
          )}
        </div>
      );
    }
    
    return children;
  };

  const cleanMsg = notification ? cleanMessage(notification) : '';
  const isError = notification ? (notification.includes('❌') || notification.includes('Erro') || notification.includes('erro') || notification.includes('⚠️')) : false;

  const bgClass = theme === "dark"
    ? "bg-[#080c16] text-slate-100"
    : "bg-gradient-to-br from-[#f8fafc] via-[#ffffff] to-[#f1f5f9] text-slate-800";

  const cardBg = theme === "dark"
    ? "bg-slate-900/65 backdrop-blur-md border-slate-800/40"
    : "bg-white/75 backdrop-blur-md border-slate-200/45";

  return (
    <div className={`flex flex-col min-h-screen ${bgClass} transition-colors duration-300 font-sans antialiased relative overflow-x-hidden`}>
      
      {/* Grid blueprint */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, ${theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(128,128,128,0.04)'} 1px, transparent 1px),
              linear-gradient(to bottom, ${theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(128,128,128,0.04)'} 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px'
          }}
        />
        
        {theme === 'dark' && (
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(circle at 2px 2px, rgba(255,255,255,0.03) 1px, transparent 1px)
              `,
              backgroundSize: '12px 12px'
            }}
          />
        )}
        
        {theme === 'dark' && (
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(16,185,129,0.02) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(16,185,129,0.02) 1px, transparent 1px)
              `,
              backgroundSize: '48px 48px',
              backgroundPosition: '24px 24px'
            }}
          />
        )}
      </div>

      {/* Orbes de luz */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute -top-48 -right-48 w-[500px] h-[500px] rounded-full bg-gradient-to-r ${accentTheme.primary} opacity-[0.035] dark:opacity-[0.025] blur-[120px]`} />
        <div className={`absolute -bottom-48 -left-48 w-[500px] h-[500px] rounded-full bg-gradient-to-r ${accentTheme.secondary} opacity-[0.035] dark:opacity-[0.025] blur-[120px]`} />
      </div>

      {/* NOTIFICAÇÃO */}
      <AnimatePresence>
        {notification && shouldShowNotification(notification) && (
          <motion.div 
            initial={{ opacity: 0, y: 15, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.97 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <div className={`${cardBg} border ${isError ? 'border-rose-200 dark:border-rose-900/30' : 'border-amber-200 dark:border-amber-900/30'} rounded-2xl shadow-xl px-5 py-4 flex items-center gap-4 max-w-sm`}>
              <div className={`p-2 rounded-xl ${isError ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/20' : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/20'}`}>
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-[10px] uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  {isError ? 'Erro' : 'Alerta'}
                </p>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">{cleanMsg}</p>
              </div>
              {onClearNotification && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClearNotification}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================
          TOP BAR & HEADER
          ============================================================ */}
      <header className="relative w-full px-6 pt-6 select-none z-10">
        <div className="max-w-7xl mx-auto">
          
          <div className={`relative rounded-2xl ${
            theme === 'dark' 
              ? 'bg-[#0b0f19]/80 border-slate-800/80 shadow-[0_4px_25px_rgba(0,0,0,0.3)]' 
              : 'bg-white/90 border-slate-200/80 shadow-[0_4px_20px_rgba(148,163,184,0.06)]'
          } border backdrop-blur-md px-6 py-3.5 transition-all duration-300`}>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-4">
              
              {/* BRANDING SECTION */}
              <div className="flex items-center gap-4">
                <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 transition-all duration-300 ${
                  activeTab === "inbound" 
                    ? "bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/10" 
                    : "bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-blue-500/10"
                }`}>
                  <Layers className="w-5 h-5 text-white/90" />
                  <span className="absolute inset-0 rounded-xl border border-white/20 animate-pulse" />
                </div>
                
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className={`text-base font-extrabold tracking-tight font-sans leading-none ${
                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>
                      PPCP <span className={activeTab === 'inbound' ? 'text-emerald-500 dark:text-emerald-400' : 'text-blue-500 dark:text-blue-400'}>GPA</span>
                    </span>
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-mono font-bold uppercase tracking-wider ${
                      theme === 'dark' ? 'bg-slate-900/60 text-slate-400 border border-slate-800/40' : 'bg-slate-50 text-slate-500 border border-slate-100'
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${activeTab === 'inbound' ? 'bg-emerald-500' : 'bg-blue-500'} animate-pulse`} />
                      <span>LIVE</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                    LOGÍSTICA INTEGRADA
                  </span>
                </div>
              </div>

              {/* ============================================================
                  🔥 NAVEGAÇÃO - CORRIGIDA
                  ============================================================ */}
              <div className="flex items-center gap-1.5 rounded-xl max-w-full overflow-x-auto no-scrollbar md:flex-1 md:justify-center">
                <div className={`inline-flex items-center gap-1 p-1 rounded-xl ${
                  theme === 'dark' ? 'bg-slate-950/40 border-slate-800/40' : 'bg-slate-100/80 border-slate-200/40'
                } border`}>
                  {[
                    { id: "capacidades", label: "Capacidades", icon: <BarChart3 className="w-3.5 h-3.5" /> },
                    { id: "metas", label: "Planejamento", icon: <Target className="w-3.5 h-3.5" /> },
                    { id: "dashboard", label: "Painel Analítico", icon: <Activity className="w-3.5 h-3.5" /> }
                  ].filter(page => {
                    if (page.id === "dashboard" && user?.role === "ga") {
                      return false;
                    }
                    return true;
                  }).map((page) => {
                    const isActive = currentPage === page.id;
                    
                    return (
                      <button
                        key={page.id}
                        onClick={() => onPageChange(page.id)}
                        className={`relative flex items-center gap-2 px-4.5 py-2 rounded-lg text-[10px] uppercase font-black tracking-wider transition-all duration-200 border whitespace-nowrap cursor-pointer ${
                          isActive
                            ? theme === 'dark'
                              ? 'bg-white/10 text-white border-white/10 shadow-sm'
                              : 'bg-white text-slate-900 border-slate-200 shadow-sm'
                            : theme === 'dark'
                              ? 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                              : 'bg-transparent border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <span className={isActive ? '' : 'opacity-70 group-hover:opacity-100'}>
                          {page.icon}
                        </span>
                        <span>{page.label}</span>
                        
                        {isActive && (
                          <span className={`w-1.5 h-1.5 rounded-full ${activeTab === "inbound" ? "bg-emerald-400" : "bg-blue-400"} ml-0.5`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ============================================================
                  🔥 PROFILE & SYSTEM CONTROLS - CORRIGIDO
                  ============================================================ */}
              <div className="flex items-center gap-3.5 shrink-0 justify-end">
                {user && user.role === "admin" && (
                  <>
                    <button
                      onClick={() => onPageChange("user-control")}
                      className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                        currentPage === "user-control"
                          ? 'border-blue-500 bg-blue-500/15 text-blue-500 dark:text-blue-400'
                          : theme === 'dark' 
                            ? 'border-slate-800 hover:border-slate-700 bg-slate-900/40 text-slate-300 hover:bg-slate-900/80' 
                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Usuários</span>
                    </button>
                    <span className="w-px h-5 bg-slate-300/40 dark:bg-slate-800/40 hidden md:block" />
                  </>
                )}

                {/* 🔥 CORREÇÃO: Exibe o nome do usuário corretamente */}
                <div className="flex flex-col text-right justify-center">
                  <span className={`text-xs font-bold tracking-tight leading-none ${
                    theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    {user?.name || user?.nome || user?.usuario || "Operador"}
                  </span>
                  <span className="text-[8px] font-extrabold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                    {user?.role === "admin" ? "Admin" : user?.role === "ppcp" ? "PPCP" : "GA"}
                  </span>
                </div>

                <span className="w-px h-5 bg-slate-300/40 dark:bg-slate-800/40" />

                <button
                  onClick={onThemeToggle}
                  className={`w-9 h-9 rounded-xl border ${
                    theme === 'dark' 
                      ? 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/80 text-amber-400' 
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                  } flex items-center justify-center transition-all cursor-pointer shadow-sm`}
                  title="Alternar tema"
                >
                  {theme === "dark" ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                </button>

                <button
                  onClick={onLogout}
                  className={`w-9 h-9 rounded-xl border ${
                    theme === 'dark' 
                      ? 'border-slate-800 bg-slate-900/40 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400' 
                      : 'border-slate-200 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600'
                  } flex items-center justify-center transition-all cursor-pointer shadow-sm`}
                  title="Sair do painel"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>
        </div>
      </header>

      <div className="h-6 z-10" />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 pb-10 z-10">
        {renderContent()}
      </main>

      <footer className={`relative border-t ${theme === 'dark' ? 'border-slate-800/20' : 'border-slate-200/20'} px-6 py-4 bg-white/10 dark:bg-slate-950/15 backdrop-blur-[2px] z-10`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-mono font-bold tracking-[0.15em] text-slate-400 dark:text-slate-500 uppercase">
              GPA Logistics © 2026 · PPCP Corporativo
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500">
              SISTEMA CRIADO PELA EQUIPE DE PLANEJAMENTO
            </span>
            <span className="text-[9px] font-mono font-bold tracking-[0.1em] text-slate-400 dark:text-slate-500 uppercase">
              v2.1 · {theme === 'dark' ? 'DARK MODE' : 'LIGHT MODE'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}