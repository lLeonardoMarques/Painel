import React, { useState, useEffect, useCallback, useMemo } from "react";
import { User } from "./types";
import LoginScreen from "./components/LoginScreen";
import Layout from "./components/Layout";
import Capacidades from "./components/Capacidades";
import Capacidade_Mes from "./components/Capacidade_Mes";
import EditMonthModal from "./components/EditMonthModal";
import UserControlPage from "./components/Usuarios";
import PainelGerencial from "./components/PainelGerencial";
import PainelRegionais from "./components/PainelRegionais";
import AlertaCategorias from "./components/AlertasCategorias";
import ManhattanCapacidades from "./components/ManhattanCapacidades";
import ProjecaoOcupacaoCD from "./components/ProjecaoOcupacaoCD";
import PainelPFA from "./components/pfa/PainelPFA";
import LancarRealizado from "./components/LancarRealizado";
import Inicio, { registrarAcesso } from "./components/Inicio";

// ============================================
// 🔥 CONSTANTES DE CONFIGURAÇÃO
// ============================================
const STORAGE_KEYS = {
  USER: "logistics_user",
  THEME: "logistics_theme",
  ACTIVE_TAB: "logistics_active_tab",
  CURRENT_PAGE: "logistics_current_page",
  SESSION_LOADED: "app_session_loaded",
  SESSION_LOGIN_TIME: "logistics_session_login_time",
  SESSION_EXPIRED_NOTICE: "logistics_session_expired_notice",
} as const;

// 1 hora de validade da sessão (60 minutos = 3.600.000 ms)
const SESSION_DURATION_MS = 60 * 60 * 1000;
const DEFAULT_PAGE = "inicio";
const DEFAULT_TAB = "outbound";
const DEFAULT_THEME = "dark";
const NOTIFICATION_DURATION = 4000;

// ============================================
// 🔥 HELPER: Gerenciamento de Sessão
// ============================================
const sessionManager = {
  isFirstLoad: (): boolean => {
    return !sessionStorage.getItem(STORAGE_KEYS.SESSION_LOADED);
  },
  markAsLoaded: (): void => {
    sessionStorage.setItem(STORAGE_KEYS.SESSION_LOADED, "true");
  },
  clear: (): void => {
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_LOADED);
  },
};

const storageManager = {
  getUser: (): User | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      if (!saved) return null;

      // 🔥 Checagem de expiração de sessão após 1 hora
      const loginTimeStr = localStorage.getItem(STORAGE_KEYS.SESSION_LOGIN_TIME);
      if (loginTimeStr) {
        const loginTime = parseInt(loginTimeStr, 10);
        if (!isNaN(loginTime) && Date.now() - loginTime >= SESSION_DURATION_MS) {
          console.warn("⏳ Sessão expirada após 1 hora. Limpando dados do usuário.");
          storageManager.removeUser(true);
          return null;
        }
      } else {
        localStorage.setItem(STORAGE_KEYS.SESSION_LOGIN_TIME, String(Date.now()));
      }

      const parsed = JSON.parse(saved);
      return parsed.token ? parsed : null;
    } catch {
      return null;
    }
  },
  saveUser: (user: User): void => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEYS.SESSION_LOGIN_TIME, String(Date.now()));
    localStorage.removeItem(STORAGE_KEYS.SESSION_EXPIRED_NOTICE);
  },
  removeUser: (isExpired: boolean = false): void => {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.SESSION_LOGIN_TIME);
    localStorage.removeItem("auth_token");
    if (isExpired) {
      localStorage.setItem(STORAGE_KEYS.SESSION_EXPIRED_NOTICE, "true");
    } else {
      localStorage.removeItem(STORAGE_KEYS.SESSION_EXPIRED_NOTICE);
    }
  },
  getSessionTimeRemaining: (): number => {
    const loginTimeStr = localStorage.getItem(STORAGE_KEYS.SESSION_LOGIN_TIME);
    if (!loginTimeStr) return 0;
    const loginTime = parseInt(loginTimeStr, 10);
    if (isNaN(loginTime)) return 0;
    const elapsed = Date.now() - loginTime;
    return Math.max(0, SESSION_DURATION_MS - elapsed);
  },
  hasSessionExpiredNotice: (): boolean => {
    return localStorage.getItem(STORAGE_KEYS.SESSION_EXPIRED_NOTICE) === "true";
  },
  clearSessionExpiredNotice: (): void => {
    localStorage.removeItem(STORAGE_KEYS.SESSION_EXPIRED_NOTICE);
  },
  getTheme: (): "light" | "dark" => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return (saved === "light" || saved === "dark") ? saved : DEFAULT_THEME;
  },
  getActiveTab: (): "inbound" | "outbound" => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB);
    return (saved === "inbound" || saved === "outbound") ? saved : DEFAULT_TAB;
  },
  getCurrentPage: (): string => {
    const page = localStorage.getItem(STORAGE_KEYS.CURRENT_PAGE) || DEFAULT_PAGE;
    // versões anteriores do PFA usavam "pfa" e "pfa-<processo>": abre no Planejamento Fim de Ano
    if (page === "pfa" || page.startsWith("pfa-")) return "pfa/planejamento/recebimento";
    // "Ocupação e Estoque" (dashboard) foi removido do menu
    if (page === "dashboard") return DEFAULT_PAGE;
    return page;
  },
};

