import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bot,
  Cpu,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Download,
  Search,
  FileText,
  Terminal,
  Settings,
  Power,
  Clock,
  Eye,
  Activity,
  Check,
  ChevronRight,
  Filter
} from "lucide-react";

// =========================================================================================
// TIPOS PARA O DESENVOLVEDOR BACKEND - Interface contratual
// =========================================================================================
export interface Robot {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  tipo: "manual" | "automatico";
  frequencia: string;
  status: "idle" | "running" | "success" | "error";
  habilitado: boolean;
  ultimaExecucao: string | null;
  ultimoTempoExecucao: string | null;
  ultimoErro: string | null;
  historico7Dias: {
    dia: string;
    status: "success" | "error" | "skipped";
  }[];
}

interface RobosProps {
  theme: "light" | "dark";
  showNotification: (msg: string) => void;
}

export default function Robos({ theme, showNotification }: RobosProps) {
  const isDark = theme === "dark";

  // Estados principais
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "running" | "error" | "idle">("all");
  const [selectedRobotForLogs, setSelectedRobotForLogs] = useState<Robot | null>(null);
  const [robotLogs, setRobotLogs] = useState<string[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [executingRobotId, setExecutingRobotId] = useState<string | null>(null);

  // =========================================================================================
  // FUNÇÕES DE COMUNICAÇÃO COM O BACKEND - TODAS AGUARDANDO APIs REAIS
  // =========================================================================================

  /**
   * GET /api/robos
   * Carrega a lista completa de robôs cadastrados
   */
  const fetchRobots = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    } else {
      setRefreshing(true);
    }

    try {
      const response = await fetch("/api/robos", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setRobots(data);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Falha ao carregar robôs";
      setError(errorMessage);
      console.error("Erro ao buscar robôs:", err);
      
      // Mostra notificação apenas se não for carregamento inicial
      if (!silent) {
        showNotification(`❌ ${errorMessage}`);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * POST /api/robos/:id/executar
   * Dispara a execução manual de um robô específico
   */
  const executeRobot = async (robotId: string) => {
    // Previne múltiplas execuções simultâneas
    if (executingRobotId) {
      showNotification("⏳ Aguarde a conclusão da execução atual");
      return;
    }

    setExecutingRobotId(robotId);
    
    // Atualiza visualmente o status para "running" (otimista)
    setRobots(prevRobots =>
      prevRobots.map(robot =>
        robot.id === robotId
          ? { ...robot, status: "running" as const }
          : robot
      )
    );

    showNotification(`⚡ Iniciando execução do robô ${robotId}...`);

    try {
      const response = await fetch(`/api/robos/${robotId}/executar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Atualiza com os dados retornados pelo backend
      setRobots(prevRobots =>
        prevRobots.map(robot =>
          robot.id === robotId
            ? { ...result.robot } // Backend deve retornar o robô atualizado completo
            : robot
        )
      );

      showNotification(`✅ Robô ${robotId} executado com sucesso!`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao executar robô";
      console.error("Erro ao executar robô:", err);
      
      // Reverte o status otimista
      setRobots(prevRobots =>
        prevRobots.map(robot =>
          robot.id === robotId && robot.status === "running"
            ? { ...robot, status: "error" as const, ultimoErro: errorMessage }
            : robot
        )
      );

      showNotification(`❌ Falha na execução: ${errorMessage}`);
    } finally {
      setExecutingRobotId(null);
    }
  };

  /**
   * POST /api/robos/:id/toggle
   * Habilita/Desabilita um robô automático
   */
  const toggleRobotEnable = async (robotId: string, currentState: boolean) => {
    const newState = !currentState;
    
    // Atualização otimista
    setRobots(prevRobots =>
      prevRobots.map(robot =>
        robot.id === robotId
          ? { ...robot, habilitado: newState }
          : robot
      )
    );

    try {
      const response = await fetch(`/api/robos/${robotId}/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ habilitado: newState }),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Confirma o estado com o backend
      setRobots(prevRobots =>
        prevRobots.map(robot =>
          robot.id === robotId
            ? { ...robot, habilitado: result.habilitado }
            : robot
        )
      );

      showNotification(`${newState ? "🔓 Robô ativado" : "🔒 Robô pausado"} com sucesso!`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao alterar estado";
      console.error("Erro ao alternar robô:", err);
      
      // Reverte a mudança otimista
      setRobots(prevRobots =>
        prevRobots.map(robot =>
          robot.id === robotId
            ? { ...robot, habilitado: currentState }
            : robot
        )
      );

      showNotification(`❌ Erro ao alterar estado: ${errorMessage}`);
    }
  };

  /**
   * GET /api/robos/:id/logs
   * Busca os logs detalhados de um robô específico
   */
  const fetchRobotLogs = async (robot: Robot) => {
    setSelectedRobotForLogs(robot);
    setLoadingLogs(true);
    setRobotLogs([]);

    try {
      const response = await fetch(`/api/robos/${robot.id}/logs`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setRobotLogs(data.logs || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao buscar logs";
      console.error("Erro ao buscar logs:", err);
      
      // Fallback: mensagem informativa sobre erro de conexão
      setRobotLogs([
        `[ERRO] Não foi possível conectar ao servidor de logs.`,
        `[ERRO] ${errorMessage}`,
        `[INFO] Verifique se o backend está em execução e a API /api/robos/${robot.id}/logs está disponível.`
      ]);
      
      showNotification(`⚠️ Erro ao carregar logs: ${errorMessage}`);
    } finally {
      setLoadingLogs(false);
    }
  };

  // =========================================================================================
  // EFEITOS
  // =========================================================================================

  useEffect(() => {
    // Carregar robôs ao montar o componente
    fetchRobots(false);
  }, []);

  // =========================================================================================
  // DERIVAÇÕES DE ESTADO
  // =========================================================================================

  // KPIs calculados dinamicamente
  const stats = useMemo(() => {
    const total = robots.length;
    const completed = robots.filter(r => r.status === "success").length;
    const errors = robots.filter(r => r.status === "error").length;
    const running = robots.filter(r => r.status === "running").length;
    const idle = robots.filter(r => r.status === "idle").length;
    return { total, completed, errors, running, idle };
  }, [robots]);

  // Lista de robôs filtrados
  const filteredRobots = useMemo(() => {
    return robots.filter(r => {
      const matchesSearch = r.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            r.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            r.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (statusFilter === "all") return matchesSearch;
      return matchesSearch && r.status === statusFilter;
    });
  }, [robots, searchTerm, statusFilter]);

  const manualRobots = useMemo(() => {
    return filteredRobots.filter(r => r.tipo === "manual");
  }, [filteredRobots]);

  const automaticRobots = useMemo(() => {
    return filteredRobots.filter(r => r.tipo === "automatico");
  }, [filteredRobots]);

  // =========================================================================================
  // FUNÇÃO DE DOWNLOAD DE DOCUMENTAÇÃO
  // =========================================================================================

  const handleDownloadDocumentation = () => {
    const docContent = `# Documentação Técnica de Integração - Painel de Robôs (GPA LogiCapacity)

Este documento especifica a arquitetura técnica, os endpoints HTTP, as estruturas de dados e os requisitos de banco de dados para implementar o backend do Painel de Robôs e integrá-lo a este Painel Operacional do GPA.

---

## 1. Estrutura de Banco de Dados Sugerida (PostgreSQL)

Para gerenciar o estado dos robôs e registrar o histórico de execuções de cada um, recomenda-se a criação das seguintes tabelas:

\`\`\`sql
-- Tabela contendo os metadados cadastrais e o status atual dos Robôs
CREATE TABLE robos (
    id VARCHAR(50) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    frequencia VARCHAR(150),
    status VARCHAR(50) NOT NULL DEFAULT 'idle',
    habilitado BOOLEAN NOT NULL DEFAULT TRUE,
    ultima_execucao TIMESTAMP WITH TIME ZONE,
    ultimo_tempo_execucao VARCHAR(50),
    ultimo_erro TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela contendo as execuções diárias (histórico detalhado)
CREATE TABLE execucoes_robos (
    id SERIAL PRIMARY KEY,
    robo_id VARCHAR(50) REFERENCES robos(id) ON DELETE CASCADE,
    data_execucao TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    tempo_duracao VARCHAR(50),
    status VARCHAR(50) NOT NULL,
    logs TEXT NOT NULL,
    erro_detalhado TEXT
);

-- Índices recomendados para otimização de consultas históricas
CREATE INDEX idx_execucoes_robo_data ON execucoes_robos(robo_id, data_execucao DESC);
\`\`\`

---

## 2. Especificação das APIs REST (Backend Express / Node)

### 2.1. Obter Lista de Robôs e Estatísticas Recentes
Retorna todos os robôs cadastrados junto com um agregado simples do histórico dos últimos 7 dias.

- **URL:** \`/api/robos\`
- **Método:** \`GET\`
- **Resposta Esperada (JSON - HTTP 200):**
\`\`\`json
[
  {
    "id": "R-001",
    "nome": "Sincronizador de Pedidos Inbound",
    "descricao": "Captura novos pedidos de compra da API corporativa do GPA.",
    "categoria": "Inbound",
    "tipo": "automatico",
    "frequencia": "A cada 15 min",
    "status": "success",
    "habilitado": true,
    "ultimaExecucao": "2026-07-13T13:42:01.000Z",
    "ultimoTempoExecucao": "4.2s",
    "ultimoErro": null,
    "historico7Dias": [
      { "dia": "07/07", "status": "success" },
      { "dia": "08/07", "status": "success" }
    ]
  }
]
\`\`\`

---

### 2.2. Disparar Execução Manual de Robô
Inicia o processamento do robô. O backend deve atualizar o status para \`running\`, executar as tarefas e retornar o robô atualizado.

- **URL:** \`/api/robos/:id/executar\`
- **Método:** \`POST\`
- **Parâmetros de URL:** \`id\` (ex: \`R-001\`)
- **Resposta Esperada (JSON - HTTP 200):**
\`\`\`json
{
  "success": true,
  "robot": {
    "id": "R-001",
    "nome": "Sincronizador de Pedidos Inbound",
    "status": "success",
    "ultimaExecucao": "2026-07-13T14:15:30.000Z",
    "ultimoTempoExecucao": "3.8s",
    "ultimoErro": null
  }
}
\`\`\`

---

### 2.3. Habilitar/Desabilitar Robô Automático
Atualiza a coluna \`habilitado\` no banco.

- **URL:** \`/api/robos/:id/toggle\`
- **Método:** \`POST\`
- **Payload de Entrada (JSON):**
\`\`\`json
{
  "habilitado": false
}
\`\`\`
- **Resposta Esperada (JSON - HTTP 200):**
\`\`\`json
{
  "success": true,
  "id": "R-001",
  "habilitado": false
}
\`\`\`

---

### 2.4. Buscar Logs de Execução Recentes
Retorna uma lista cronológica de logs.

- **URL:** \`/api/robos/:id/logs\`
- **Método:** \`GET\`
- **Resposta Esperada (JSON - HTTP 200):**
\`\`\`json
{
  "id": "R-001",
  "logs": [
    "[2026-07-13 14:15:30] INFO - Inicializando Sincronizador de Pedidos Inbound.",
    "[2026-07-13 14:15:33] SUCCESS - Capacidades diárias atualizadas com sucesso."
  ]
}
\`\`\`

---

## 3. Recomendações de Agendamento (Schedules / Cron)

Para os robôs automáticos, recomendamos a criação de uma rotina no backend Node.js utilizando bibliotecas estáveis como **node-cron** ou **bullmq** (com Redis).

\`\`\`javascript
import cron from 'node-cron';
import { db } from './db.js';

// Executa a cada 15 minutos se o robô estiver habilitado no banco
cron.schedule('*/15 * * * *', async () => {
    const robo = await db.query('SELECT habilitado FROM robos WHERE id = $1', ['R-001']);
    
    if (robo.rows[0]?.habilitado) {
        console.log('Iniciando rotina automática do Sincronizador de Pedidos Inbound');
        // Chame a função executora do seu Worker aqui...
    } else {
        console.log('Rotina automática pausada pelo usuário.');
    }
});
\`\`\`

---

*Gerado automaticamente pelo LogiCapacity GPA.*`;

    const blob = new Blob([docContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "GPA_LogiCapacity_Guia_Integracao_Robos.md");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("📥 Guia de Integração Técnico (.md) baixado com sucesso!");
  };

  // =========================================================================================
  // RENDERIZAÇÃO
  // =========================================================================================

  return (
    <div className="p-1 sm:p-6 flex flex-col gap-6" id="robots-panel-container">
      {/* HEADER DO COMPONENTE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/65 backdrop-blur-md p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/40 shadow-sm transition-all duration-300">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/15">
            <Bot className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Painel Integrado de Robôs (GPA RPA)
              </h2>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100/80 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                {robots.length > 0 ? "Conectado" : "Aguardando dados"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Monitore, configure e execute as automações que sincronizam o faturamento de capacidades operacionais, metas semanais e amarrações logísticas do GPA.
            </p>
          </div>
        </div>

        {/* BOTÃO PARA DOWNLOAD DA DOCUMENTAÇÃO */}
        <div className="flex items-center gap-3 self-end md:self-center">
          <button
            onClick={() => fetchRobots(true)}
            disabled={refreshing || loading}
            className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 transition-all active:scale-95 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          
          <button
            onClick={handleDownloadDocumentation}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider shadow-md shadow-blue-500/15 border border-blue-500/10 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Guia do Backend</span>
          </button>
        </div>
      </div>

      {/* ESTADO DE CARREGAMENTO INICIAL */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white/80 dark:bg-slate-900/65 rounded-3xl border border-slate-200/50 dark:border-slate-800/40">
          <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-3 font-mono">
            {error ? "RECUPERANDO DADOS..." : "CARREGANDO HUB DE TRABALHO RPA..."}
          </p>
          {error && (
            <button
              onClick={() => fetchRobots(false)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
            >
              Tentar novamente
            </button>
          )}
        </div>
      ) : error ? (
        /* ESTADO DE ERRO */
        <div className="flex flex-col items-center justify-center p-20 bg-white/80 dark:bg-slate-900/65 rounded-3xl border border-rose-200/50 dark:border-rose-900/30">
          <AlertTriangle className="w-10 h-10 text-rose-500 mb-3" />
          <p className="text-sm font-bold text-rose-600 dark:text-rose-400 text-center max-w-md">
            {error}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center max-w-md">
            Verifique se o backend está em execução e a API /api/robos está disponível.
          </p>
          <button
            onClick={() => fetchRobots(false)}
            className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Recarregar dados
          </button>
        </div>
      ) : (
        <>
          {/* BLOCOS DE INFRAESTRUTURA KPI (KPI CARDS) */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white/80 dark:bg-slate-900/65 backdrop-blur-md p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 shadow-sm flex items-center justify-between group hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-extrabold">Total Robôs</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</p>
              </div>
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl flex items-center justify-center group-hover:scale-105 transition-all">
                <Cpu className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/65 backdrop-blur-md p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 shadow-sm flex items-center justify-between group hover:border-blue-300 dark:hover:border-blue-900/30 transition-all duration-300">
              <div>
                <p className="text-[10px] text-blue-500 dark:text-blue-400 uppercase tracking-widest font-mono font-extrabold">Rodando</p>
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-2">
                  {stats.running}
                  {stats.running > 0 && <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center group-hover:scale-105 transition-all">
                <Loader2 className={`w-5 h-5 ${stats.running > 0 ? "animate-spin" : ""}`} />
              </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/65 backdrop-blur-md p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 shadow-sm flex items-center justify-between group hover:border-emerald-300 dark:hover:border-emerald-900/30 transition-all duration-300">
              <div>
                <p className="text-[10px] text-emerald-500 dark:text-emerald-400 uppercase tracking-widest font-mono font-extrabold">Concluídos</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.completed}</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center group-hover:scale-105 transition-all">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/65 backdrop-blur-md p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 shadow-sm flex items-center justify-between group hover:border-rose-300 dark:hover:border-rose-900/30 transition-all duration-300">
              <div>
                <p className="text-[10px] text-rose-500 dark:text-rose-400 uppercase tracking-widest font-mono font-extrabold">Erros Ativos</p>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.errors}</p>
              </div>
              <div className="w-10 h-10 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center group-hover:scale-105 transition-all">
                <XCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/65 backdrop-blur-md p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 shadow-sm flex items-center justify-between group hover:border-amber-300 dark:hover:border-amber-900/30 transition-all duration-300">
              <div>
                <p className="text-[10px] text-amber-500 dark:text-amber-400 uppercase tracking-widest font-mono font-extrabold">Ociosos</p>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.idle}</p>
              </div>
              <div className="w-10 h-10 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center group-hover:scale-105 transition-all">
                <Activity className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* BARRA DE FILTRO E PESQUISA */}
          <div className="bg-white/80 dark:bg-slate-900/65 backdrop-blur-md p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Pesquisar por robô, código ou escopo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-550/30 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 focus:border-blue-500/60 dark:focus:border-blue-500/50 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500/30 text-slate-800 dark:text-slate-100 transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/80 rounded-xl overflow-x-auto w-full sm:w-auto">
              {(["all", "success", "running", "error", "idle"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === filter
                      ? filter === "all"
                        ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm"
                        : filter === "success"
                        ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 shadow-sm border border-emerald-100 dark:border-emerald-500/10"
                        : filter === "running"
                        ? "bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-500/10"
                        : filter === "error"
                        ? "bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 shadow-sm border border-rose-100 dark:border-rose-500/10"
                        : "bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 shadow-sm border border-amber-100 dark:border-amber-500/10"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                  }`}
                >
                  {filter === "all" ? "Todos" :
                   filter === "success" ? "Sucesso" :
                   filter === "running" ? "Rodando" :
                   filter === "error" ? "Erros" : "Off"}
                </button>
              ))}
            </div>
          </div>

          {/* LISTAGEM DE ROBÔS */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* COLUNA ESQUERDA: ROBÔS MANUAIS */}
            <div className="xl:col-span-5 flex flex-col gap-4">
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-950/40 px-5 py-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">
                    Execução Manual (Sob Demanda)
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {manualRobots.length} Itens
                </span>
              </div>

              {manualRobots.length === 0 ? (
                <div className="p-8 text-center bg-white/80 dark:bg-slate-900/65 border border-slate-200/40 dark:border-slate-800/30 rounded-2xl text-xs text-slate-400">
                  Nenhum robô manual correspondente encontrado.
                </div>
              ) : (
                <div className="flex flex-col gap-3.5">
                  {manualRobots.map((robot) => {
                    const isRunning = robot.status === "running";
                    const isExecuting = executingRobotId === robot.id;

                    return (
                      <div
                        key={robot.id}
                        className={`p-5 bg-white/80 dark:bg-slate-900/65 rounded-2xl border transition-all duration-300 relative overflow-hidden group shadow-sm hover:shadow-md ${
                          robot.status === "error"
                            ? "border-rose-200 hover:border-rose-300 dark:border-rose-950/30 dark:hover:border-rose-900/40"
                            : robot.status === "running"
                            ? "border-blue-300 dark:border-blue-900/50 shadow-inner bg-blue-50/10 dark:bg-blue-950/5"
                            : "border-slate-200/80 dark:border-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700/60"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md">
                              {robot.id}
                            </span>
                            <span className="text-[9px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-md">
                              {robot.categoria}
                            </span>
                          </div>
                          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            robot.status === "success" 
                              ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10" 
                              : robot.status === "error" 
                              ? "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 animate-pulse" 
                              : robot.status === "running" 
                              ? "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10" 
                              : "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800"
                          }`}>
                            {robot.status === "success" && "Concluído"}
                            {robot.status === "error" && "Erro Ativo"}
                            {robot.status === "running" && "Executando..."}
                            {robot.status === "idle" && "Ocioso"}
                          </span>
                        </div>

                        <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {robot.nome}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {robot.descricao}
                        </p>

                        {robot.ultimaExecucao && (
                          <div className="flex items-center gap-3.5 mt-3.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-150/40 dark:border-slate-900/50">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              Execução: {new Date(robot.ultimaExecucao).toLocaleString()}
                            </span>
                            {robot.ultimoTempoExecucao && (
                              <span className="text-[10px] bg-slate-200/50 dark:bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
                                Duração: {robot.ultimoTempoExecucao}
                              </span>
                            )}
                          </div>
                        )}

                        {robot.status === "error" && robot.ultimoErro && (
                          <div className="mt-3 p-3 bg-rose-500/5 rounded-xl border border-rose-100/30 text-[11px] text-rose-700 dark:text-rose-400 font-mono leading-relaxed flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <span className="break-all">{robot.ultimoErro}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-3 mt-4 border-t border-slate-100 dark:border-slate-800/50 pt-3">
                          <button
                            onClick={() => fetchRobotLogs(robot)}
                            className="flex items-center gap-1.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/85 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                          >
                            <Terminal className="w-3.5 h-3.5 text-slate-400" />
                            <span>Logs</span>
                          </button>

                          <button
                            onClick={() => executeRobot(robot.id)}
                            disabled={isRunning || isExecuting}
                            className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer ${
                              isRunning || isExecuting
                                ? "bg-blue-100 text-blue-500 dark:bg-blue-950/40 dark:text-blue-400/50 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10 hover:shadow-md"
                            }`}
                          >
                            {isRunning || isExecuting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current" />
                            )}
                            <span>{isRunning || isExecuting ? "Executando..." : "Rodar"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* COLUNA DIREITA: ROBÔS AUTOMÁTICOS */}
            <div className="xl:col-span-7 flex flex-col gap-4">
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-950/40 px-5 py-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">
                    Robôs Automáticos (Agendados)
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {automaticRobots.length} Itens
                </span>
              </div>

              {automaticRobots.length === 0 ? (
                <div className="p-8 text-center bg-white/80 dark:bg-slate-900/65 border border-slate-200/40 dark:border-slate-800/30 rounded-2xl text-xs text-slate-400">
                  Nenhum robô automático correspondente encontrado.
                </div>
              ) : (
                <div className="bg-white/80 dark:bg-slate-900/65 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/40 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950/30 border-b border-slate-200/50 dark:border-slate-800/40">
                          <th className="py-3.5 px-4 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono">Robô / Atividade</th>
                          <th className="py-3.5 px-4 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono text-center">Frequência</th>
                          <th className="py-3.5 px-4 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono text-center">Status</th>
                          <th className="py-3.5 px-4 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono text-center">Histórico (7 dias)</th>
                          <th className="py-3.5 px-4 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30 text-xs">
                        {automaticRobots.map((robot) => (
                          <tr
                            key={robot.id}
                            className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/10 transition-colors group ${
                              !robot.habilitado ? "opacity-65 bg-slate-50/20" : ""
                            }`}
                          >
                            <td className="py-4.5 px-4">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-xl mt-0.5 ${
                                  !robot.habilitado 
                                    ? "bg-slate-100 text-slate-400 dark:bg-slate-800" 
                                    : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                                }`}>
                                  <Cpu className="w-4 h-4" />
                                </div>
                                <div className="max-w-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-mono font-extrabold text-slate-400">{robot.id}</span>
                                    <h5 className="font-extrabold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                      {robot.nome}
                                    </h5>
                                  </div>
                                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed line-clamp-1 group-hover:line-clamp-2 transition-all">
                                    {robot.descricao}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="py-4.5 px-4 text-center whitespace-nowrap">
                              <div className="flex flex-col items-center justify-center">
                                <span className="font-bold text-slate-600 dark:text-slate-300">
                                  {robot.frequencia}
                                </span>
                                {robot.ultimaExecucao && (
                                  <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                                    Última: {new Date(robot.ultimaExecucao).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-4.5 px-4 text-center">
                              <div className="flex justify-center">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-wider ${
                                  !robot.habilitado
                                    ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                    : robot.status === "success"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                    : robot.status === "error"
                                    ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 animate-pulse"
                                    : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                                }`}>
                                  {!robot.habilitado && "Pausado"}
                                  {robot.habilitado && robot.status === "success" && "Ativo / OK"}
                                  {robot.habilitado && robot.status === "error" && "Com Erro"}
                                  {robot.habilitado && robot.status === "idle" && "Ocioso"}
                                </span>
                              </div>
                            </td>

                            <td className="py-4.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {robot.historico7Dias.map((h, index) => (
                                  <div key={index} className="group/day relative">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[7px] font-bold ${
                                      h.status === "success"
                                        ? "bg-emerald-500 border-emerald-600 text-white"
                                        : h.status === "error"
                                        ? "bg-rose-500 border-rose-600 text-white"
                                        : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500"
                                    }`}>
                                      {h.status === "success" && "✓"}
                                      {h.status === "error" && "✗"}
                                      {h.status === "skipped" && "-"}
                                    </div>
                                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover/day:opacity-100 pointer-events-none transition-all shadow font-mono">
                                      {h.dia}: {h.status === "success" ? "OK" : h.status === "error" ? "Falha" : "N/E"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>

                            <td className="py-4.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-3">
                                <button
                                  onClick={() => fetchRobotLogs(robot)}
                                  className="p-2 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-150 dark:border-slate-750 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-xl transition-all shadow-sm cursor-pointer"
                                  title="Ver logs da última execução"
                                >
                                  <Terminal className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => toggleRobotEnable(robot.id, robot.habilitado)}
                                  className={`w-11 h-6 rounded-full p-1 transition-all duration-300 relative cursor-pointer ${
                                    robot.habilitado 
                                      ? "bg-emerald-500 shadow-inner" 
                                      : "bg-slate-200 dark:bg-slate-800"
                                  }`}
                                  title={robot.habilitado ? "Pausar agendamento" : "Ativar agendamento"}
                                >
                                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 ${
                                    robot.habilitado ? "translate-x-5" : "translate-x-0"
                                  }`} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* DRAWER DE LOGS */}
      <AnimatePresence>
        {selectedRobotForLogs && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="bg-slate-900 text-slate-100 rounded-3xl border border-slate-800 shadow-2xl p-6 transition-all"
            id="logs-terminal-drawer"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 font-mono text-xs">
                  &gt;_
                </div>
                <div>
                  <h4 className="text-sm font-black flex items-center gap-2">
                    Terminal de logs: <span className="text-blue-400">{selectedRobotForLogs.nome}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono uppercase font-bold">
                      {selectedRobotForLogs.id}
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    ID Canal Seguro: SSL-TLS_RPA_TUNNEL_GPA
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchRobotLogs(selectedRobotForLogs)}
                  className="p-2 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white cursor-pointer"
                  title="Atualizar Logs"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedRobotForLogs(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-rose-950/40 hover:text-rose-400 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Fechar Console
                </button>
              </div>
            </div>

            {loadingLogs ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-[10px] font-mono text-slate-500 mt-2">REALIZANDO HANDSHAKE COM O SERVIDOR DE LOGS...</p>
              </div>
            ) : (
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 font-mono text-xs leading-relaxed max-h-72 overflow-y-auto flex flex-col gap-1.5 shadow-inner select-text">
                {robotLogs.length === 0 ? (
                  <div className="text-slate-500 text-center py-4">
                    Nenhum log disponível para este robô.
                  </div>
                ) : (
                  robotLogs.map((log, index) => {
                    const isErr = log.includes("[Error]") || log.includes("CRITICAL") || log.includes("[ERRO]");
                    const isSucc = log.includes("SUCCESS") || log.includes("[SUCCESS]");
                    return (
                      <div
                        key={index}
                        className={`border-l-2 pl-3 ${
                          isErr 
                            ? "border-rose-500 text-rose-300 bg-rose-500/5 py-0.5" 
                            : isSucc 
                            ? "border-emerald-500 text-emerald-300 bg-emerald-500/5 py-0.5" 
                            : "border-slate-800 text-slate-300"
                        }`}
                      >
                        {log}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500 font-mono bg-slate-950/40 p-3 rounded-xl border border-slate-800/40">
              <span className="font-extrabold text-blue-400 uppercase">Dica do Backend:</span>
              <span>Os logs devem ser consultados dinamicamente filtrando a tabela `execucoes_robos` pelo `robo_id` ordenados de forma descendente.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}