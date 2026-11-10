import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Check, 
  XCircle, 
  Users, 
  RefreshCw, 
  AlertCircle, 
  Building2, 
  Mail,
  ShieldAlert,
  ArrowLeft,
  Search,
  UserCheck,
  Shield,
  Clock,
  Sliders,
  UserCog,
  ToggleLeft,
  ToggleRight,
  Download
} from "lucide-react";
import { User } from "../types";

interface UserControlPageProps {
  user: User | null;
  theme: "light" | "dark";
  onBack: () => void;
}

interface RegistrationUser {
  id: number;
  login: number | string;
  name: string;
  email: string;
  password?: string;
  status: string;
  role?: string;
}

// ============================================
// 🔥 FUNÇÃO AUXILIAR PARA NORMALIZAR ROLE - CORRIGIDA
// ============================================
const normalizeRole = (role: string | undefined): "ADMIN" | "PPCP" | "GA" => {
  if (!role) return "GA";
  const r = String(role).toUpperCase();
  if (r === "ADM" || r === "ADMIN" || r === "ADMINISTRADOR") return "ADMIN";
  if (r === "PPCP" || r === "PLANEJAMENTO") return "PPCP";
  return "GA";
};

// ============================================
// 🔥 FUNÇÃO PARA CONVERTER ROLE PARA BANCO - CORRIGIDA
// ============================================
const roleToDatabase = (role: "ADMIN" | "PPCP" | "GA"): string => {
  switch(role) {
    case "ADMIN": return "ADMIN";
    case "PPCP": return "PPCP";
    case "GA": return "GA";
    default: return "GA";
  }
};

// ============================================
// 🔥 FUNÇÃO PARA VERIFICAR SE É ADMIN
// ============================================
const isUserAdmin = (user: User | null): boolean => {
  if (!user) return false;
  const role = String(user.role).toUpperCase();
  return role === "ADMIN" || role === "ADM" || role === "ADMINISTRADOR";
};

