import React, { useState, useEffect } from "react";
import { 
  Bot, 
  X, 
  Key, 
  Cpu, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  Sliders, 
  Database, 
  RefreshCw, 
  Building, 
  ShieldCheck, 
  ExternalLink,
  Eye,
  EyeOff,
  Terminal
} from "lucide-react";

interface AIConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: "light" | "dark";
  onOpenChatWithQuestion?: (question: string) => void;
  apiUrl?: string;
}

export default function AIConfigModal({
  isOpen,
  onClose,
  theme = "dark",
  onOpenChatWithQuestion,
  apiUrl = "http://localhost:3001"
}: AIConfigModalProps) {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [temperature, setTemperature] = useState(0.2);
  const [selectedModel, setSelectedModel] = useState("llama3-8b-8192");
  
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    sampleResponse?: string;
  } | null>(null);

  const [status, setStatus] = useState<{
    active: boolean;
    hasApiKey: boolean;
    model: string;
    temperature: number;
    indexedCds: number[];
    totalCapacidadesDiarias: number;
    totalMetasOutbound: number;
    totalMetasInbound: number;
  }>({
    active: true,
    hasApiKey: false,
    model: "llama3-8b-8192",
    temperature: 0.2,
    indexedCds: [1965, 941, 7801, 930, 1942, 409, 1953, 1984, 1974, 1979],
    totalCapacidadesDiarias: 44,
    totalMetasOutbound: 5,
    totalMetasInbound: 12
  });

  const isDark = theme === "dark";

  // 🔥 FUNÇÃO PARA PEGAR O TOKEN DO USUÁRIO
  const getUserToken = (): string | null => {
    try {
      const userData = localStorage.getItem("logistics_user");
      if (userData) {
        const parsed = JSON.parse(userData);
        return parsed.token || null;
      }
    } catch (e) {
      console.error("Erro ao pegar token:", e);
    }
    return null;
  };

  const loadStatus = async () => {
    try {
      const token = getUserToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${apiUrl}/api/bot/status`, { headers });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.temperature !== undefined) setTemperature(data.temperature);
        if (data.model) setSelectedModel(data.model);
      }
    } catch (e) {
      console.error("Erro ao carregar status:", e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      setTestResult(null);
    }
  }, [isOpen]);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    setTestResult(null);
    try {
      const body: any = {
        temperature,
        model: selectedModel
      };
      if (apiKeyInput.trim()) {
        body.apiKey = apiKeyInput.trim();
      }

      const token = getUserToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${apiUrl}/api/bot/config`, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const data = await res.json();
        await loadStatus();
        setTestResult({
          success: true,
          message: "Configuração atualizada com sucesso! 🚀"
        });
        setApiKeyInput("");
      } else {
        throw new Error("Falha ao salvar configurações.");
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Erro ao salvar."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const token = getUserToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${apiUrl}/api/bot/test`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          apiKey: apiKeyInput.trim() || undefined,
          token: token // 🔥 ENVIA O TOKEN NO BODY
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || "Conexão com Llama via Groq estabelecida com sucesso! 🎉",
          sampleResponse: data.sampleResponse
        });
        loadStatus();
      } else {
        setTestResult({
          success: false,
          message: data.error || "Erro ao testar chave de API Groq."
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Falha na requisição de teste."
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div 
        className={`w-full max-w-2xl rounded-3xl shadow-2xl border flex flex-col overflow-hidden my-auto max-h-[92vh] ${
          isDark 
            ? 'bg-[#0f172a] border-slate-700 text-white shadow-black/80' 
            : 'bg-white border-slate-200 text-slate-800 shadow-2xl'
        }`}
      >
        {/* HEADER */}
        <div className={`p-5 border-b flex items-center justify-between shrink-0 ${
          isDark 
            ? 'bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border-slate-800' 
            : 'bg-gradient-to-r from-blue-50 via-indigo-50 to-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Configuração da IA - Llama 3</h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-mono text-[10px] font-bold">
                  Groq API
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Parâmetros do modelo Llama 3 para o Robô Assistente de Logística
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CORPO MODAL SCROLLABLE */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs">
          
          {/* PAINEL DE STATUS GERAL DA IA */}
          <div className={`p-4 rounded-2xl border ${
            isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs">Status do Motor de Inteligência (Llama 3)</span>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                status.hasApiKey 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.hasApiKey ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {status.hasApiKey ? "Llama 3 via Groq Ativo" : "Base Local Grounded Ativa"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200'}`}>
                <span className={`block text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>CDs Conhecidos</span>
                <span className="font-bold text-sm text-blue-400">10 CDs Ativos</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200'}`}>
                <span className={`block text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Capacidades Diárias</span>
                <span className="font-bold text-sm text-indigo-400">{status.totalCapacidadesDiarias} registros</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200'}`}>
                <span className={`block text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Metas Outbound</span>
                <span className="font-bold text-sm text-cyan-400">{status.totalMetasOutbound} cadastradas</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200'}`}>
                <span className={`block text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Metas Inbound</span>
                <span className="font-bold text-sm text-emerald-400">{status.totalMetasInbound} cadastradas</span>
              </div>
            </div>
          </div>

          {/* CONFIGURAÇÃO DA CHAVE GROQ API */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-xs flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-blue-400" />
                <span>Chave de API do Groq (GROQ_API_KEY)</span>
              </label>
              <span className={`text-[10px] ${status.hasApiKey ? 'text-emerald-400' : 'text-slate-400'}`}>
                {status.hasApiKey ? "✓ Chave configurada no ambiente" : "Chave opcional / Fallback local pronto"}
              </span>
            </div>

            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={status.hasApiKey ? "•••••••••••••••••••••••• (Chave salva)" : "Insira sua GROQ_API_KEY aqui..."}
                className={`w-full py-2.5 pl-3.5 pr-10 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 transition-all ${
                  isDark
                    ? 'bg-slate-900 border border-slate-700 focus:border-blue-500 focus:ring-blue-500/20 text-white placeholder-slate-500'
                    : 'bg-slate-100 border border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 text-slate-800 placeholder-slate-400'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              🔑 <strong>Obtenha sua chave gratuita:</strong> acesse <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">console.groq.com</a>, crie uma conta e gere uma API Key. O Llama 3 via Groq é <strong>totalmente gratuito</strong> com limites generosos para testes e produção.
            </p>
          </div>

          {/* PARÂMETROS DO MODELO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* MODELO SELECIONADO */}
            <div className="space-y-1.5">
              <label className="font-bold text-xs flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span>Modelo Llama 3</span>
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 ${
                  isDark
                    ? 'bg-slate-900 border border-slate-700 text-white focus:border-blue-500'
                    : 'bg-slate-100 border border-slate-300 text-slate-800 focus:border-blue-500'
                }`}
              >
                <option value="llama3-8b-8192">llama3-8b-8192 (Recomendado / Rápido)</option>
                <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Mais Potente)</option>
                <option value="llama3-70b-8192">llama3-70b-8192 (Alta Capacidade)</option>
                <option value="mixtral-8x7b-32768">mixtral-8x7b-32768 (Alternativa)</option>
              </select>
            </div>

            {/* TEMPERATURA / CRIATIVIDADE */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="font-bold text-xs flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-400" />
                  <span>Criatividade / Temperatura</span>
                </label>
                <span className="font-mono font-bold text-blue-400">{temperature.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer mt-2"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.0 (Factual e Preciso)</span>
                <span>1.0 (Mais Criativo)</span>
              </div>
            </div>
          </div>

          {/* BASE DE CONHECIMENTO CADASTRADA NO ROBÔ */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-xs flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-blue-400" />
                <span>Conhecimento dos CDs no Robô (Prévia)</span>
              </label>
              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                10 CDs indexados automaticamente
              </span>
            </div>

            <div className={`rounded-2xl border p-3 max-h-36 overflow-y-auto space-y-2 text-[11px] font-mono ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div>🏢 <strong>CD 1965 (Principal GPA)</strong>: Outbound Frac: 170.000 cx | Fech: 95.000 cx | Inbound: 120.000 cx | Estoque: 4 setores</div>
              <div>🏢 <strong>CD 941 (Mercearia)</strong>: Outbound Frac: 140.000 cx | Fech: 75.000 cx | Inbound: 95.000 cx</div>
              <div>🏢 <strong>CD 7801 (Bazar/Mercearia)</strong>: Outbound Frac: 160.000 cx | Fech: 90.000 cx | Inbound: 140.000 cx</div>
              <div>🏢 <strong>CDs 930, 1942, 409, 1953, 1984, 1974, 1979</strong>: Metas Inbound de 60.000 a 110.000 caixas indexadas.</div>
              <div>🔒 <strong>Regra de Sessão</strong>: Desconexão automática após exatamente 1 hora de inatividade/uso.</div>
              <div>🤖 <strong>Motor:</strong> Llama 3 via Groq API - Gratuito e ultra-rápido!</div>
            </div>
          </div>

          {/* RESULTADO DO TESTE OU MENSAGENS */}
          {testResult && (
            <div className={`p-3.5 rounded-2xl border flex items-start gap-2.5 animate-fade-in ${
              testResult.success
                ? isDark ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : isDark ? 'bg-red-950/40 border-red-500/40 text-red-200' : 'bg-red-50 border-red-300 text-red-800'
            }`}>
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-semibold">{testResult.message}</div>
                {testResult.sampleResponse && (
                  <div className={`p-2 rounded-xl text-[11px] font-mono mt-1.5 ${
                    isDark ? 'bg-black/30 text-emerald-300' : 'bg-white/80 text-emerald-900'
                  }`}>
                    "{testResult.sampleResponse}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER COM AÇÕES */}
        <div className={`p-4 sm:p-5 border-t flex flex-wrap items-center justify-between gap-3 shrink-0 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className={`py-2 px-3.5 rounded-xl font-semibold text-xs border transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 ${
                isDark 
                  ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' 
                  : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? "Testando Llama..." : "Testar Llama"}</span>
            </button>

            {onOpenChatWithQuestion && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenChatWithQuestion("Qual a capacidade do CD 1965?");
                }}
                className={`hidden sm:flex items-center gap-1.5 py-2 px-3.5 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                  isDark
                    ? 'text-blue-400 hover:bg-blue-900/30'
                    : 'text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Testar Pergunta CD 1965</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`py-2 px-4 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="py-2 px-5 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Salvar Configuração</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}