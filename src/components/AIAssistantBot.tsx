import React, { useState, useEffect, useRef } from "react";
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  RefreshCw, 
  Trash2, 
  ChevronDown, 
  Building, 
  Layers, 
  Activity, 
  CheckCircle,
  Copy,
  AlertCircle,
  Cpu,
  MessageSquare
} from "lucide-react";

interface Message {
  id: string;
  sender: "bot" | "user";
  text: string;
  time: string;
  mode?: string;
}

interface AIAssistantBotProps {
  theme?: "light" | "dark";
  onOpenSettings?: () => void;
  isOpenControlled?: boolean;
  onToggleControlled?: (open: boolean) => void;
  apiUrl?: string;
}

export default function AIAssistantBot({ 
  theme = "dark", 
  onOpenSettings,
  isOpenControlled,
  onToggleControlled,
  apiUrl = "http://localhost:3001"
}: AIAssistantBotProps) {
  const [isOpenLocal, setIsOpenLocal] = useState(false);
  const isOpen = isOpenControlled !== undefined ? isOpenControlled : isOpenLocal;

  const setOpen = (val: boolean) => {
    if (onToggleControlled) {
      onToggleControlled(val);
    } else {
      setIsOpenLocal(val);
    }
  };

  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusInfo, setStatusInfo] = useState<{
    hasApiKey: boolean;
    model: string;
    indexedCds: number[];
  }>({
    hasApiKey: false,
    model: "llama3-8b-8192",
    indexedCds: [1965, 941, 7801, 930, 1942, 409, 1953, 1984, 1974, 1979]
  });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = sessionStorage.getItem("logistics_bot_messages");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: "welcome",
        sender: "bot",
        text: `👋 Olá! Sou o **Robô Assistente IA** - seu assistente virtual completo!

🧠 **Posso falar sobre QUALQUER assunto:**
• Logística e Supply Chain (minha especialidade)
• Ciência, tecnologia e inovação
• História, cultura e arte
• Educação e aprendizado
• Entretenimento e curiosidades
• E muito mais!

📦 **Dados de Logística do GPA:**
• 10 CDs com capacidades e metas
• Dados de Inbound e Outbound
• Ocupação de estoque

💡 **Experimente:**
• "Qual a capacidade do CD 1965?"
• "O que é inteligência artificial?"
• "Me fale sobre o sistema solar"
• "Como funciona a logística?"

**Pergunte o que quiser - estou aqui para ajudar!** 🚀`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  useEffect(() => {
    sessionStorage.setItem("logistics_bot_messages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/bot/status`);
        if (res.ok) {
          const data = await res.json();
          setStatusInfo({
            hasApiKey: data.hasApiKey,
            model: data.model || "llama3-8b-8192",
            indexedCds: data.indexedCds || [1965, 941, 7801, 930, 1942, 409, 1953, 1984, 1974, 1979]
          });
        }
      } catch (err) {
        console.error("Erro ao verificar status:", err);
      }
    };

    checkStatus();
  }, [apiUrl]);

  useEffect(() => {
    const handleToggleEvent = (e: any) => {
      if (e.detail?.action === "open") {
        setOpen(true);
      } else if (e.detail?.action === "ask" && e.detail?.question) {
        setOpen(true);
        handleSendMessage(e.detail.question);
      } else {
        setOpen(!isOpen);
      }
    };

    window.addEventListener("toggle-ai-bot", handleToggleEvent);
    return () => window.removeEventListener("toggle-ai-bot", handleToggleEvent);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

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

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: "user-" + Date.now(),
      sender: "user",
      text: textToSend.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customText) {
      setInputMessage("");
    }
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-6).map(m => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text
      }));

      // 🔥 PEGA O TOKEN
      const token = getUserToken();

      // 🔥 HEADERS COM TOKEN
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${apiUrl}/api/bot/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: textToSend.trim(),
          history: historyPayload,
          token: token // 🔥 ENVIA O TOKEN NO BODY TAMBÉM
        })
      });

      if (!res.ok) {
        throw new Error(`Erro na comunicação com a API (${res.status})`);
      }

      const data = await res.json();
      const botReply = data.reply || "Não consegui processar a resposta.";

      setMessages(prev => [
        ...prev,
        {
          id: "bot-" + Date.now(),
          sender: "bot",
          text: botReply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          mode: data.mode || "llama"
        }
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: "bot-err-" + Date.now(),
          sender: "bot",
          text: `⚠️ **Erro ao consultar a IA Llama:** ${err.message || "Falha na conexão"}.\n\nVerifique se o servidor backend está rodando (porta 3001) e se a chave GROQ_API_KEY está configurada.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: "welcome-cleared",
        sender: "bot",
        text: "🧹 Conversa limpa! Como posso ajudar você agora com os dados do projeto?",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isDark = theme === "dark";

  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split("\n");
    return lines.map((line, idx) => {
      const isBullet = line.trim().startsWith("•") || line.trim().startsWith("-") || line.trim().startsWith("*");
      
      const formattedParts = line.split(/(\*\*.*?\*\*|`.*?`)/g).map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={pIdx} className="font-bold text-blue-400 dark:text-blue-300">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={pIdx} className="px-1.5 py-0.5 rounded bg-black/20 font-mono text-[11px] text-emerald-400">
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={idx} className="flex items-start gap-1.5 ml-1 my-1">
            <span className="text-blue-400 text-xs shrink-0 mt-0.5">•</span>
            <span className="leading-relaxed">{formattedParts}</span>
          </div>
        );
      }

      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="leading-relaxed my-0.5">
          {formattedParts}
        </p>
      );
    });
  };

  const quickPrompts = [
    { label: "Capacidade CD 1965", query: "Qual a capacidade do CD 1965?" },
    { label: "Capacidade CD 941", query: "Qual a capacidade do CD 941?" },
    { label: "Capacidade CD 7801", query: "Qual a capacidade do CD 7801?" },
    { label: "Metas de Inbound", query: "Quais são as metas de Inbound cadastradas?" },
    { label: "Ocupação do Estoque", query: "Como está a ocupação do estoque no CD 1965?" },
    { label: "No-Show e Cargas", query: "Quais os indicadores de No-Show e recebimento?" }
  ];

  return (
    <>
      {!isOpen && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 group">
          <div 
            onClick={() => setOpen(true)}
            className={`hidden sm:flex items-center gap-2 py-2 px-3.5 rounded-2xl shadow-xl text-xs font-semibold cursor-pointer backdrop-blur-md border transition-all duration-300 animate-bounce ${
              isDark 
                ? 'bg-[#111827]/95 border-blue-500/30 text-slate-200 hover:border-blue-400' 
                : 'bg-white/95 border-blue-200 text-slate-700 hover:border-blue-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            {/* <span>Pergunte a capacidade de qualquer CD ao Robô (Llama 3)!</span> */}
          </div>

          <button
            type="button"
            id="btn-open-ai-robot"
            onClick={() => {
              setOpen(true);
              setHasUnread(false);
            }}
            className={`relative p-3.5 rounded-2xl shadow-2xl transition-all duration-300 cursor-pointer group active:scale-95 flex items-center justify-center ${
              isDark 
                ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white shadow-blue-500/30 hover:shadow-blue-500/50' 
                : 'bg-gradient-to-br from-blue-500 via-indigo-500 to-blue-700 text-white shadow-blue-500/25 hover:shadow-blue-500/40'
            }`}
            title="Abrir Robô Assistente de IA Logística"
          >
            <span className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 opacity-40 blur group-hover:opacity-75 transition duration-500 animate-pulse" />
            <div className="relative flex items-center justify-center">
              <Bot className="w-7 h-7 transform group-hover:scale-110 transition-transform duration-300" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-[#111827]"></span>
              </span>
            </div>
          </button>
        </div>
      )}

      {isOpen && (
        <div 
          id="ai-bot-chat-window"
          className={`fixed bottom-4 right-4 z-50 w-[95vw] max-w-[420px] h-[620px] max-h-[85vh] rounded-3xl shadow-2xl border flex flex-col overflow-hidden backdrop-blur-2xl transition-all duration-300 animate-fade-in ${
            isDark 
              ? 'bg-[#0f172a]/95 border-blue-500/30 text-white shadow-black/60' 
              : 'bg-white/95 border-slate-300 text-slate-900 shadow-xl'
          }`}
        >
          <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
            isDark 
              ? 'bg-gradient-to-r from-blue-950/60 via-slate-900/60 to-indigo-950/60 border-slate-800' 
              : 'bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 text-white">
                  <Bot className="w-5 h-5" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-900"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm leading-none">Robô Assistente IA</h3>
                  <span className="px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-400 font-mono text-[9px] font-black uppercase">
                    Llama 3
                  </span>
                </div>
                <p className={`text-[11px] mt-1 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Especialista em Logística • 10 CDs Ativos • Groq API
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearHistory}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'
                }`}
                title="Limpar histórico da conversa"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'
                  }`}
                  title="Configurações da IA"
                >
                  <Cpu className="w-4 h-4 text-blue-400" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setOpen(false)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'
                }`}
                title="Fechar chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className={`py-2 px-3 border-b flex gap-1.5 overflow-x-auto no-scrollbar shrink-0 ${
            isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-slate-100/60 border-slate-200/80'
          }`}>
            {quickPrompts.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(item.query)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap border transition-all cursor-pointer shrink-0 active:scale-95 ${
                  isDark
                    ? 'bg-slate-800/70 border-slate-700/80 text-slate-300 hover:bg-blue-600/20 hover:border-blue-500/40 hover:text-blue-300'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 shadow-2xs'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className={`flex-1 p-4 overflow-y-auto space-y-3.5 text-xs ${
            isDark ? 'bg-slate-950/30' : 'bg-slate-50/50'
          }`}>
            {messages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div 
                  key={msg.id} 
                  className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-md text-white mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] rounded-2xl p-3.5 relative group ${
                    isUser 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md rounded-tr-none' 
                      : isDark
                        ? 'bg-slate-900 border border-slate-800 text-slate-200 shadow-md rounded-tl-none'
                        : 'bg-white border border-slate-200 text-slate-800 shadow-sm rounded-tl-none'
                  }`}>
                    <div className="space-y-1">
                      {renderFormattedText(msg.text)}
                    </div>

                    <div className={`flex items-center justify-between mt-2 pt-1 border-t text-[10px] ${
                      isUser 
                        ? 'border-white/10 text-blue-200' 
                        : isDark ? 'border-slate-800 text-slate-500' : 'border-slate-100 text-slate-400'
                    }`}>
                      <span className="font-mono">{msg.time}</span>
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.text, msg.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 hover:text-blue-400 cursor-pointer ml-2"
                          title="Copiar resposta"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-md text-white animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <div className={`rounded-2xl p-3.5 rounded-tl-none border flex items-center gap-2.5 ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  <span className="text-[11px] font-medium text-blue-400 animate-pulse">
                    Consultando base logística com Llama 3...
                  </span>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className={`p-3 border-t shrink-0 ${
            isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Pergunte sobre capacidade do CD 'x'..."
                  disabled={isLoading}
                  className={`w-full py-2.5 pl-3.5 pr-8 rounded-xl text-xs focus:outline-none focus:ring-2 transition-all ${
                    isDark
                      ? 'bg-slate-900 border border-slate-700 focus:border-blue-500 focus:ring-blue-500/20 text-white placeholder-slate-500'
                      : 'bg-slate-100 border border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 text-slate-800 placeholder-slate-400'
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className={`p-2.5 rounded-xl font-bold transition-all shadow-md flex items-center justify-center shrink-0 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
                }`}
                title="Enviar pergunta"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <p className={`text-[10px] text-center mt-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              🤖 Robô IA alimentado por Llama 3 via Groq API • Gratuito e rápido!
            </p>
          </div>
        </div>
      )}
    </>
  );
}