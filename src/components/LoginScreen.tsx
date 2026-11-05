import React, { useState, useEffect } from "react";
import { 
  Lock, 
  User as UserIcon, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Zap,
  Building2,
  Mail,
  ArrowLeft,
  CheckCircle,
  UserPlus,
  Sun,
  Moon,
  HelpCircle,
  UserX,
  ShieldAlert,
  Clock,
  Sparkles,
} from "lucide-react";
import { User, UserRole } from "../types";
import AIConfigModal from "./AIConfigModal";

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  theme?: "light" | "dark";
  onThemeToggle?: () => void;
  sessionExpiredNotice?: string | null;
}

export default function LoginScreen({ 
  onLoginSuccess, 
  theme = "dark", 
  onThemeToggle, 
  sessionExpiredNotice 
}: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<"credentials" | "blocked" | "network" | "server" | "user" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAIConfigOpen, setIsAIConfigOpen] = useState(false);

  const isDark = theme === "dark";

  // Contagem de tentativas e bloqueio temporário por segurança
  const [attempts, setAttempts] = useState<number>(() => {
    const saved = localStorage.getItem("login_attempts");
    return saved ? parseInt(saved) : 0;
  });

  const [isBlocked, setIsBlocked] = useState<boolean>(() => {
    const blocked = localStorage.getItem("login_blocked");
    if (blocked) {
      const blockTime = parseInt(blocked);
      const now = Date.now();
      if (now - blockTime < 300000) {
        return true;
      } else {
        localStorage.removeItem("login_blocked");
        localStorage.removeItem("login_attempts");
        return false;
      }
    }
    return false;
  });

  const [blockTimer, setBlockTimer] = useState<number>(0);

  // Modos de tela: Login, Primeiro Acesso e Sucesso
  const [mode, setMode] = useState<"login" | "register" | "success">("login");
  const [regName, setRegName] = useState("");
  const [regLogin, setRegLogin] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Timer para desbloqueio
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isBlocked) {
      const blockTime = parseInt(localStorage.getItem("login_blocked") || "0");
      const remaining = Math.max(0, Math.floor((300000 - (Date.now() - blockTime)) / 1000));
      setBlockTimer(remaining);
      
      interval = setInterval(() => {
        setBlockTimer(prev => {
          if (prev <= 1) {
            setIsBlocked(false);
            localStorage.removeItem("login_blocked");
            localStorage.removeItem("login_attempts");
            setAttempts(0);
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isBlocked]);

  // Validação de Usuário
  const validateUser = (login: string): { valid: boolean; message?: string } => {
    if (!login || login.trim() === "") {
      return { valid: false, message: "Por favor, digite seu usuário ou email." };
    }
    if (login.length < 3) {
      return { valid: false, message: "Usuário deve ter pelo menos 3 caracteres." };
    }
    return { valid: true };
  };

  const validatePassword = (pass: string): { valid: boolean; message?: string } => {
    if (!pass || pass.trim() === "") {
      return { valid: false, message: "Por favor, digite sua senha." };
    }
    if (pass.length < 4) {
      return { valid: false, message: "Senha deve ter pelo menos 4 caracteres." };
    }
    return { valid: true };
  };

  const isUserNotFoundError = (message: string): boolean => {
    const lowerMsg = message.toLowerCase();
    const patterns = [
      "usuário não encontrado",
      "não encontrado",
      "não cadastrado",
      "not found",
      "inexistente",
      "não existe",
      "user not found",
      "invalid username",
      "usuario nao encontrado",
      "usuario nao cadastrado",
      "cadastro não encontrado",
      "login não encontrado",
      "login inexistente"
    ];
    return patterns.some(pattern => lowerMsg.includes(pattern));
  };

  // Submissão de Login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorType(null);

    const userValidation = validateUser(username);
    if (!userValidation.valid) {
      setError(`❌ ${userValidation.message}`);
      setErrorType("user");
      return;
    }

    const passValidation = validatePassword(password);
    if (!passValidation.valid) {
      setError(`❌ ${passValidation.message}`);
      setErrorType("user");
      return;
    }

    if (isBlocked) {
      setError(`🔒 Conta bloqueada. Aguarde ${blockTimer} segundos para tentar novamente.`);
      setErrorType("blocked");
      return;
    }

    // Acesso de demonstração simulado
    if (username.trim() === "74553125" && password.trim() === "1234567") {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        onLoginSuccess({
          username: "74553125",
          name: "Usuário Teste",
          role: "admin",
          token: "dummyHeader.eyJzdWIiOiI3NDU1MzEyNSIsIm5hbWUiOiJVc3XDoXJpbyBUZXN0ZSIsInJvbGUiOiJhZG1pbiIsImV4cCI6OTk5OTk5OTk5OX0.dummySignature"
        });
      }, 500);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          login: username,
          password: password
        })
      });

      if (response.status === 404) {
        setError("❌ Usuário não cadastrado. Verifique suas credenciais ou solicite primeiro acesso.");
        setErrorType("user");
        setIsLoading(false);
        return;
      }

      if (response.status === 401) {
        const errorText = await response.text();
        let errorMsg = "Senha incorreta.";
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.message || errorJson.error || errorMsg;
        } catch (e) {
          if (errorText) errorMsg = errorText;
        }

        if (isUserNotFoundError(errorMsg)) {
          setError("❌ Usuário não cadastrado. Verifique suas credenciais.");
          setErrorType("user");
          setIsLoading(false);
          return;
        }

        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        localStorage.setItem("login_attempts", String(newAttempts));

        if (newAttempts >= 3) {
          setIsBlocked(true);
          localStorage.setItem("login_blocked", String(Date.now()));
          setError("🔒 Conta bloqueada por 5 minutos devido a múltiplas tentativas.");
          setErrorType("blocked");
          setAttempts(0);
          localStorage.removeItem("login_attempts");
          setIsLoading(false);
          return;
        }

        setError(`❌ Senha incorreta. Tentativas restantes: ${3 - newAttempts}`);
        setErrorType("credentials");
        setIsLoading(false);
        return;
      }

      if (response.status === 403) {
        setError("❌ Acesso negado. Você não possui permissão para acessar o sistema.");
        setErrorType("server");
        setIsLoading(false);
        return;
      }

      if (response.status === 500) {
        setError("❌ Erro interno do servidor. Tente novamente em instantes.");
        setErrorType("server");
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `Erro ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.message || errorJson.error || errorMsg;
        } catch (e) {
          errorMsg = errorText || errorMsg;
        }
        
        if (isUserNotFoundError(errorMsg)) {
          setError("❌ Usuário não cadastrado. Solicite seu primeiro acesso.");
          setErrorType("user");
          setIsLoading(false);
          return;
        }
        
        throw new Error(errorMsg);
      }

      setAttempts(0);
      localStorage.removeItem("login_attempts");
      localStorage.removeItem("login_blocked");
      setIsBlocked(false);

      const data = await response.json();
      const token = data.token || data.accessToken || data.jwt || data.id_token;
      if (!token) {
        setError("❌ Token de autenticação não retornado pelo servidor.");
        setErrorType("server");
        setIsLoading(false);
        return;
      }

      const parseJwt = (t: string) => {
        try {
          const base64Url = t.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          return JSON.parse(jsonPayload);
        } catch (err) {
          return null;
        }
      };

      const claims = parseJwt(token) || {};
      let role: UserRole = "ppcp";
      const rawRole = data.role || data.user?.role || claims.role || 
                     (Array.isArray(claims.roles) ? claims.roles[0] : null) || 
                     (Array.isArray(claims.authorities) ? claims.authorities[0] : null) || 
                     claims.authority;

      if (rawRole) {
        const rStr = String(rawRole).toLowerCase();
        if (rStr.includes("admin") || rStr.includes("adm")) {
          role = "admin";
        } else if (rStr.includes("ppcp")) {
          role = "ppcp";
        } else if (rStr.includes("ga")) {
          role = "ga";
        }
      } else {
        const uStr = username.toLowerCase();
        if (uStr.includes("admin") || uStr.includes("adm")) {
          role = "admin";
        } else if (uStr.includes("ppcp")) {
          role = "ppcp";
        } else if (uStr.includes("ga")) {
          role = "ga";
        }
      }

      const name = data.name || data.user?.name || claims.name || claims.sub || username;

      onLoginSuccess({
        username: username,
        name: name,
        role: role,
        token: token
      });

    } catch (err: any) {
      let errorMessage = err.message || "Não foi possível conectar ao servidor.";
      if (isUserNotFoundError(errorMessage)) {
        setError("❌ Usuário não cadastrado.");
        setErrorType("user");
      } else if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError")) {
        setError("❌ Não foi possível conectar ao servidor. Verifique sua conexão de rede.");
        setErrorType("network");
      } else {
        setError(`❌ ${errorMessage}`);
        setErrorType("server");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Submissão de Registro / Primeiro Acesso
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegLoading(true);

    try {
      const response = await fetch("/registro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          name: regName,
          login: Number(regLogin) || regLogin,
          password: regPassword,
          email: regEmail
        })
      });

      if (response.status === 409) {
        setRegError("❌ Este usuário já está cadastrado. Tente realizar login.");
        setRegLoading(false);
        return;
      }

      if (response.status === 400) {
        const errorText = await response.text();
        let errorMsg = "Dados inválidos. Verifique os campos informados.";
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.message || errorJson.error || errorMsg;
        } catch (e) {}
        setRegError(`❌ ${errorMsg}`);
        setRegLoading(false);
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Código de status: ${response.status}`);
      }

      setMode("success");
    } catch (err: any) {
      setRegError(`❌ ${err.message || "Não foi possível conectar ao servidor."}`);
    } finally {
      setRegLoading(false);
    }
  };

  // Esqueci minha senha
  const handleForgotPassword = () => {
    setError("🔑 Para redefinir sua senha, solicite a atualização com o administrador do PPCP.");
    setErrorType("server");
    setTimeout(() => {
      setError(null);
      setErrorType(null);
    }, 6000);
  };

  return (
    <div className={`min-h-screen w-screen relative overflow-hidden flex flex-col justify-between font-sans select-none transition-colors duration-300 ${
      isDark ? "bg-black text-white" : "bg-slate-50 text-slate-900"
    }`}>
      
      {/* ============================================================
          PLANO DE FUNDO: MONTANHAS NEVADAS E CÉU ESTRELADO À DIREITA
          (No tema claro, fica suavizado)
          ============================================================ */}
      <div className={`absolute right-0 top-0 bottom-0 w-full md:w-[62%] lg:w-[60%] pointer-events-none overflow-hidden select-none z-0 transition-opacity duration-300 ${
        isDark ? "opacity-100" : "opacity-20"
      }`}>
        <img
          src="/assets/aistudio/image_359f988c.png"
          alt="Paisagem Noturna Estrelada"
          className="w-full h-full object-cover object-right"
        />
        <div className={`absolute inset-y-0 left-0 w-36 sm:w-64 md:w-80 ${
          isDark
            ? "bg-gradient-to-r from-black via-black/85 to-transparent"
            : "bg-gradient-to-r from-slate-50 via-slate-50/85 to-transparent"
        }`} />
        <div className={`absolute inset-x-0 bottom-0 h-28 ${
          isDark
            ? "bg-gradient-to-t from-black via-black/80 to-transparent"
            : "bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent"
        }`} />
      </div>

      {/* ============================================================
          BARRA SUPERIOR DISCRETA (DEMO SHORTCUT + TEMA)
          ============================================================ */}
      <header className="relative z-20 w-full px-6 sm:px-12 pt-6 flex items-center justify-between pointer-events-auto">
        

        {onThemeToggle && (
          <button
            onClick={onThemeToggle}
            className={`p-2 rounded-full border transition-colors cursor-pointer backdrop-blur-md ${
              isDark
                ? "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white"
                : "bg-black/5 hover:bg-black/10 border-black/10 text-slate-600 hover:text-slate-900"
            }`}
            title="Alternar tema"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        )}
      </header>

      {/* ============================================================
          ÁREA CENTRAL: FORMULÁRIO ALINHADO À ESQUERDA
          ============================================================ */}
      <main className="relative z-10 w-full max-w-md px-6 sm:px-12 md:px-0 md:ml-16 lg:ml-28 xl:ml-36 py-8 my-auto">
        
        {/* ========================================
            MODO: LOGIN
            ======================================== */}
        {mode === "login" && (
          <div className="w-full">
            {/* Título com ponto gradiente rosa/coral */}
            <h1 className={`text-4xl sm:text-5xl font-bold tracking-tight mb-1 sm:mb-3 ${
              isDark ? "text-white" : "text-slate-900"
            }`}>
              Faça seu Login<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-fuchsia-400 to-rose-400 font-extrabold"></span>
            </h1>

            <h1 className={`text-1xl sm:text-2xl font-bold tracking-tight mb-8 sm:mb-10 ${
              isDark ? "text-white" : "text-slate-900"
            }`}>
              Portal Planejamento<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-fuchsia-400 to-rose-400 font-extrabold"> PPCP</span>
            </h1>

            {/* Aviso de sessão expirada se houver */}
            {sessionExpiredNotice && !error && (
              <div className={`mb-6 p-3.5 rounded-xl text-xs flex items-start gap-2.5 backdrop-blur-md border ${
                isDark
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "bg-amber-50 border-amber-300 text-amber-800"
              }`}>
                <Clock className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? "text-amber-400" : "text-amber-600"}`} />
                <span>{sessionExpiredNotice}</span>
              </div>
            )}

            {/* Mensagem de Erro / Alerta com animação */}
            {error && (
              <div className={`mb-6 p-3.5 rounded-xl text-xs flex items-start gap-2.5 backdrop-blur-md border animate-in fade-in ${
                isDark
                  ? "bg-rose-500/15 border-rose-500/30 text-rose-300"
                  : "bg-rose-50 border-rose-300 text-rose-700"
              }`}>
                <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? "text-rose-400" : "text-rose-600"}`} />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Bloqueio de tentativas */}
            {isBlocked && (
              <div className={`mb-6 p-3.5 rounded-xl text-xs flex items-center gap-2.5 border ${
                isDark
                  ? "bg-rose-950/40 border-rose-500/40 text-rose-300"
                  : "bg-rose-50 border-rose-300 text-rose-700"
              }`}>
                <Lock className={`w-4 h-4 ${isDark ? "text-rose-400" : "text-rose-600"}`} />
                <span>Conta temporariamente bloqueada. Aguarde {blockTimer}s.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Campo: Email / Login */}
              <div>
                <label className={`text-xs sm:text-sm font-normal mb-2.5 block tracking-wide ${
                  isDark ? "text-slate-300" : "text-slate-600"
                }`}>
                  Cadastro
                </label>
                
                <div className={`relative rounded-2xl p-[1.5px] bg-gradient-to-r from-blue-600/80 via-purple-500/70 to-amber-400/90 focus-within:from-blue-500 focus-within:via-purple-400 focus-within:to-amber-300 transition-all duration-300 ${
                  isDark
                    ? "shadow-sm focus-within:shadow-[0_0_20px_rgba(168,85,247,0.22)]"
                    : "shadow-sm focus-within:shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                }`}>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isBlocked}
                    placeholder=""
                    required
                    autoComplete="username"
                    className={`w-full backdrop-blur-md px-5 py-3.5 sm:py-4 rounded-[14.5px] text-sm sm:text-base outline-none focus:outline-none transition-colors ${
                      isDark
                        ? "bg-[#050711]/90 text-white"
                        : "bg-white/95 text-slate-900"
                    }`}
                  />
                </div>
              </div>

              {/* Campo: Senha */}
              <div>
                <label className={`text-xs sm:text-sm font-normal mb-2.5 block tracking-wide ${
                  isDark ? "text-slate-300" : "text-slate-600"
                }`}>
                  Senha
                </label>
                
                <div className={`relative rounded-2xl p-[1.5px] bg-gradient-to-r from-blue-600/80 via-purple-500/70 to-amber-400/90 focus-within:from-blue-500 focus-within:via-purple-400 focus-within:to-amber-300 transition-all duration-300 ${
                  isDark
                    ? "shadow-sm focus-within:shadow-[0_0_20px_rgba(168,85,247,0.22)]"
                    : "shadow-sm focus-within:shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                }`}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isBlocked}
                    placeholder=""
                    required
                    autoComplete="current-password"
                    className={`w-full backdrop-blur-md pl-5 pr-12 py-3.5 sm:py-4 rounded-[14.5px] text-sm sm:text-base outline-none focus:outline-none transition-colors ${
                      isDark
                        ? "bg-[#050711]/90 text-white"
                        : "bg-white/95 text-slate-900"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors cursor-pointer ${
                      isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
                    }`}
                    title={showPassword ? "Ocultar senha" : "Ver senha"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex justify-end mt-2.5">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className={`text-xs sm:text-sm underline underline-offset-4 cursor-pointer transition-colors ${
                      isDark ? "text-slate-200 hover:text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Esqueci minha senha
                  </button>
                </div>
              </div>

              {/* Botão de Entrar */}
              <button
                type="submit"
                disabled={isLoading || isBlocked}
                className={`w-full mt-7 sm:mt-9 py-3.5 sm:py-4 rounded-2xl font-bold text-base sm:text-lg text-white bg-gradient-to-r from-[#5a3b9e] via-[#a3448d] to-[#d87c6b] hover:opacity-95 active:scale-[0.99] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg ${
                  isDark ? "shadow-purple-950/40" : "shadow-purple-900/20"
                }`}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Entrar</span>
                )}
              </button>

              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setRegError(null);
                    setMode("register");
                  }}
                  className={`text-xs sm:text-sm underline underline-offset-4 cursor-pointer transition-colors ${
                    isDark ? "text-slate-200 hover:text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Ainda não tenho uma conta
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================
            MODO: PRIMEIRO ACESSO / REGISTRO
            ======================================== */}
        {mode === "register" && (
          <div className="w-full animate-in fade-in duration-200">
            <h1 className={`text-3xl sm:text-4xl font-bold tracking-tight mb-2 ${
              isDark ? "text-white" : "text-slate-900"
            }`}>
              Primeiro Acesso<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-400">.</span>
            </h1>
            <p className={`text-xs mb-6 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Informe seus dados para solicitar liberação de acesso ao sistema
            </p>

            {regError && (
              <div className={`mb-4 p-3 rounded-xl text-xs flex items-start gap-2 border ${
                isDark
                  ? "bg-rose-500/15 border-rose-500/30 text-rose-300"
                  : "bg-rose-50 border-rose-300 text-rose-700"
              }`}>
                <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? "text-rose-400" : "text-rose-600"}`} />
                <span>{regError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className={`text-xs mb-1.5 block ${isDark ? "text-slate-300" : "text-slate-600"}`}>Nome Completo</label>
                <div className="rounded-xl p-[1.5px] bg-gradient-to-r from-blue-600/80 via-purple-500/70 to-amber-400/90">
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Seu nome"
                    className={`w-full px-4 py-2.5 rounded-[10.5px] text-sm outline-none transition-colors ${
                      isDark ? "bg-[#050711]/90 text-white placeholder-slate-500" : "bg-white text-slate-900 placeholder-slate-400"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`text-xs mb-1.5 block ${isDark ? "text-slate-300" : "text-slate-600"}`}>Usuário (Matrícula / Cadastro)</label>
                <div className="rounded-xl p-[1.5px] bg-gradient-to-r from-blue-600/80 via-purple-500/70 to-amber-400/90">
                  <input
                    type="text"
                    required
                    value={regLogin}
                    onChange={(e) => setRegLogin(e.target.value)}
                    placeholder="Ex: 74553"
                    className={`w-full px-4 py-2.5 rounded-[10.5px] text-sm outline-none transition-colors ${
                      isDark ? "bg-[#050711]/90 text-white placeholder-slate-500" : "bg-white text-slate-900 placeholder-slate-400"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`text-xs mb-1.5 block ${isDark ? "text-slate-300" : "text-slate-600"}`}>E-mail Corporativo</label>
                <div className="rounded-xl p-[1.5px] bg-gradient-to-r from-blue-600/80 via-purple-500/70 to-amber-400/90">
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="nome@gpa.com.br"
                    className={`w-full px-4 py-2.5 rounded-[10.5px] text-sm outline-none transition-colors ${
                      isDark ? "bg-[#050711]/90 text-white placeholder-slate-500" : "bg-white text-slate-900 placeholder-slate-400"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`text-xs mb-1.5 block ${isDark ? "text-slate-300" : "text-slate-600"}`}>Senha Desejada</label>
                <div className="rounded-xl p-[1.5px] bg-gradient-to-r from-blue-600/80 via-purple-500/70 to-amber-400/90 relative">
                  <input
                    type={showRegPassword ? "text" : "password"}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className={`w-full pl-4 pr-10 py-2.5 rounded-[10.5px] text-sm outline-none transition-colors ${
                      isDark ? "bg-[#050711]/90 text-white placeholder-slate-500" : "bg-white text-slate-900 placeholder-slate-400"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                      isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
                    isDark
                      ? "border-white/20 text-slate-300 hover:text-white"
                      : "border-slate-300 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={regLoading}
                  className={`flex-1 py-3 rounded-xl bg-gradient-to-r from-[#5a3b9e] via-[#a3448d] to-[#d87c6b] text-white text-sm font-bold hover:opacity-95 cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
                    isDark ? "shadow-purple-950/40" : "shadow-purple-900/20"
                  }`}
                >
                  {regLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span>Solicitar Acesso</span>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================
            MODO: SUCESSO NO CADASTRO
            ======================================== */}
        {mode === "success" && (
          <div className="w-full text-center py-4 animate-in fade-in">
            <div className={`w-14 h-14 rounded-full border flex items-center justify-center mx-auto mb-4 ${
              isDark
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                : "bg-emerald-50 border-emerald-300 text-emerald-600"
            }`}>
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
              Solicitação Enviada!
            </h2>
            <p className={`text-xs mb-6 leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              Olá, <strong>{regName}</strong>! Sua solicitação para o usuário <strong>{regLogin}</strong> foi encaminhada para homologação pelo administrador do PPCP.
            </p>
            <button
              type="button"
              onClick={() => {
                setRegName("");
                setRegLogin("");
                setRegPassword("");
                setRegEmail("");
                setMode("login");
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#5a3b9e] via-[#a3448d] to-[#d87c6b] text-white text-sm font-bold cursor-pointer"
            >
              Voltar para o Login
            </button>
          </div>
        )}

      </main>

      {/* ============================================================
          RODAPÉ CENTRALIZADO
          ============================================================ */}
      <footer className="relative z-10 w-full py-5 text-center pointer-events-auto">
        <p className={`text-xs sm:text-sm tracking-wide font-normal ${
          isDark ? "text-slate-300/80" : "text-slate-500"
        }`}>
          
          <span className={`underline underline-offset-4 transition-colors cursor-pointer font-medium ${
            isDark ? "text-white hover:text-purple-300" : "text-slate-900 hover:text-purple-600"
          }`}>
            PPCP - Planejamento e Controle de Produção
          </span>
        </p>
      </footer>

      {/* Modal de Configuração de IA (se aplicável) */}
      <AIConfigModal
        isOpen={isAIConfigOpen}
        onClose={() => setIsAIConfigOpen(false)}
        theme={theme}
        onOpenChatWithQuestion={(question) => {
          window.dispatchEvent(new CustomEvent('toggle-ai-bot', { 
            detail: { action: 'ask', question } 
          }));
        }}
      />
    </div>
  );
}