export default function App() {
  // ============================================
  // 🔥 ESTADOS PRINCIPAIS
  // ============================================
  const [user, setUser] = useState<User | null>(() => {
    // 🔥 SÓ RESTAURA SE NÃO FOR PRIMEIRA CARGA
    if (!sessionManager.isFirstLoad()) {
      return storageManager.getUser();
    }
    return null;
  });
  
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<string | null>(() => {
    if (storageManager.hasSessionExpiredNotice()) {
      storageManager.clearSessionExpiredNotice();
      return "Sua sessão expirou após 1 hora de uso contínuo por motivos de segurança. Por favor, realize o login novamente.";
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [theme, setTheme] = useState<"light" | "dark">(storageManager.getTheme);
  const [activeTab, setActiveTab] = useState<"inbound" | "outbound">(storageManager.getActiveTab);
  const [currentPage, setCurrentPage] = useState<string>(storageManager.getCurrentPage);
  
  // ============================================
  // 🔥 UI STATES
  // ============================================
  const [isMonthModalOpen, setIsMonthModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [notificationTimer, setNotificationTimer] = useState<NodeJS.Timeout | null>(null);

  // ============================================
  // 🔥 INICIALIZAÇÃO DA SESSÃO
  // ============================================
  useEffect(() => {
    const initSession = () => {
      if (sessionManager.isFirstLoad()) {
        console.log("🔐 Primeira carga - Redirecionando para login");
        storageManager.removeUser();
        setUser(null);
        sessionManager.markAsLoaded();
      } else {
        const savedUser = storageManager.getUser();
        if (savedUser) {
          console.log("🔄 Recarregando - Restaurando sessão:", savedUser.username);
          setUser(savedUser);
        }
      }
      setIsLoading(false);
    };

    initSession();
  }, []);

  // ============================================
  // 🔥 PERSISTÊNCIA DE ESTADOS
  // ============================================
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_PAGE, currentPage);
    registrarAcesso(currentPage); // alimenta o "Acesso rápido" da tela inicial
  }, [currentPage]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  // ============================================
  // 🔥 CONTROLE DE ACESSO (GA e Admin)
  // ============================================
  useEffect(() => {
    if (!user) return;

    // "Ocupação e Estoque" (dashboard) foi removido do sistema
    if (currentPage === "dashboard") {
      setCurrentPage(DEFAULT_PAGE);
      return;
    }

    // 🔥 Não-admin não pode acessar Controle de Usuários nem o lançamento do realizado
    if (user.role !== "admin" && (currentPage === "user-control" || currentPage === "lancar-realizado")) {
      setCurrentPage(DEFAULT_PAGE);
      return;
    }
  }, [user, currentPage]);

  // ============================================
  // 🔥 NOTIFICATIONS (com cleanup)
  // ============================================
  const showNotification = useCallback((msg: string) => {
    // Limpa timer anterior
    if (notificationTimer) {
      clearTimeout(notificationTimer);
      setNotificationTimer(null);
    }

    setNotification(msg);

    const timer = setTimeout(() => {
      setNotification(null);
      setNotificationTimer(null);
    }, NOTIFICATION_DURATION);

    setNotificationTimer(timer);
  }, [notificationTimer]);

  // Cleanup notification timer
  useEffect(() => {
    return () => {
      if (notificationTimer) {
        clearTimeout(notificationTimer);
      }
    };
  }, [notificationTimer]);

  // ============================================
  // 🔥 HANDLERS & SESSION MONITOR
  // ============================================
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  }, []);

  const handleLogout = useCallback(() => {
    storageManager.removeUser(false);
    sessionManager.clear();
    setUser(null);
    setSessionExpiredNotice(null);
    setCurrentPage(DEFAULT_PAGE);
    setActiveTab(DEFAULT_TAB);
    console.log("🚪 Usuário deslogado");
  }, []);

  const handleSessionExpired = useCallback(() => {
    console.warn("🚨 Sessão expirada: 1 hora de uso contínuo atingida.");
    storageManager.removeUser(true);
    sessionManager.clear();
    setUser(null);
    setSessionExpiredNotice("Sua sessão expirou após 1 hora de uso contínuo por motivos de segurança. Por favor, realize o login novamente.");
    setCurrentPage(DEFAULT_PAGE);
    setActiveTab(DEFAULT_TAB);
  }, []);

  // 🔥 Monitor de Expiração da Sessão (1 Hora)
  useEffect(() => {
    if (!user) return;

    const checkSession = () => {
      const remaining = storageManager.getSessionTimeRemaining();
      if (remaining <= 0) {
        handleSessionExpired();
      }
    };

    // Verificação imediata
    const remaining = storageManager.getSessionTimeRemaining();
    if (remaining <= 0) {
      handleSessionExpired();
      return;
    }

    // Timer preciso para exatamente 1 hora
    const expiryTimer = setTimeout(() => {
      handleSessionExpired();
    }, remaining);

    // Intervalo de segurança a cada 10s (para checar hibernação ou background tabs)
    const interval = setInterval(checkSession, 10000);

    // Eventos de ativação/foco da janela
    window.addEventListener("focus", checkSession);
    document.addEventListener("visibilitychange", checkSession);

    return () => {
      clearTimeout(expiryTimer);
      clearInterval(interval);
      window.removeEventListener("focus", checkSession);
      document.removeEventListener("visibilitychange", checkSession);
    };
  }, [user, handleSessionExpired]);

  const handleLoginSuccess = useCallback((userData: User) => {
    storageManager.saveUser(userData);
    sessionManager.markAsLoaded();
    setSessionExpiredNotice(null);
    setUser(userData);
    setCurrentPage(DEFAULT_PAGE);
    setActiveTab(DEFAULT_TAB);
    console.log("✅ Login bem-sucedido:", userData.username);
  }, []);

  // ============================================
  // 🔥 SAVE MONTH CAPACITY
  // ============================================
  const handleSaveMonthCapacity = useCallback(async (payload: any) => {
    const endpoint = activeTab === 'inbound' 
      ? '/api/Metas/Inbound' 
      : '/api/Metas/Outbound';
    
    try {
      const headers: Record<string, string> = { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      };
      
      if (user?.token) {
        headers["Authorization"] = `Bearer ${user.token}`;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const msg = errData.error || `HTTP ${response.status}`;
        showNotification(`❌ ${msg}`);
        throw new Error(msg);
      }

      showNotification(`✅ Meta ${activeTab === 'inbound' ? 'Inbound' : 'Outbound'} salva com sucesso!`);
    } catch (err: any) {
      if (!err.message || (!err.message.includes("Operação Bloqueada") && !err.message.includes("Já existem"))) {
        showNotification("❌ Erro ao salvar meta.");
      }
      throw err;
    }
  }, [activeTab, user?.token, showNotification]);

  // ============================================
  // 🔥 LOADING SCREEN
  // ============================================
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-2xl animate-pulse" />
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin relative" />
          </div>
          <p className="text-slate-400 text-sm font-medium animate-pulse">
            Carregando sistema...
          </p>
          <div className="flex gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 bg-blue-500/40 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <span className="w-1.5 h-1.5 bg-blue-500/40 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
            <span className="w-1.5 h-1.5 bg-blue-500/40 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // 🔥 RENDER: LOGIN
  // ============================================
  if (!user) {
    return (
      <>
        <LoginScreen 
          onLoginSuccess={handleLoginSuccess}
          theme={theme}
          onThemeToggle={toggleTheme}
          sessionExpiredNotice={sessionExpiredNotice}
        />
        
      </>
    );
  }

  // ============================================
  // 🔥 RENDER: APP LOGADO
  // ============================================
  return (
    <div className={theme === "dark" 
      ? "dark bg-[#0a0e1a] min-h-screen text-slate-100 transition-colors duration-300" 
      : "light bg-[#fbfcfd] min-h-screen text-slate-900 transition-colors duration-300"
    }>
      <Layout
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onLogout={handleLogout}
        notification={notification}
        theme={theme}
        onThemeToggle={toggleTheme}
      >
        {currentPage === "inicio" && (
          <Inicio user={user} theme={theme} onPageChange={setCurrentPage} />
        )}

        {currentPage === "capacidades" && (
          <Capacidades 
            activeTab={activeTab} 
            user={user} 
            showNotification={showNotification} 
            onOpenMetasModal={() => setIsMonthModalOpen(true)}
            onTabChange={setActiveTab}
          />
        )}
        
        {currentPage === "metas" && (
          <Capacidade_Mes 
            currentUser={user} 
            showNotification={showNotification} 
            theme={theme}
          />
        )}
        
        {currentPage === "painel-gerencial" && (
          <PainelGerencial 
            theme={theme} 
            showNotification={showNotification} 
            user={user} 
            onPageChange={setCurrentPage}
            onThemeToggle={toggleTheme}
            onLogout={handleLogout}
          />
        )}

        {currentPage === "painel-regionais" && (
          <PainelRegionais 
            theme={theme} 
            showNotification={showNotification} 
            user={user} 
            onPageChange={setCurrentPage}
            onThemeToggle={toggleTheme}
            onLogout={handleLogout}
          />
        )}

        {currentPage === "alerta-categorias" && (
          <AlertaCategorias 
            theme={theme} 
            showNotification={showNotification} 
            user={user} 
            onPageChange={setCurrentPage}
            onThemeToggle={toggleTheme}
            onLogout={handleLogout}
          />
        )}

        {currentPage === "manhattan-capacidades" && (
          <ManhattanCapacidades
            theme={theme}
            showNotification={showNotification}
            user={user}
            onPageChange={setCurrentPage}
            onThemeToggle={toggleTheme}
            onLogout={handleLogout}
          />
        )}

        {currentPage === "projecao-cd" && (
          <ProjecaoOcupacaoCD
            theme={theme}
            showNotification={showNotification}
            onPageChange={setCurrentPage}
          />
        )}

        {currentPage.startsWith("pfa/") && (
          <div className="flex min-h-0 flex-1 flex-col">
            {/* página "pfa/<modo>/<processo>", escolhida no menu PFA */}
            <PainelPFA theme={theme} modo={currentPage.split("/")[1]} aba={currentPage.split("/")[2]} />
          </div>
        )}

        {currentPage === "lancar-realizado" && user?.role === "admin" && (
          <LancarRealizado theme={theme} showNotification={showNotification} />
        )}

        {currentPage === "user-control" && user?.role === "admin" && (
          <UserControlPage 
            user={user} 
            theme={theme} 
            onBack={() => setCurrentPage(DEFAULT_PAGE)} 
          />
        )}

        <EditMonthModal
          isOpen={isMonthModalOpen}
          onClose={() => setIsMonthModalOpen(false)}
          onSave={handleSaveMonthCapacity}
          editMode={activeTab}
        />
      </Layout>

      {/* Robô Assistente de IA Flutuante */}
      
    </div>
  );
}