export default function UserControlPage({ user, theme, onBack }: UserControlPageProps) {
  const [activeTab, setActiveTab] = useState<"pending" | "users">("pending");
  const [pendingUsers, setPendingUsers] = useState<RegistrationUser[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<RegistrationUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Track selected roles for users in dropdowns
  const [selectedRoles, setSelectedRoles] = useState<Record<number, "ADMIN" | "PPCP" | "GA">>({});

  // Fallback Demo Mode state for local preview environments
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return localStorage.getItem("user_control_demo_mode") === "false";
  });

  const initialMockUsers = useMemo<RegistrationUser[]>(() => [
    { id: 101, login: 43210, name: "Carlos Henrique Silva", email: "carlos.silva@empresa.com.br", status: "PENDENTE", role: "GA" },
    { id: 102, login: 98765, name: "Ana Beatriz Santos", email: "ana.santos@empresa.com.br", status: "PENDENTE", role: "PPCP" },
    { id: 103, login: 11223, name: "Diego Oliveira", email: "diego.oliveira@empresa.com.br", status: "PENDENTE", role: "GA" },
    { id: 201, login: 12345, name: "Administrador Geral", email: "admin@empresa.com.br", status: "APROVADO", role: "ADMIN" },
    { id: 202, login: 55443, name: "Juliana Ferreira", email: "juliana.ferreira@empresa.com.br", status: "APROVADO", role: "PPCP" },
    { id: 203, login: 66778, name: "Ricardo Souza", email: "ricardo.souza@empresa.com.br", status: "APROVADO", role: "GA" }
  ], []);

  const loadDemoData = useCallback(() => {
    const storedPending = localStorage.getItem("demo_pending_users");
    const storedApproved = localStorage.getItem("demo_approved_users");
    
    let pendingList: RegistrationUser[] = [];
    let approvedList: RegistrationUser[] = [];

    if (storedPending && storedApproved) {
      try {
        pendingList = JSON.parse(storedPending);
        approvedList = JSON.parse(storedApproved);
      } catch (e) {
        pendingList = initialMockUsers.filter(u => u.status === "PENDENTE");
        approvedList = initialMockUsers.filter(u => u.status === "APROVADO");
      }
    } else {
      pendingList = initialMockUsers.filter(u => u.status === "PENDENTE");
      approvedList = initialMockUsers.filter(u => u.status === "APROVADO");
      localStorage.setItem("demo_pending_users", JSON.stringify(pendingList));
      localStorage.setItem("demo_approved_users", JSON.stringify(approvedList));
    }

    setPendingUsers(pendingList);
    setApprovedUsers(approvedList);

    // Initialize roles state
    const rolesMap: Record<number, "ADMIN" | "PPCP" | "GA"> = {};
    [...pendingList, ...approvedList].forEach((u) => {
      rolesMap[u.id] = normalizeRole(u.role);
    });
    setSelectedRoles(prev => ({ ...prev, ...rolesMap }));
  }, [initialMockUsers]);

  // Toggle demo mode manually if desired
  const handleToggleDemoMode = useCallback(() => {
    const nextVal = !isDemoMode;
    setIsDemoMode(nextVal);
    localStorage.setItem("user_control_demo_mode", String(nextVal));
    setSuccessMsg(`Modo ${nextVal ? "Simulado (Offline)" : "Conexão Real (API)"} ativado.`);
    setTimeout(() => setSuccessMsg(null), 3000);
  }, [isDemoMode]);

  // ============================================
  // 🔥 ENVIA E-MAIL DE NOTIFICAÇÃO - ROTA CORRIGIDA
  // ============================================
  const sendEmailNotification = useCallback(async (
    userData: RegistrationUser | undefined,
    status: "APROVADO" | "RECUSADO" | "PENDENTE",
    role: string
  ) => {
    if (!userData) {
      console.warn("⚠️ Dados do usuário não encontrados para enviar e-mail.");
      return;
    }

    try {
      console.log(`📧 Enviando e-mail para ${userData.email}...`);
      
      const emailEndpoint = "/api/email/notification";
      
      console.log(`📤 POST ${emailEndpoint}`);
      console.log(`📤 Payload:`, {
        to: userData.email,
        name: userData.name,
        login: userData.login,
        status: status,
        role: role
      });
      
      const response = await fetch(emailEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          to: userData.email,
          name: userData.name,
          login: userData.login,
          status: status,
          role: role,
          motivo: status === "RECUSADO" ? "Sua solicitação foi analisada e não foi aprovada. Entre em contato com o administrador." : undefined
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Erro ao enviar e-mail:", errorText);
        throw new Error(`Erro ao enviar e-mail: ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ E-mail enviado com sucesso:", result.messageId);
      return result;
      
    } catch (error) {
      console.error("❌ Falha no envio de e-mail:", error);
      setError(`⚠️ Usuário atualizado, mas houve erro ao enviar e-mail: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return null;
    }
  }, []);

  // ============================================
  // FETCH PENDING USERS - GET /registro (SEM /api/)
  // ============================================
  const fetchPendingUsers = useCallback(async () => {
    if (!user?.token) {
      console.warn("⚠️ Sem token para buscar pendentes");
      return;
    }
    
    setLoading(true);
    setError(null);

    if (isDemoMode) {
      await new Promise(resolve => setTimeout(resolve, 300));
      loadDemoData();
      setLoading(false);
      return;
    }
    
    try {
      console.log("📡 Buscando usuários PENDENTES em /registro...");
      const response = await fetch("/registro", {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${user.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log("📥 Dados recebidos:", data);
      
      if (Array.isArray(data)) {
        const pending = data.filter((item: any) => 
          String(item.status).toUpperCase() === "PENDENTE"
        );
        console.log(`📊 Encontrados ${pending.length} pendentes`);
        setPendingUsers(pending);
        
        const rolesMap: Record<number, "ADMIN" | "PPCP" | "GA"> = {};
        pending.forEach((item: RegistrationUser) => {
          rolesMap[item.id] = normalizeRole(item.role);
        });
        setSelectedRoles(prev => ({ ...prev, ...rolesMap }));
      }
    } catch (err: any) {
      console.error("❌ Erro ao carregar pendentes:", err);
      setIsDemoMode(true);
      localStorage.setItem("user_control_demo_mode", "true");
      loadDemoData();
      setError("⚠️ O servidor local na rede interna (10.210.1.242) está inacessível. O Modo de Demonstração Offline foi ativado automaticamente.");
    } finally {
      setLoading(false);
    }
  }, [user?.token, isDemoMode, loadDemoData]);

  // ============================================
  // FETCH APPROVED USERS - GET /registro/usuarios
  // ============================================
  const fetchApprovedUsers = useCallback(async () => {
    if (!user?.token) {
      console.warn("⚠️ Sem token para buscar aprovados");
      return;
    }
    
    setLoadingUsers(true);
    setError(null);

    if (isDemoMode) {
      await new Promise(resolve => setTimeout(resolve, 300));
      loadDemoData();
      setLoadingUsers(false);
      return;
    }
    
    try {
      console.log("📡 Buscando usuários APROVADOS em /registro/usuarios...");
      const response = await fetch("/registro/usuarios", {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${user.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log("📥 Dados recebidos (aprovados):", data);
      
      if (Array.isArray(data)) {
        setApprovedUsers(data);
        
        const rolesMap: Record<number, "ADMIN" | "PPCP" | "GA"> = {};
        data.forEach((item: RegistrationUser) => {
          rolesMap[item.id] = normalizeRole(item.role);
        });
        setSelectedRoles(prev => ({ ...prev, ...rolesMap }));
      }
    } catch (err: any) {
      console.error("❌ Erro ao carregar aprovados:", err);
    } finally {
      setLoadingUsers(false);
    }
  }, [user?.token, isDemoMode, loadDemoData]);

  const fetchAllData = useCallback(async () => {
    await Promise.all([
      fetchPendingUsers(),
      fetchApprovedUsers()
    ]);
  }, [fetchPendingUsers, fetchApprovedUsers]);

  useEffect(() => {
    if (isUserAdmin(user)) {
      console.log("👑 Usuário admin detectado, carregando dados...");
      fetchAllData();
    } else {
      console.log("👤 Usuário não é admin:", user?.role);
    }
  }, [user, isDemoMode, fetchAllData]);

  // ============================================
  // UPDATE USER STATUS/ROLE - PUT /registro/{id} - CORRIGIDO
  // ============================================
  const handleUpdateUser = useCallback(async (id: number, status: "APROVADO" | "RECUSADO" | "PENDENTE", customRole?: "ADMIN" | "PPCP" | "GA") => {
    if (!user?.token) {
      setError("Usuário não autenticado.");
      return;
    }
    
    setActionLoadingId(id);
    setError(null);
    setSuccessMsg(null);

    // 🔥 CORREÇÃO: Usar a role selecionada ou a padrão
    const role = customRole || selectedRoles[id] || "GA";
    
    // 🔥 CORREÇÃO: Converter para o formato do banco
    const roleForDatabase = roleToDatabase(role);

    // Busca os dados do usuário
    const allUsers = [...pendingUsers, ...approvedUsers];
    const userData = allUsers.find(u => u.id === id);

    console.log(`🔍 Usuário encontrado:`, userData);
    console.log(`📧 Email: ${userData?.email}`);
    console.log(`🎯 Role selecionada: ${role} -> Enviando como: ${roleForDatabase}`);

    if (isDemoMode) {
      await new Promise(resolve => setTimeout(resolve, 400));
      
      let pList: RegistrationUser[] = JSON.parse(localStorage.getItem("demo_pending_users") || "[]");
      let aList: RegistrationUser[] = JSON.parse(localStorage.getItem("demo_approved_users") || "[]");
      
      const target = [...pList, ...aList].find(u => u.id === id);
      
      if (target) {
        // 🔥 CORREÇÃO: Salvar com o formato correto no demo também
        const updatedUser = { ...target, status, role: roleForDatabase };
        
        pList = pList.filter(u => u.id !== id);
        aList = aList.filter(u => u.id !== id);
        
        if (status === "PENDENTE") {
          pList.push(updatedUser);
        } else if (status === "APROVADO") {
          aList.push(updatedUser);
        }
        
        localStorage.setItem("demo_pending_users", JSON.stringify(pList));
        localStorage.setItem("demo_approved_users", JSON.stringify(aList));
      }

      setPendingUsers(pList);
      setApprovedUsers(aList);
      
      if (status === "APROVADO" || status === "RECUSADO") {
        console.log("📧 Enviando e-mail (modo demo)...");
        await sendEmailNotification(userData, status, roleForDatabase);
      }
      
      if (status === "APROVADO") {
        setSuccessMsg(`✅ Usuário aprovado como ${role}. E-mail enviado!`);
      } else if (status === "RECUSADO") {
        setSuccessMsg(`❌ Solicitação recusada. E-mail enviado!`);
      } else {
        setSuccessMsg(`🔄 Usuário retornado para análise.`);
      }
      
      // Atualiza o estado das roles
      setSelectedRoles(prev => ({
        ...prev,
        [id]: role
      }));
      
      setActionLoadingId(null);
      setTimeout(() => setSuccessMsg(null), 3500);
      return;
    }

    try {
      // 1. ATUALIZA O USUÁRIO NO BACKEND COM A ROLE CORRETA
      console.log(`📤 PUT /registro/${id}`, { status, role: roleForDatabase });
      const response = await fetch(`/registro/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${user.token}`
        },
        body: JSON.stringify({ status, role: roleForDatabase })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Erro no backend:", errorData);
        throw new Error(errorData.message || `Erro HTTP ${response.status}`);
      }

      console.log("✅ Usuário atualizado no backend");

      // 2. ENVIA E-MAIL DE NOTIFICAÇÃO
      if (status === "APROVADO" || status === "RECUSADO") {
        console.log("📧 Enviando e-mail de notificação...");
        await sendEmailNotification(userData, status, roleForDatabase);
      }

      if (status === "APROVADO") {
        setSuccessMsg(`✅ Usuário aprovado como ${role}. E-mail enviado!`);
      } else if (status === "RECUSADO") {
        setSuccessMsg(`❌ Usuário recusado. E-mail enviado!`);
      } else {
        setSuccessMsg(`🔄 Usuário retornado para análise.`);
      }

      // Atualiza o estado das roles
      setSelectedRoles(prev => ({
        ...prev,
        [id]: role
      }));

      await fetchAllData();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error("❌ Erro ao salvar alterações:", err);
      setError(err.message || "Erro ao salvar alterações do usuário.");
    } finally {
      setActionLoadingId(null);
    }
  }, [user?.token, isDemoMode, selectedRoles, fetchAllData, pendingUsers, approvedUsers, sendEmailNotification]);

  // ============================================
  // 🔥 GERAÇÃO DE MANUAL TÉCNICO
  // ============================================
  const handleDownloadDocumentation = useCallback(() => {
    const docHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GPA LOGÍSTICA - Manual Técnico & Documentação de Engenharia</title>
  <style>
    :root {
      --primary: #2563eb;
      --primary-dark: #1d4ed8;
      --secondary: #0f172a;
      --text: #334155;
      --light: #f8fafc;
      --border: #e2e8f0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: var(--text);
      line-height: 1.6;
      background-color: var(--light);
      margin: 0;
      padding: 0;
    }
    header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: white;
      padding: 40px 20px;
      text-align: center;
      border-bottom: 4px solid var(--primary);
    }
    header h1 {
      margin: 0;
      font-size: 2.2rem;
      font-weight: 800;
      letter-spacing: -0.025em;
    }
    header p {
      margin: 10px 0 0 0;
      color: #94a3b8;
      font-size: 1.1rem;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      font-size: 0.75rem;
      font-weight: 700;
      border-radius: 4px;
      text-transform: uppercase;
      margin-right: 6px;
    }
    .badge-get { background-color: #e0f2fe; color: #0369a1; }
    .badge-post { background-color: #dcfce7; color: #15803d; }
    .badge-put { background-color: #fef9c3; color: #a16207; }
    .container {
      max-width: 1100px;
      margin: 40px auto;
      padding: 0 20px;
    }
    .card {
      background: white;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.02);
    }
    h2 {
      color: var(--secondary);
      font-size: 1.6rem;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 20px;
      border-bottom: 2px solid var(--border);
      padding-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    h3 {
      color: #1e3a8a;
      font-size: 1.2rem;
      font-weight: 600;
      margin-top: 25px;
      margin-bottom: 12px;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      background-color: #f1f5f9;
      color: #0f172a;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.9em;
    }
    pre {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      background-color: #0f172a;
      color: #e2e8f0;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 0.85rem;
      line-height: 1.5;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 12px;
      text-align: left;
      font-size: 0.9rem;
    }
    th {
      background-color: #f8fafc;
      font-weight: 700;
      color: var(--secondary);
    }
    ul {
      padding-left: 20px;
    }
    li {
      margin-bottom: 8px;
    }
    .footer {
      text-align: center;
      padding: 40px 20px;
      color: #64748b;
      font-size: 0.85rem;
      border-top: 1px solid var(--border);
      margin-top: 60px;
    }
  </style>
</head>
<body>

  <header>
    <h1>Manual Técnico e de Arquitetura de Software</h1>
    <p>Portal Corporativo de Logística GPA — Monitoramento de Metas e Capacidades</p>
  </header>

  <div class="container">

    <div class="card">
      <h2>📌 1. Visão Geral do Sistema</h2>
      <p>O <strong>Portal de Logística GPA</strong> é uma plataforma de alta performance desenvolvida para gerenciar as capacidades de processamento logístico (Inbound e Outbound) nos Centros de Distribuição (CDs) do Grupo. O sistema foi desenhado de forma resiliente, permitindo o planejamento de capacidades mensais e a análise em tempo real dos gargalos operacionais gerados pelo excesso de agendamentos frente às capacidades contratadas.</p>
    </div>

    <div class="card">
      <h2>⚙️ 2. Arquitetura do Front-End (React + TypeScript)</h2>
      <p>A aplicação foi construída sobre padrões modernos de desenvolvimento de software de nível corporativo:</p>
      <ul>
        <li><strong>Tecnologia Base:</strong> React 18, TypeScript, Tailwind CSS e Vite.</li>
        <li><strong>Gerenciamento de Sessão Seguro (Anti-Flickering):</strong> No primeiro acesso da sessão, o sistema força a limpeza do cache de credenciais do usuário e redireciona ao login para garantir que as credenciais mais frescas sejam utilizadas. Durante a navegação comum ou recarregamento (F5), o estado é preservado com restauração baseada em <code>localStorage</code> e <code>sessionStorage</code>.</li>
        <li><strong>Filtros e Visualização em Múltiplos Níveis:</strong> Permite filtrar por CD, Categoria do Fluxo, Mês e Semana do Mês de maneira memoizada com <code>useMemo</code>, reduzindo a sobrecarga de re-renderização no DOM virtual.</li>
        <li><strong>Suporte a Gráficos Complexos:</strong> Alimentado por <code>react-chartjs-2</code> e <code>Chart.js 4</code>, configurado com suporte a interações em múltiplos eixos (Click Drilldown), onde um clique em um elemento do gráfico filtra dinamicamente todos os KPIs e tabelas subsequentes da página.</li>
        <li><strong>Sincronização com Padrão SWR (Stale-While-Revalidate):</strong> Os componentes que dependem de dados remotos carregam instantaneamente os dados armazenados em cache global (in-memory) e, de forma não-bloqueante, efetuam chamadas à API em segundo plano para atualização rápida de tela.</li>
      </ul>
    </div>

    <div class="card">
      <h2>📊 3. Regras de Negócio e Fórmulas Logísticas</h2>
      <p>A inteligência analítica do portal fundamenta-se nos seguintes cálculos de produtividade e capacidade logística:</p>
      
      <h3>Cálculo de Desvio e Sobrecarga (Overload Matrix)</h3>
      <p>Determina se o volume de veículos agendados ultrapassa a capacidade física ou contratada do Centro de Distribuição.</p>
      <pre>Desvio = Agendado - Capacidade
Sobrecarga (%) = Se (Capacidade > 0) então: ((Agendado - Capacidade) / Capacidade) * 100, senão 0</pre>
      <p><strong>Ação no Gráfico:</strong> Se o desvio for positivo (<code>Agendado > Capacidade</code>), a linha do agendamento assume a cor vermelha de alerta (<code>#ef4444</code>) e as legendas indicam sobrecarga com a tag <code>🔴 Excesso!</code>.</p>

      <h3>Cálculo de Produtividade Útil (Média e Máximo Recebidos)</h3>
      <p>Para evitar distorções estatísticas decorrentes de feriados ou ausência de expedição aos finais de semana, os cartões de <strong>Média de Recebidos</strong> e <strong>Máximo Recebidos</strong> filtram e desconsideram sistematicamente sábados e domingos:</p>
      <pre>Dia Útil = Se (Dia_da_Semana é Sábado ou Domingo) então FALSO, senão VERDADEIRO
Média Recebido = Somatório(Recebido [em Dias Úteis]) / Quantidade_Dias_Úteis</pre>

      <h3>Índice de Falta (No-Show Logístico)</h3>
      <p>Mede a taxa de absenteísmo dos fornecedores agendados pelo sistema de agendamento integrado.</p>
      <pre>No-Show (%) = (Quantidade_NoShow / Agendas_no_Sistema) * 100</pre>
    </div>

    <div class="card">
      <h2>🔌 4. Catálogo Completo de APIs Integradas</h2>
      <p>O front-end comunica-se com a retaguarda do sistema através de chamadas HTTP padronizadas com envio obrigatório do token JWT no cabeçalho <code>Authorization: Bearer [token]</code>.</p>
      
      <table>
        <thead>
          <tr>
            <th>Endpoint</th>
            <th>Método</th>
            <th>Autenticação</th>
            <th>Descrição / Retorno</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>/login</code></td>
            <td><span class="badge badge-post">POST</span></td>
            <td>Pública</td>
            <td>Efetua a autenticação do usuário. Retorna o perfil (<code>role</code>: ADM, PPCP ou GA), nome de usuário e token JWT para as chamadas subsequentes.</td>
          </tr>
          <tr>
            <td><code>/registro</code></td>
            <td><span class="badge badge-post">POST</span></td>
            <td>Pública</td>
            <td>Solicitação de primeiro acesso. Cria uma conta com status <code>PENDENTE</code> aguardando homologação do ADM.</td>
          </tr>
          <tr>
            <td><code>/registro</code></td>
            <td><span class="badge badge-get">GET</span></td>
            <td>Requerida (ADM)</td>
            <td>Lista todas as solicitações de usuários com status pendente de homologação.</td>
          </tr>
          <tr>
            <td><code>/registro/usuarios</code></td>
            <td><span class="badge badge-get">GET</span></td>
            <td>Requerida (ADM)</td>
            <td>Lista todos os usuários com perfis e privilégios ativos homologados no portal.</td>
          </tr>
          <tr>
            <td><code>/registro/:id</code></td>
            <td><span class="badge badge-put">PUT</span></td>
            <td>Requerida (ADM)</td>
            <td>Atualiza os privilégios do usuário (<code>role</code>) ou altera seu status de acesso (<code>APROVADO</code> ou <code>RECUSADO</code>).</td>
          </tr>
          <tr>
            <td><code>/api/Metas/Inbound</code></td>
            <td><span class="badge badge-get">GET</span></td>
            <td>Requerida</td>
            <td>Retorna as metas de inbound cadastradas agrupadas pelo mês selecionado.</td>
          </tr>
          <tr>
            <td><code>/api/Metas/Inbound</code></td>
            <td><span class="badge badge-post">POST</span></td>
            <td>Requerida (PPCP)</td>
            <td>Atualiza ou insere as metas de inbound da categoria no mês especificado.</td>
          </tr>
          <tr>
            <td><code>/api/Metas/Outbound</code></td>
            <td><span class="badge badge-get">GET</span></td>
            <td>Requerida</td>
            <td>Retorna as metas de outbound cadastradas agrupadas pelo mês selecionado.</td>
          </tr>
          <tr>
            <td><code>/api/Metas/Outbound</code></td>
            <td><span class="badge badge-post">POST</span></td>
            <td>Requerida (PPCP)</td>
            <td>Atualiza ou insere as metas de outbound no mês especificado.</td>
          </tr>
          <tr>
            <td><code>/api/dashboard/inbound</code></td>
            <td><span class="badge badge-get">GET</span></td>
            <td>Requerida</td>
            <td>Retorna os lançamentos agregados diários com volume programado, capacidade estipulada e realizado recebido.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2>🛡️ 5. Matriz de Permissões (RBAC)</h2>
      <p>As rotas de front-end e recursos visuais são estritamente delimitados pelas regras de perfilamento abaixo:</p>
      <ul>
        <li><strong>ADM (Administrador):</strong> Acesso irrestrito a todas as páginas do sistema, inclusive à tela de Homologação e Controle de Usuários, com poder de veto e alteração de níveis de privilégio.</li>
        <li><strong>PPCP (Planejamento e Controle de Produção):</strong> Visualiza painéis de performance e possui permissão exclusiva de escrita nas telas de planejamento mensal (Inbound/Outbound Metas).</li>
        <li><strong>GA (Garantia de Abastecimento / Operação):</strong> Perfil estritamente operacional e de recepção. Visualiza apenas o painel de capacidades operacionais diárias. É bloqueado automaticamente de acessar o painel de Dashboards Analíticos de alto nível e Controle de Usuários.</li>
      </ul>
    </div>

  </div>

  <div class="footer">
    <p>Manual Técnico Autogerado pelo Portal de Controle de Logística GPA.</p>
    <p>&copy; 2026 GPA Logística. Todos os direitos reservados.</p>
  </div>

</body>
</html>`;

    const blob = new Blob([docHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "GPA_LOGISTICA_MANUAL_TECNICO_ENGENHARIA.html";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setSuccessMsg("📘 Documentação Técnica baixada com sucesso! Abra o arquivo .html em seu navegador.");
    setTimeout(() => setSuccessMsg(null), 4000);
  }, []);

  // Filter computation - Memoized for optimal performance
  const currentTabUsers = useMemo(() => {
    return activeTab === "pending" ? pendingUsers : approvedUsers;
  }, [activeTab, pendingUsers, approvedUsers]);

  const isLoading = useMemo(() => {
    return activeTab === "pending" ? loading : loadingUsers;
  }, [activeTab, loading, loadingUsers]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return currentTabUsers;
    return currentTabUsers.filter(reg => 
      reg.name.toLowerCase().includes(term) ||
      String(reg.login).includes(term) ||
      reg.email.toLowerCase().includes(term)
    );
  }, [currentTabUsers, searchTerm]);

  // Unauthorised view
  if (!isUserAdmin(user)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className={`text-center p-8 rounded-2xl border max-w-md w-full backdrop-blur-sm transition-all ${
          theme === 'dark' ? 'bg-[#0a0f1d] border-red-500/15' : 'bg-white border-red-200'
        }`}>
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className={`text-xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Acesso Restrito</h2>
          <p className="text-slate-500 mt-2 text-xs leading-relaxed">
            Área exclusiva de administradores para homologação e segurança de perfis.
          </p>
          <button
            onClick={onBack}
            className="mt-6 w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
          >
            Voltar para o Painel
          </button>
        </div>
      </div>
    );
  }

  // mesmo padrão visual da tela Capacidades
  const ui = {
    card: "rounded-2xl bg-white/70 dark:bg-slate-900/60 shadow-xs backdrop-blur-md transition-colors",
    ghostBtn: "inline-flex h-9 items-center gap-2 rounded-xl bg-slate-500/10 hover:bg-slate-500/15 text-slate-700 dark:text-slate-200 px-3.5 text-xs font-semibold disabled:opacity-50 cursor-pointer transition-colors",
    th: "px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 select-none",
    td: "px-4 py-3 text-sm text-slate-700 dark:text-slate-200",
    seg: (active: boolean) => `flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
      active
        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
    }`,
  };
  const roleChip = (role: string) =>
    role === "ADMIN"
      ? "bg-violet-500/10 text-violet-700 dark:text-violet-300"
      : role === "PPCP"
      ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-5 text-slate-900 dark:text-slate-100">
      <div className="max-w-[1760px] mx-auto w-full space-y-6">
        {/* CABEÇALHO */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Administração
            </button>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Usuários e acessos</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Aprovação e gerenciamento de perfis de operadores internos.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={handleDownloadDocumentation} className={ui.ghostBtn}>
              <Download className="h-3.5 w-3.5" />
              <span>Manual técnico</span>
            </button>
            <button type="button" onClick={fetchAllData} disabled={loading || loadingUsers} className={ui.ghostBtn}>
              <RefreshCw className={`h-3.5 w-3.5 ${(loading || loadingUsers) ? "animate-spin" : ""}`} />
              <span>Atualizar dados</span>
            </button>
          </div>
        </header>

        {/* CONTAINER PRINCIPAL */}
        <section className={`${ui.card} p-5 sm:p-6 space-y-6`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex p-1 rounded-xl bg-slate-500/10 dark:bg-slate-500/15" role="tablist" aria-label="Situação">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "pending"}
                onClick={() => { setActiveTab("pending"); setSearchTerm(""); }}
                className={ui.seg(activeTab === "pending")}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Pendentes</span>
                <span className="font-mono text-[10px] opacity-70">{pendingUsers.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "users"}
                onClick={() => { setActiveTab("users"); setSearchTerm(""); }}
                className={ui.seg(activeTab === "users")}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Ativos</span>
                <span className="font-mono text-[10px] opacity-70">{approvedUsers.length}</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400 font-mono">
                {filteredUsers.length} registros
              </span>
              <div className="relative w-64 max-w-full">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, ID ou e-mail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl bg-slate-500/5 dark:bg-slate-500/10 hover:bg-slate-500/10 dark:hover:bg-slate-500/15 pl-9 pr-3.5 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 transition-colors border-0"
                />
              </div>
            </div>
          </div>

          {/* AVISOS */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span><strong className="font-semibold">Conectividade:</strong> {error}</span>
            </div>
          )}
          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-xs text-emerald-800 dark:text-emerald-300">
              <Check className="h-4 w-4 shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          {/* TABELA */}
          {isLoading ? (
            <div className="py-20 text-center text-sm text-slate-500 dark:text-slate-400">Sincronizando operadores...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-center">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-500/10 text-slate-400">
                {activeTab === "pending" ? <Clock className="h-5 w-5" /> : <Users className="h-5 w-5" />}
              </div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {searchTerm ? "Nenhum resultado" : activeTab === "pending" ? "Tudo sob controle" : "Nenhum operador ativo"}
              </h3>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {searchTerm
                  ? "Experimente mudar o termo de pesquisa."
                  : activeTab === "pending"
                  ? "Não há solicitações de primeiro acesso pendentes no momento."
                  : "Ainda não existem usuários com perfil ativo."}
              </p>
            </div>
          ) : (
            <div className="max-h-[620px] overflow-auto">
              <table className="w-full min-w-[860px] text-left border-separate border-spacing-y-1">
                <thead className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
                  <tr>
                    <th className={`${ui.th} rounded-l-xl`}>Operador</th>
                    <th className={ui.th}>Registro</th>
                    <th className={ui.th}>E-mail</th>
                    <th className={ui.th}>Perfil atual</th>
                    <th className={ui.th}>Atribuir perfil</th>
                    <th className={`${ui.th} text-right rounded-r-xl`}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((reg) => (
                    <tr key={reg.id} className="bg-slate-500/[0.04] dark:bg-slate-500/[0.07] hover:bg-slate-500/[0.08] dark:hover:bg-slate-500/[0.12] transition-colors">
                      <td className={`${ui.td} rounded-l-xl`}>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-500/15 text-xs font-semibold text-slate-700 dark:text-slate-200">
                            {String(reg.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate max-w-[200px] font-semibold text-slate-900 dark:text-slate-100">{reg.name}</div>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span className={`h-1.5 w-1.5 rounded-full ${activeTab === "pending" ? "bg-amber-500" : "bg-emerald-500"}`} />
                              <span className={`text-[10px] font-semibold uppercase tracking-wider ${activeTab === "pending" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                {reg.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={`${ui.td} font-mono text-xs text-slate-600 dark:text-slate-400`}>{reg.login}</td>
                      <td className={`${ui.td} text-slate-600 dark:text-slate-400`}>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 opacity-50 shrink-0" />
                          <span className="truncate max-w-[220px]" title={reg.email}>{reg.email}</span>
                        </div>
                      </td>
                      <td className={ui.td}>
                        {activeTab === "users" ? (
                          <span className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ${roleChip(normalizeRole(reg.role))}`}>
                            {normalizeRole(reg.role)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className={ui.td}>
                        <select
                          value={selectedRoles[reg.id] || "GA"}
                          onChange={(e) => setSelectedRoles(prev => ({
                            ...prev,
                            [reg.id]: e.target.value as "ADMIN" | "PPCP" | "GA"
                          }))}
                          className="rounded-lg bg-slate-500/10 hover:bg-slate-500/15 px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-100 border-0 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer transition-colors"
                        >
                          <option value="ADMIN" className={theme === "dark" ? "bg-slate-900" : ""}>Administrador</option>
                          <option value="PPCP" className={theme === "dark" ? "bg-slate-900" : ""}>PPCP</option>
                          <option value="GA" className={theme === "dark" ? "bg-slate-900" : ""}>Gestão de agenda</option>
                        </select>
                      </td>
                      <td className={`${ui.td} text-right rounded-r-xl`}>
                        <div className="flex items-center justify-end gap-2">
                          {activeTab === "pending" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdateUser(reg.id, "RECUSADO")}
                                disabled={actionLoadingId !== null}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 px-2.5 text-xs font-semibold text-rose-700 dark:text-rose-400 disabled:opacity-40 cursor-pointer transition-colors"
                                title="Recusar operador"
                              >
                                {actionLoadingId === reg.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                                Recusar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateUser(reg.id, "APROVADO")}
                                disabled={actionLoadingId !== null}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 text-xs font-semibold text-white shadow-xs disabled:opacity-40 cursor-pointer transition-colors"
                                title="Aprovar operador"
                              >
                                {actionLoadingId === reg.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                                Aprovar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdateUser(reg.id, "PENDENTE")}
                                disabled={actionLoadingId !== null}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 disabled:opacity-40 cursor-pointer transition-colors"
                                title="Retornar para pendências"
                              >
                                <RefreshCw className={`h-3.5 w-3.5 ${actionLoadingId === reg.id ? "animate-spin" : ""}`} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateUser(reg.id, "APROVADO", selectedRoles[reg.id])}
                                disabled={actionLoadingId !== null}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 text-xs font-semibold text-white shadow-xs disabled:opacity-40 cursor-pointer transition-colors"
                                title="Atualizar privilégios"
                              >
                                {actionLoadingId === reg.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sliders className="h-3.5 w-3.5" />}
                                Atualizar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Embedded Animations style */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}