import { useState } from "react";
import { X, Copy, Check, FileCode, Server, Database, Sparkles, Calendar, Download } from "lucide-react";
import { Capacidade } from "../types";

interface ExportPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: Capacidade[];
}

export default function ExportPromptModal({ isOpen, onClose, currentData }: ExportPromptModalProps) {
  const [activeTab, setActiveTab] = useState<"ai-prompt" | "db-schema" | "api-routes" | "json-payload">("ai-prompt");
  const [copied, setCopied] = useState(false);
  const [selectedMes, setSelectedMes] = useState<string>("");
  const [selectedFluxo, setSelectedFluxo] = useState<"inbound" | "outbound">("outbound");

  if (!isOpen) return null;

  // Extrair meses disponíveis dos dados
  const mesesDisponiveis = [...new Set(currentData.map(item => item.dataMovimentacao.substring(0, 7)))].sort();
  
  const monthNames: Record<string, string> = {
    "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
    "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
    "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro"
  };

  // Filtrar dados pelo mês selecionado
  const filteredData = selectedMes 
    ? currentData.filter(item => item.dataMovimentacao.startsWith(selectedMes))
    : currentData;

  // Rota da API de Metas
  const metaApiRoute = `API/Metas/${selectedFluxo === 'inbound' ? 'Inbound' : 'Outbound'}`;

  // Gerar JSON de metas para o mês selecionado
  const generateMetasJson = () => {
    if (!selectedMes) return null;
    
    const [ano, mes] = selectedMes.split("-");
    
    if (selectedFluxo === "inbound") {
      return {
        ano: parseInt(ano),
        mes: parseInt(mes),
        capacidadeInbound: filteredData.reduce((acc, item) => acc + (item.capacidadeInbound || 0), 0),
        detalhes: filteredData.map(item => ({
          data: item.dataMovimentacao,
          cd: item.cd,
          categoria: item.categoria,
          capacidadeInbound: item.capacidadeInbound
        }))
      };
    } else {
      return {
        ano: parseInt(ano),
        mes: parseInt(mes),
        capacidadeOutboundFracionado: filteredData.reduce((acc, item) => acc + (item.capacidadeOutboundFracionado || 0), 0),
        capacidadeOutboundFechado: filteredData.reduce((acc, item) => acc + (item.capacidadeOutboundFechado || 0), 0),
        detalhes: filteredData.map(item => ({
          data: item.dataMovimentacao,
          cd: item.cd,
          categoria: item.categoria,
          capacidadeOutboundFracionado: item.capacidadeOutboundFracionado,
          capacidadeOutboundFechado: item.capacidadeOutboundFechado
        }))
      };
    }
  };

  // 1. Generate full AI Prompt
  const fullAiPrompt = `Instruções para Criação do Backend de Capacidades Logísticas

Preciso criar um backend robusto em ambiente de produção para suportar uma aplicação de monitoramento de capacidades logísticas (Inbound e Outbound). Seguem as especificações detalhadas do banco de dados, rotas de API, regras de negócio e a massa de dados atualizada.

---

### 1. MODELAGEM DO BANCO DE DADOS (PostgreSQL ou equivalente Relacional)
Crie uma tabela chamada \`capacidades\` com as seguintes colunas e tipos:

\`\`\`sql
CREATE TABLE capacidades (
    id SERIAL PRIMARY KEY,
    data_movimentacao DATE NOT NULL,
    cd INTEGER NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    capacidade_inbound INTEGER NULL,
    capacidade_outbound_fracionado INTEGER NULL,
    capacidade_outbound_fechado INTEGER NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices recomendados para otimização de filtros frequentes:
CREATE INDEX idx_capacidades_cd_data ON capacidades(cd, data_movimentacao);
CREATE INDEX idx_capacidades_categoria ON capacidades(categoria);
\`\`\`

---

### 2. ENDPOINTS DA API REST
A API deve escutar no endereço \`http://localhost:8080\` ou variável de ambiente correspondente e conter as seguintes rotas:

#### A. GET /api/capacidades
- **Objetivo**: Retornar todas as capacidades filtradas opcionalmente por \`cd\`, \`categoria\` ou \`mes\` (YYYY-MM).

#### B. PUT /api/capacidades/:id
- **Objetivo**: Atualizar as capacidades de um registro específico.

#### C. POST /api/metas/inbound
- **Objetivo**: Salvar meta de capacidade Inbound para um mês/semana.
- **JSON esperado**:
\`\`\`json
{
  "ano": 2026,
  "mes": 7,
  "semana": 2,
  "cd": 1965,
  "categoria": "Mercearia",
  "capacidadeInbound": 140000
}
\`\`\`

#### D. POST /api/metas/outbound
- **Objetivo**: Salvar meta de capacidade Outbound para um mês/semana.
- **JSON esperado**:
\`\`\`json
{
  "ano": 2026,
  "mes": 7,
  "semana": 1,
  "cd": 1942,
  "categoria": "Pereciveis",
  "capacidadeFracionada": 195000,
  "capacidadeFechada": 75000
}
\`\`\`

---

### 3. CARGA INICIAL DE DADOS (Payload JSON Atualizado do Sistema)
\`\`\`json
${JSON.stringify(currentData, null, 2)}
\`\`\`

---

Por favor, gere o código completo do backend utilizando a stack de sua escolha.`;

  // 2. Generate database schemas documentation
  const dbSchemaCode = `--- SQL SCHEMA ---
CREATE TABLE capacidades (
    id SERIAL PRIMARY KEY,
    data_movimentacao DATE NOT NULL,
    cd INTEGER NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    capacidade_inbound INTEGER DEFAULT NULL,
    capacidade_outbound_fracionado INTEGER DEFAULT NULL,
    capacidade_outbound_fechado INTEGER DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE metas (
    id SERIAL PRIMARY KEY,
    ano INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    semana INTEGER,
    cd INTEGER NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    fluxo VARCHAR(20) NOT NULL CHECK (fluxo IN ('inbound', 'outbound')),
    capacidade_inbound INTEGER,
    capacidade_fracionada INTEGER,
    capacidade_fechada INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_metas_ano_mes ON metas(ano, mes);
CREATE INDEX idx_metas_cd ON metas(cd);
CREATE INDEX idx_metas_fluxo ON metas(fluxo);`;

  // 3. API endpoints overview
  const apiRoutesCode = `--- ROTAS DA API ---

// GET: Lista de capacidades
GET /api/capacidades

// PUT: Atualiza registro por ID
PUT /api/capacidades/:id

// POST: Salvar meta Inbound
POST /api/metas/inbound
Body: {
  "ano": 2026,
  "mes": 7,
  "semana": 2,
  "cd": 1965,
  "categoria": "Mercearia",
  "capacidadeInbound": 140000
}

// POST: Salvar meta Outbound
POST /api/metas/outbound
Body: {
  "ano": 2026,
  "mes": 7,
  "semana": 1,
  "cd": 1942,
  "categoria": "Pereciveis",
  "capacidadeFracionada": 195000,
  "capacidadeFechada": 75000
}

// GET: Buscar metas por período
GET /api/metas?fluxo=outbound&ano=2026&mes=7`;

  const getCopyContent = () => {
    switch (activeTab) {
      case "ai-prompt":
        return fullAiPrompt;
      case "db-schema":
        return dbSchemaCode;
      case "api-routes":
        return apiRoutesCode;
      case "json-payload":
        const metas = generateMetasJson();
        return metas 
          ? `--- ROTA: ${metaApiRoute} ---\n${JSON.stringify(metas, null, 2)}\n\n--- DADOS COMPLETOS ---\n${JSON.stringify(filteredData, null, 2)}`
          : JSON.stringify(currentData, null, 2);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCopyContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const metas = generateMetasJson();
    if (!metas || !selectedMes) return;
    
    const blob = new Blob([JSON.stringify(metas, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meta_${selectedFluxo}_${selectedMes}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-display font-bold text-white leading-tight">
                Exportar Dados & Guia de Integração
              </h2>
              <p className="text-xs text-slate-400">
                Gere prompts, JSON de metas e estruturas completas para o backend
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filtros de Mês e Fluxo */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedMes}
              onChange={(e) => setSelectedMes(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-blue-500/50 transition-all cursor-pointer"
            >
              <option value="">Todos os meses</option>
              {mesesDisponiveis.map(m => {
                const [y, mon] = m.split("-");
                return (
                  <option key={m} value={m}>
                    {monthNames[mon] || mon} de {y}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setSelectedFluxo("inbound")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                selectedFluxo === "inbound"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Inbound
            </button>
            <button
              onClick={() => setSelectedFluxo("outbound")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                selectedFluxo === "outbound"
                  ? "bg-purple-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Outbound
            </button>
          </div>

          {selectedMes && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-[10px] text-slate-500">
                Rota: <span className="text-emerald-400 font-mono">{metaApiRoute}</span>
              </span>
              <button
                onClick={handleDownloadJson}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 text-xs font-semibold rounded-lg transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar JSON
              </button>
            </div>
          )}
        </div>

        {/* Modal Tabs */}
        <div className="px-6 bg-slate-950/40 border-b border-slate-800/80 flex gap-2 overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab("ai-prompt")}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === "ai-prompt"
                ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Prompt IAs Auxiliares
          </button>
          <button
            onClick={() => setActiveTab("db-schema")}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "db-schema"
                ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Estrutura do Banco SQL
          </button>
          <button
            onClick={() => setActiveTab("api-routes")}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "api-routes"
                ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            Rotas API
          </button>
          <button
            onClick={() => setActiveTab("json-payload")}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "json-payload"
                ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            JSON de Metas
          </button>
        </div>

        {/* Modal Code/Prompt View */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/60 font-mono text-sm leading-relaxed text-slate-300">
          {activeTab === "ai-prompt" && (
            <div className="whitespace-pre-wrap select-text selection:bg-blue-500/30">
              <div className="bg-blue-950/20 border border-blue-900/30 text-blue-400 p-4 rounded-xl mb-4 leading-normal font-sans text-xs">
                💡 <strong>Dica:</strong> Este prompt inclui as novas rotas <code className="bg-blue-900/30 px-1 rounded">API/Metas/Inbound</code> e <code className="bg-blue-900/30 px-1 rounded">API/Metas/Outbound</code>.
              </div>
              {fullAiPrompt}
            </div>
          )}

          {activeTab === "db-schema" && (
            <pre className="whitespace-pre-wrap select-text text-indigo-300">
              {dbSchemaCode}
            </pre>
          )}

          {activeTab === "api-routes" && (
            <pre className="whitespace-pre-wrap select-text text-sky-300">
              {apiRoutesCode}
            </pre>
          )}

          {activeTab === "json-payload" && (
            <div className="space-y-4">
              {selectedMes && (
                <div className="bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 p-3 rounded-lg font-sans text-xs">
                  📋 Rota: <strong>{metaApiRoute}</strong> | Mês: {monthNames[selectedMes.split("-")[1]]} de {selectedMes.split("-")[0]}
                </div>
              )}
              <pre className="whitespace-pre-wrap select-text text-emerald-300 text-xs">
                {selectedMes 
                  ? JSON.stringify(generateMetasJson(), null, 2)
                  : "Selecione um mês acima para gerar o JSON de metas."
                }
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-sans">
            {selectedMes 
              ? `${filteredData.length} registros no período selecionado.`
              : `${currentData.length} registros totais.`
            }
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-all"
            >
              Fechar
            </button>
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-blue-500/15 flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copiar Conteúdo
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}